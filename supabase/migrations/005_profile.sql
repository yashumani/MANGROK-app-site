-- Private culinary-owner profile fields for Mangrok.
-- Profile rows remain self-readable and self-editable through RLS.
alter table public.profiles
  add column if not exists culinary_role text not null default 'recipe_custodian',
  add column if not exists heritage_notes text not null default '',
  add column if not exists preservation_note text not null default '',
  add column if not exists default_privacy text not null default 'private',
  add column if not exists custodian_name text not null default '';

do $$
begin
  alter table public.profiles
    add constraint profiles_display_name_length check (char_length(display_name) <= 120),
    add constraint profiles_culinary_role_allowed check (
      culinary_role in ('recipe_custodian','family_historian','home_cook','professional_chef','culinary_researcher')
    ),
    add constraint profiles_heritage_notes_length check (char_length(heritage_notes) <= 1000),
    add constraint profiles_preservation_note_length check (char_length(preservation_note) <= 1600),
    add constraint profiles_default_privacy_allowed check (default_privacy in ('private','family','trusted','open')),
    add constraint profiles_custodian_name_length check (char_length(custodian_name) <= 120);
exception when duplicate_object then null;
end $$;

drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles
  for insert to authenticated
  with check(id = auth.uid() and email = public.current_email());

comment on column public.profiles.culinary_role is 'Private role the owner plays in the recipe archive.';
comment on column public.profiles.heritage_notes is 'Private traditions and places represented by the owner archive.';
comment on column public.profiles.preservation_note is 'Private statement of what the owner intends to preserve.';
comment on column public.profiles.default_privacy is 'Default access level suggested for newly created recipes.';
comment on column public.profiles.custodian_name is 'Default custodian credit suggested for newly created recipes.';
