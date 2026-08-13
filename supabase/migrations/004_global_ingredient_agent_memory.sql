create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists unaccent;

create or replace function public.normalize_ingredient_key(value text)
returns text language sql immutable parallel safe as $$
  select trim(regexp_replace(lower(unaccent(coalesce(value,''))), '[^a-z0-9]+', ' ', 'g'));
$$;

create table if not exists public.ingredient_catalog_versions(
  id uuid primary key default gen_random_uuid(), version text not null unique,
  source_manifest jsonb not null default '{}'::jsonb, status text not null default 'staged' check(status in('staged','published','retired')),
  published_at timestamptz, created_at timestamptz not null default now()
);

create table if not exists public.ingredient_catalog(
  id uuid primary key default gen_random_uuid(), canonical_name text not null,
  canonical_key text generated always as(public.normalize_ingredient_key(canonical_name)) stored,
  category text not null default 'Uncategorized', regions text[] not null default '{}', dietary text[] not null default '{}',
  allergens text[] not null default '{}', source_name text not null default 'mangrok-curated', source_id text,
  source_url text, source_license text, notes text not null default '', image_ref text,
  status text not null default 'draft' check(status in('draft','published','retired','rejected')),
  catalog_version text references public.ingredient_catalog_versions(version) on update cascade,
  created_by uuid references auth.users(id) on delete set null, reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(canonical_key)
);
create index if not exists ingredient_catalog_key_trgm on public.ingredient_catalog using gin(canonical_key gin_trgm_ops);
create index if not exists ingredient_catalog_status_category on public.ingredient_catalog(status,category);

create table if not exists public.ingredient_aliases(
  id uuid primary key default gen_random_uuid(), ingredient_id uuid not null references public.ingredient_catalog(id) on delete cascade,
  alias text not null, alias_key text generated always as(public.normalize_ingredient_key(alias)) stored,
  language_code text, region text, script text, source_name text, created_at timestamptz not null default now(),
  unique(ingredient_id,alias_key,coalesce(language_code,''))
);
create index if not exists ingredient_alias_key_trgm on public.ingredient_aliases using gin(alias_key gin_trgm_ops);

create table if not exists public.ingredient_cuisine_links(
  ingredient_id uuid not null references public.ingredient_catalog(id) on delete cascade,
  cuisine text not null, relationship text not null default 'used' check(relationship in('core','common','regional','used','historical')),
  confidence numeric(4,3) not null default .75 check(confidence between 0 and 1), source_name text,
  primary key(ingredient_id,cuisine)
);

create table if not exists public.ingredient_submissions(
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  client_request_id uuid not null, proposed_name text not null,
  canonical_key text generated always as(public.normalize_ingredient_key(proposed_name)) stored,
  category text not null default 'Uncategorized', aliases text[] not null default '{}', cuisines text[] not null default '{}',
  regions text[] not null default '{}', dietary text[] not null default '{}', allergens text[] not null default '{}',
  source_url text, source_license text, notes text not null default '',
  status text not null default 'pending' check(status in('pending','needs-information','approved','rejected','merged','withdrawn')),
  duplicate_of uuid references public.ingredient_catalog(id) on delete set null,
  published_ingredient_id uuid references public.ingredient_catalog(id) on delete set null,
  moderation_note text not null default '', moderated_by uuid references auth.users(id) on delete set null, moderated_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(owner_id,client_request_id)
);
create index if not exists ingredient_submissions_owner_status on public.ingredient_submissions(owner_id,status,updated_at desc);

create table if not exists public.agent_sessions(
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Mangrok session', summary text not null default '', metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists agent_sessions_owner_updated on public.agent_sessions(owner_id,updated_at desc);

create table if not exists public.agent_messages(
  id uuid primary key default gen_random_uuid(), session_id uuid not null references public.agent_sessions(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  role text not null check(role in('system','user','assistant','tool')), content text not null default '', summary text not null default '',
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists agent_messages_session_created on public.agent_messages(session_id,created_at);

create table if not exists public.agent_tool_runs(
  id uuid primary key default gen_random_uuid(), session_id uuid references public.agent_sessions(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade, tool_name text not null,
  arguments jsonb not null default '{}'::jsonb, result_summary jsonb not null default '{}'::jsonb,
  status text not null check(status in('started','completed','failed','cancelled')),
  duration_ms integer, created_at timestamptz not null default now()
);

create table if not exists public.agent_memories(
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  scope text not null check(scope in('preference','ingredient','technique','equipment','dietary','cuisine','session-summary','correction')),
  memory_key text not null, content text not null, confidence numeric(4,3) not null default .8 check(confidence between 0 and 1),
  source text not null default 'user-confirmed', expires_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(owner_id,scope,memory_key)
);
create index if not exists agent_memories_owner_scope on public.agent_memories(owner_id,scope,updated_at desc);
create index if not exists agent_memories_content_trgm on public.agent_memories using gin(content gin_trgm_ops);

alter table public.ingredient_catalog_versions enable row level security;
alter table public.ingredient_catalog enable row level security;
alter table public.ingredient_aliases enable row level security;
alter table public.ingredient_cuisine_links enable row level security;
alter table public.ingredient_submissions enable row level security;
alter table public.agent_sessions enable row level security;
alter table public.agent_messages enable row level security;
alter table public.agent_tool_runs enable row level security;
alter table public.agent_memories enable row level security;

create policy ingredient_catalog_read_published on public.ingredient_catalog for select using(status='published');
create policy ingredient_aliases_read_published on public.ingredient_aliases for select using(exists(select 1 from public.ingredient_catalog c where c.id=ingredient_id and c.status='published'));
create policy ingredient_cuisine_read_published on public.ingredient_cuisine_links for select using(exists(select 1 from public.ingredient_catalog c where c.id=ingredient_id and c.status='published'));
create policy ingredient_versions_read_published on public.ingredient_catalog_versions for select using(status='published');
create policy ingredient_submissions_owner_select on public.ingredient_submissions for select to authenticated using(owner_id=auth.uid());
create policy ingredient_submissions_owner_insert on public.ingredient_submissions for insert to authenticated with check(owner_id=auth.uid() and status='pending');
create policy ingredient_submissions_owner_withdraw on public.ingredient_submissions for update to authenticated using(owner_id=auth.uid() and status in('pending','needs-information')) with check(owner_id=auth.uid() and status='withdrawn');
create policy agent_sessions_owner_all on public.agent_sessions for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy agent_messages_owner_all on public.agent_messages for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy agent_tool_runs_owner_all on public.agent_tool_runs for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy agent_memories_owner_all on public.agent_memories for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());

create or replace function public.search_ingredient_catalog(p_query text default '', p_cuisine text default null, p_category text default null, p_limit integer default 50)
returns table(id uuid, canonical_name text, category text, aliases text[], cuisines text[], regions text[], dietary text[], allergens text[], source_name text, source_id text, source_license text)
language sql stable security invoker set search_path=public as $$
  select c.id,c.canonical_name,c.category,
    coalesce((select array_agg(a.alias order by a.alias) from public.ingredient_aliases a where a.ingredient_id=c.id),'{}'),
    coalesce((select array_agg(l.cuisine order by l.cuisine) from public.ingredient_cuisine_links l where l.ingredient_id=c.id),'{}'),
    c.regions,c.dietary,c.allergens,c.source_name,c.source_id,c.source_license
  from public.ingredient_catalog c
  where c.status='published'
    and (coalesce(p_category,'')='' or c.category=p_category)
    and (coalesce(p_cuisine,'')='' or exists(select 1 from public.ingredient_cuisine_links l where l.ingredient_id=c.id and lower(l.cuisine)=lower(p_cuisine)))
    and (coalesce(p_query,'')='' or c.canonical_key % public.normalize_ingredient_key(p_query)
      or exists(select 1 from public.ingredient_aliases a where a.ingredient_id=c.id and a.alias_key % public.normalize_ingredient_key(p_query)))
  order by greatest(similarity(c.canonical_key,public.normalize_ingredient_key(p_query)),coalesce((select max(similarity(a.alias_key,public.normalize_ingredient_key(p_query))) from public.ingredient_aliases a where a.ingredient_id=c.id),0)) desc,c.canonical_name
  limit greatest(1,least(coalesce(p_limit,50),200));
$$;

grant execute on function public.search_ingredient_catalog(text,text,text,integer) to anon,authenticated;

create or replace function public.submit_ingredient_proposal(p_client_request_id uuid,p_name text,p_category text default 'Uncategorized',p_aliases text[] default '{}',p_cuisines text[] default '{}',p_regions text[] default '{}',p_dietary text[] default '{}',p_allergens text[] default '{}',p_source_url text default null,p_source_license text default null,p_notes text default '')
returns public.ingredient_submissions language plpgsql security definer set search_path=public as $$
declare result public.ingredient_submissions;begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if length(trim(coalesce(p_name,'')))<2 then raise exception 'ingredient name required'; end if;
  insert into public.ingredient_submissions(owner_id,client_request_id,proposed_name,category,aliases,cuisines,regions,dietary,allergens,source_url,source_license,notes)
  values(auth.uid(),p_client_request_id,left(trim(p_name),120),left(coalesce(p_category,'Uncategorized'),80),coalesce(p_aliases,'{}'),coalesce(p_cuisines,'{}'),coalesce(p_regions,'{}'),coalesce(p_dietary,'{}'),coalesce(p_allergens,'{}'),left(p_source_url,500),left(p_source_license,120),left(coalesce(p_notes,''),1200))
  on conflict(owner_id,client_request_id) do update set updated_at=now()
  returning * into result;return result;
end;$$;
revoke all on function public.submit_ingredient_proposal(uuid,text,text,text[],text[],text[],text[],text[],text,text,text) from public;
grant execute on function public.submit_ingredient_proposal(uuid,text,text,text[],text[],text[],text[],text[],text,text,text) to authenticated;

create or replace function public.upsert_agent_memory(p_scope text,p_key text,p_content text,p_confidence numeric default .8,p_source text default 'user-confirmed')
returns public.agent_memories language plpgsql security definer set search_path=public as $$
declare result public.agent_memories;begin
 if auth.uid() is null then raise exception 'authentication required';end if;
 if p_scope not in('preference','ingredient','technique','equipment','dietary','cuisine','session-summary','correction') then raise exception 'invalid scope';end if;
 if length(p_content)>1600 or p_content~*'(passphrase|password|service.?role|api.?key|sealed note|decryption key|private key)' then raise exception 'unsafe memory content';end if;
 insert into public.agent_memories(owner_id,scope,memory_key,content,confidence,source)
 values(auth.uid(),p_scope,left(p_key,120),left(p_content,1600),greatest(0,least(coalesce(p_confidence,.8),1)),left(coalesce(p_source,'user-confirmed'),80))
 on conflict(owner_id,scope,memory_key) do update set content=excluded.content,confidence=excluded.confidence,source=excluded.source,updated_at=now()
 returning * into result;return result;end;$$;
revoke all on function public.upsert_agent_memory(text,text,text,numeric,text) from public;
grant execute on function public.upsert_agent_memory(text,text,text,numeric,text) to authenticated;

create or replace function public.search_agent_memory(p_query text,p_scopes text[] default null,p_limit integer default 8)
returns setof public.agent_memories language sql stable security invoker set search_path=public as $$
 select * from public.agent_memories m where m.owner_id=auth.uid() and (m.expires_at is null or m.expires_at>now()) and (p_scopes is null or m.scope=any(p_scopes))
 order by case when coalesce(p_query,'')='' then 0 else similarity(lower(m.content||' '||m.memory_key),lower(p_query)) end desc,m.updated_at desc
 limit greatest(1,least(coalesce(p_limit,8),30));$$;
grant execute on function public.search_agent_memory(text,text[],integer) to authenticated;

create or replace function public.review_ingredient_submission(p_submission_id uuid,p_decision text,p_note text default '',p_published_ingredient_id uuid default null)
returns public.ingredient_submissions language plpgsql security definer set search_path=public as $$
declare result public.ingredient_submissions;begin
 if current_setting('request.jwt.claim.role',true) <> 'service_role' then raise exception 'service role required';end if;
 if p_decision not in('needs-information','approved','rejected','merged') then raise exception 'invalid decision';end if;
 update public.ingredient_submissions set status=p_decision,moderation_note=left(coalesce(p_note,''),1200),published_ingredient_id=p_published_ingredient_id,moderated_at=now(),updated_at=now() where id=p_submission_id returning * into result;
 if result.id is null then raise exception 'submission not found';end if;return result;end;$$;
revoke all on function public.review_ingredient_submission(uuid,text,text,uuid) from public;
grant execute on function public.review_ingredient_submission(uuid,text,text,uuid) to service_role;
