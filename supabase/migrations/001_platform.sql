-- Mangrok platform schema for Supabase/Postgres.
-- Apply in a new project, then run the two-user acceptance suite in docs/ACCEPTANCE-TESTS.md.
create extension if not exists pgcrypto;
create extension if not exists citext;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext not null,
  display_name text not null default '',
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  summary text not null default '' check (char_length(summary) <= 1200),
  ingredients jsonb not null default '[]'::jsonb check (jsonb_typeof(ingredients) = 'array'),
  steps jsonb not null default '[]'::jsonb check (jsonb_typeof(steps) = 'array'),
  tags jsonb not null default '[]'::jsonb check (jsonb_typeof(tags) = 'array'),
  privacy text not null default 'private' check (privacy in ('private','family','trusted','open')),
  favorite boolean not null default false,
  servings text not null default '',
  prep_minutes integer check (prep_minutes is null or prep_minutes >= 0),
  cook_minutes integer check (cook_minutes is null or cook_minutes >= 0),
  origin jsonb not null default '{}'::jsonb,
  secret_ciphertext text,
  secret_iv text,
  secret_salt text,
  secret_iterations integer,
  secret_version integer,
  secret_hint text not null default '' check (char_length(secret_hint) <= 240),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint complete_secret_payload check (
    (secret_ciphertext is null and secret_iv is null and secret_salt is null)
    or (secret_ciphertext is not null and secret_iv is not null and secret_salt is not null and secret_iterations >= 100000)
  )
);
create index if not exists recipes_owner_updated_idx on public.recipes(owner_id, updated_at desc);
create index if not exists recipes_privacy_idx on public.recipes(privacy);

create table if not exists public.circles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.circle_members (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email citext not null,
  role text not null default 'viewer' check (role in ('viewer','contributor','custodian')),
  secret_access boolean not null default false,
  created_at timestamptz not null default now(),
  unique(circle_id,email)
);
create index if not exists circle_members_user_idx on public.circle_members(user_id);
create index if not exists circle_members_email_idx on public.circle_members(email);

create table if not exists public.recipe_grants (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  granted_by uuid not null references auth.users(id) on delete cascade,
  grantee_user_id uuid references auth.users(id) on delete cascade,
  grantee_email citext,
  circle_id uuid references public.circles(id) on delete cascade,
  role text not null default 'viewer' check (role in ('viewer','contributor','custodian')),
  secret_access boolean not null default false,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (grantee_user_id is not null or grantee_email is not null or circle_id is not null)
);
create index if not exists recipe_grants_recipe_idx on public.recipe_grants(recipe_id);
create index if not exists recipe_grants_user_idx on public.recipe_grants(grantee_user_id);
create index if not exists recipe_grants_email_idx on public.recipe_grants(grantee_email);

create table if not exists public.recipe_versions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  revision integer not null,
  snapshot jsonb not null,
  note text not null default 'Saved version',
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists recipe_versions_recipe_idx on public.recipe_versions(recipe_id, created_at desc);

create table if not exists public.recipe_assets (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  path text not null unique,
  name text not null,
  kind text not null check (kind in ('photo','card','audio','video','document')),
  media_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  dedication text not null default '' check (char_length(dedication) <= 4000),
  theme text not null default 'heritage' check (theme in ('heritage','botanical','modern')),
  recipe_ids uuid[] not null default '{}',
  include_secrets boolean not null default false,
  secret_approval_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not include_secrets or secret_approval_at is not null)
);
create table if not exists public.print_orders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete restrict,
  request_id uuid not null,
  status text not null default 'received' check (status in ('received','provider_not_configured','proof_required','submitted','printing','shipped','cancelled','failed')),
  provider text,
  provider_order_id text,
  proof_path text,
  shipping_reference text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, request_id)
);

create table if not exists public.legacy_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  recipe_ids uuid[] not null default '{}',
  primary_recipient_email citext not null,
  backup_recipient_email citext,
  release_after date,
  inactivity_months integer check (inactivity_months is null or inactivity_months between 6 and 120),
  sealed_message text not null default '' check (char_length(sealed_message) <= 8000),
  status text not null default 'active' check (status in ('active','review_pending','cancelled','completed')),
  human_review_required boolean not null default true check (human_review_required = true),
  review_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'info',
  message text not null check (char_length(message) <= 1000),
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  token_hash bytea not null unique,
  secret_payload jsonb,
  expires_at timestamptz,
  max_views integer check (max_views is null or max_views between 1 and 10000),
  view_count integer not null default 0,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists share_links_owner_idx on public.share_links(owner_id, created_at desc);

create table if not exists public.account_deletion_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  execute_after timestamptz not null default now() + interval '14 days',
  cancelled_at timestamptz,
  executed_at timestamptz
);

-- Identity and membership helpers.
create or replace function public.current_email() returns citext language sql stable security definer set search_path=public as $$
  select nullif(auth.jwt() ->> 'email','')::citext
$$;
create or replace function public.user_in_circle(p_circle uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from circle_members m where m.circle_id=p_circle and (m.user_id=auth.uid() or m.email=current_email()))
$$;
create or replace function public.active_grant(p_recipe uuid, p_roles text[] default array['viewer','contributor','custodian'])
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from recipe_grants g where g.recipe_id=p_recipe and g.revoked_at is null and (g.expires_at is null or g.expires_at > now())
    and g.role=any(p_roles) and (
      g.grantee_user_id=auth.uid() or g.grantee_email=current_email() or (g.circle_id is not null and user_in_circle(g.circle_id))
    )
  )
$$;
create or replace function public.can_read_recipe(p_recipe uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from recipes r where r.id=p_recipe and (r.owner_id=auth.uid() or r.privacy='open' or active_grant(r.id)))
$$;
create or replace function public.can_edit_recipe(p_recipe uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from recipes r where r.id=p_recipe and (r.owner_id=auth.uid() or active_grant(r.id,array['contributor','custodian'])))
$$;

-- Link pending invitations to an account whenever a user signs up or signs in.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into profiles(id,email,display_name) values(new.id,new.email,coalesce(new.raw_user_meta_data->>'name',''))
  on conflict(id) do update set email=excluded.email,updated_at=now();
  update circle_members set user_id=new.id where email=new.email and user_id is null;
  update recipe_grants set grantee_user_id=new.id where grantee_email=new.email and grantee_user_id is null;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of email on auth.users for each row execute function public.handle_new_user();

-- Version every update/delete and prevent contributors from changing security-sensitive fields.
create or replace function public.guard_and_version_recipe() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='DELETE' then
    insert into recipe_versions(recipe_id,owner_id,revision,snapshot,note,actor_id) values(old.id,old.owner_id,old.revision,to_jsonb(old),'Deleted recipe',auth.uid());
    return old;
  end if;
  insert into recipe_versions(recipe_id,owner_id,revision,snapshot,note,actor_id) values(old.id,old.owner_id,old.revision,to_jsonb(old),'Saved revision',auth.uid());
  if auth.role() <> 'service_role' and auth.uid() is distinct from old.owner_id then
    if new.owner_id is distinct from old.owner_id or new.privacy is distinct from old.privacy
      or new.secret_ciphertext is distinct from old.secret_ciphertext or new.secret_iv is distinct from old.secret_iv
      or new.secret_salt is distinct from old.secret_salt or new.secret_iterations is distinct from old.secret_iterations
      or new.secret_version is distinct from old.secret_version or new.secret_hint is distinct from old.secret_hint then
      raise exception 'Contributors cannot change ownership, privacy, or sealed-note fields';
    end if;
  end if;
  new.revision=old.revision+1; new.updated_at=now(); return new;
end $$;
drop trigger if exists recipes_guard_version on public.recipes;
create trigger recipes_guard_version before update or delete on public.recipes for each row execute function public.guard_and_version_recipe();

create or replace function public.restore_recipe_version(version_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare v recipe_versions; snap jsonb;
begin
  select * into v from recipe_versions where id=version_id;
  if v.id is null then raise exception 'Version not found'; end if;
  if not exists(select 1 from recipes where id=v.recipe_id and owner_id=auth.uid()) then raise exception 'Only the owner may restore a full snapshot'; end if;
  snap=v.snapshot;
  update recipes set title=snap->>'title',summary=coalesce(snap->>'summary',''),ingredients=coalesce(snap->'ingredients','[]'),steps=coalesce(snap->'steps','[]'),
    tags=coalesce(snap->'tags','[]'),privacy=coalesce(snap->>'privacy','private'),favorite=coalesce((snap->>'favorite')::boolean,false),
    servings=coalesce(snap->>'servings',''),prep_minutes=(snap->>'prep_minutes')::integer,cook_minutes=(snap->>'cook_minutes')::integer,
    origin=coalesce(snap->'origin','{}'),secret_ciphertext=snap->>'secret_ciphertext',secret_iv=snap->>'secret_iv',secret_salt=snap->>'secret_salt',
    secret_iterations=(snap->>'secret_iterations')::integer,secret_version=(snap->>'secret_version')::integer,secret_hint=coalesce(snap->>'secret_hint','')
  where id=v.recipe_id;
  return v.recipe_id;
end $$;

create or replace function public.create_recipe_share_link(p_recipe_id uuid,p_expires_at timestamptz default null,p_max_views integer default null,p_secret_payload jsonb default null)
returns text language plpgsql security definer set search_path=public as $$
declare token text;
begin
  if not exists(select 1 from recipes where id=p_recipe_id and owner_id=auth.uid()) then raise exception 'Only the owner can create a share link'; end if;
  token=rtrim(translate(encode(gen_random_bytes(32),'base64'),'+/','-_'),'=');
  insert into share_links(recipe_id,owner_id,token_hash,secret_payload,expires_at,max_views) values(p_recipe_id,auth.uid(),digest(token,'sha256'),p_secret_payload,p_expires_at,p_max_views);
  return token;
end $$;
create or replace function public.get_shared_recipe(p_token text) returns jsonb language plpgsql security definer set search_path=public as $$
declare link share_links; r recipes; result jsonb;
begin
  select * into link from share_links where token_hash=digest(p_token,'sha256') for update;
  if link.id is null or link.revoked_at is not null or (link.expires_at is not null and link.expires_at<=now()) or (link.max_views is not null and link.view_count>=link.max_views) then
    raise exception 'Share link not found or no longer active';
  end if;
  select * into r from recipes where id=link.recipe_id;
  update share_links set view_count=view_count+1 where id=link.id;
  result=jsonb_build_object('recipe',jsonb_build_object('id','recipe_'||r.id,'title',r.title,'summary',r.summary,'ingredients',r.ingredients,'steps',r.steps,'tags',r.tags,
    'privacy',r.privacy,'servings',r.servings,'prepMinutes',r.prep_minutes,'cookMinutes',r.cook_minutes,'origin',r.origin,'secretHint',r.secret_hint,'revision',r.revision,
    'createdAt',r.created_at,'updatedAt',r.updated_at),'secret_payload',link.secret_payload);
  return result;
end $$;
revoke all on function public.create_recipe_share_link(uuid,timestamptz,integer,jsonb) from public;
grant execute on function public.create_recipe_share_link(uuid,timestamptz,integer,jsonb) to authenticated;
grant execute on function public.get_shared_recipe(text) to anon,authenticated;

create or replace function public.request_account_deletion() returns timestamptz language plpgsql security definer set search_path=public as $$
declare due timestamptz:=now()+interval '14 days';
begin
  insert into account_deletion_requests(user_id,execute_after) values(auth.uid(),due)
    on conflict(user_id) do update set requested_at=now(),execute_after=excluded.execute_after,cancelled_at=null,executed_at=null;
  update profiles set deletion_requested_at=now() where id=auth.uid();
  insert into notifications(user_id,kind,message) values(auth.uid(),'account','Account deletion requested. The cooling-off period ends '||due::text);
  return due;
end $$;

-- Notification for every new grant.
create or replace function public.notify_recipe_grant() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.grantee_user_id is not null then insert into notifications(user_id,kind,message,data) values(new.grantee_user_id,'share','A recipe was shared with you',jsonb_build_object('recipeId',new.recipe_id,'grantId',new.id)); end if;
  return new;
end $$;
drop trigger if exists recipe_grant_notice on public.recipe_grants;
create trigger recipe_grant_notice after insert on public.recipe_grants for each row execute function public.notify_recipe_grant();

-- Updated timestamps.
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger circles_touch before update on public.circles for each row execute function public.touch_updated_at();
create trigger books_touch before update on public.books for each row execute function public.touch_updated_at();
create trigger print_orders_touch before update on public.print_orders for each row execute function public.touch_updated_at();
create trigger legacy_touch before update on public.legacy_plans for each row execute function public.touch_updated_at();

-- Row-level security. Service-role clients bypass these policies and must exist only in server functions.
alter table public.profiles enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_versions enable row level security;
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.recipe_grants enable row level security;
alter table public.recipe_assets enable row level security;
alter table public.books enable row level security;
alter table public.print_orders enable row level security;
alter table public.legacy_plans enable row level security;
alter table public.notifications enable row level security;
alter table public.share_links enable row level security;
alter table public.account_deletion_requests enable row level security;

create policy profiles_self_select on public.profiles for select using(id=auth.uid());
create policy profiles_self_update on public.profiles for update using(id=auth.uid()) with check(id=auth.uid());
create policy recipes_select on public.recipes for select using(can_read_recipe(id));
create policy recipes_insert on public.recipes for insert with check(owner_id=auth.uid());
create policy recipes_update on public.recipes for update using(can_edit_recipe(id)) with check(can_edit_recipe(id));
create policy recipes_delete on public.recipes for delete using(owner_id=auth.uid());
create policy versions_select on public.recipe_versions for select using(can_read_recipe(recipe_id));
create policy circles_select on public.circles for select using(owner_id=auth.uid() or user_in_circle(id));
create policy circles_insert on public.circles for insert with check(owner_id=auth.uid());
create policy circles_update on public.circles for update using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy circles_delete on public.circles for delete using(owner_id=auth.uid());
create policy members_select on public.circle_members for select using(user_in_circle(circle_id) or exists(select 1 from circles c where c.id=circle_id and c.owner_id=auth.uid()));
create policy members_insert on public.circle_members for insert with check(exists(select 1 from circles c where c.id=circle_id and c.owner_id=auth.uid()));
create policy members_update on public.circle_members for update using(exists(select 1 from circles c where c.id=circle_id and c.owner_id=auth.uid())) with check(exists(select 1 from circles c where c.id=circle_id and c.owner_id=auth.uid()));
create policy members_delete on public.circle_members for delete using(exists(select 1 from circles c where c.id=circle_id and c.owner_id=auth.uid()));
create policy grants_select on public.recipe_grants for select using(exists(select 1 from recipes r where r.id=recipe_id and r.owner_id=auth.uid()) or grantee_user_id=auth.uid() or grantee_email=current_email() or (circle_id is not null and user_in_circle(circle_id)));
create policy grants_insert on public.recipe_grants for insert with check(granted_by=auth.uid() and exists(select 1 from recipes r where r.id=recipe_id and r.owner_id=auth.uid()));
create policy grants_update on public.recipe_grants for update using(exists(select 1 from recipes r where r.id=recipe_id and r.owner_id=auth.uid())) with check(exists(select 1 from recipes r where r.id=recipe_id and r.owner_id=auth.uid()));
create policy grants_delete on public.recipe_grants for delete using(exists(select 1 from recipes r where r.id=recipe_id and r.owner_id=auth.uid()));
create policy assets_select on public.recipe_assets for select using(can_read_recipe(recipe_id));
create policy assets_insert on public.recipe_assets for insert with check(owner_id=auth.uid() and exists(select 1 from recipes r where r.id=recipe_id and r.owner_id=auth.uid()));
create policy assets_delete on public.recipe_assets for delete using(owner_id=auth.uid());
create policy books_owner_all on public.books for all using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy orders_owner_select on public.print_orders for select using(owner_id=auth.uid());
create policy legacy_owner_all on public.legacy_plans for all using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy notices_self_select on public.notifications for select using(user_id=auth.uid());
create policy notices_self_update on public.notifications for update using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy links_owner_select on public.share_links for select using(owner_id=auth.uid());
create policy links_owner_update on public.share_links for update using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy deletion_self_select on public.account_deletion_requests for select using(user_id=auth.uid());

-- Private Storage bucket. Object path must begin with the owner UUID.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('recipe-assets','recipe-assets',false,26214400,array['image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4','video/mp4','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy recipe_assets_storage_insert on storage.objects for insert to authenticated
with check(bucket_id='recipe-assets' and (storage.foldername(name))[1]=auth.uid()::text);
create policy recipe_assets_storage_select on storage.objects for select to authenticated using(
  bucket_id='recipe-assets' and exists(select 1 from public.recipe_assets a where a.path=name and public.can_read_recipe(a.recipe_id))
);
create policy recipe_assets_storage_delete on storage.objects for delete to authenticated using(
  bucket_id='recipe-assets' and (storage.foldername(name))[1]=auth.uid()::text
);

-- Least-privilege grants. RLS still governs every authenticated query.
grant usage on schema public to anon,authenticated;
grant select,insert,update,delete on public.profiles,public.recipes,public.circles,public.circle_members,public.recipe_grants,public.recipe_assets,public.books,public.legacy_plans,public.notifications,public.share_links to authenticated;
grant select on public.recipe_versions,public.print_orders,public.account_deletion_requests to authenticated;
grant execute on function public.restore_recipe_version(uuid),public.request_account_deletion() to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('print-proofs','print-proofs',false,104857600,array['application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy print_proofs_insert on storage.objects for insert to authenticated
with check(bucket_id='print-proofs' and (storage.foldername(name))[1]=auth.uid()::text);
create policy print_proofs_select on storage.objects for select to authenticated
using(bucket_id='print-proofs' and (storage.foldername(name))[1]=auth.uid()::text);
create policy print_proofs_delete on storage.objects for delete to authenticated
using(bucket_id='print-proofs' and (storage.foldername(name))[1]=auth.uid()::text);
