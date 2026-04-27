create or replace function public.fieldnote_project_member_role(project_id uuid, user_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select members.role
  from public.fieldnote_project_members members
  where members.project_id = fieldnote_project_member_role.project_id
    and members.user_id = fieldnote_project_member_role.user_id
  limit 1
$$;

create or replace function public.fieldnote_project_owner_id(project_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select projects.owner_id
  from public.fieldnote_projects projects
  where projects.id = fieldnote_project_owner_id.project_id
  limit 1
$$;

grant execute on function public.fieldnote_project_member_role(uuid, uuid) to authenticated;
grant execute on function public.fieldnote_project_owner_id(uuid) to authenticated;

drop policy if exists "Owners and members can read projects" on public.fieldnote_projects;
drop policy if exists "Owners and editors can update projects" on public.fieldnote_projects;
drop policy if exists "Owners can manage project members" on public.fieldnote_project_members;

create policy "Owners and members can read projects"
on public.fieldnote_projects
for select
to authenticated
using (
  owner_id = auth.uid()
  or public.fieldnote_project_member_role(id, auth.uid()) is not null
);

create policy "Owners and editors can update projects"
on public.fieldnote_projects
for update
to authenticated
using (
  owner_id = auth.uid()
  or public.fieldnote_project_member_role(id, auth.uid()) = 'editor'
)
with check (
  owner_id = auth.uid()
  or public.fieldnote_project_member_role(id, auth.uid()) = 'editor'
);

create policy "Owners can manage project members"
on public.fieldnote_project_members
for all
to authenticated
using (public.fieldnote_project_owner_id(project_id) = auth.uid())
with check (public.fieldnote_project_owner_id(project_id) = auth.uid());
