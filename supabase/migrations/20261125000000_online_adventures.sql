create schema if not exists kaosz_private;
revoke all on schema kaosz_private from public;
grant usage on schema kaosz_private to authenticated;

create table public.kaosz_rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  created_at timestamptz not null default now()
);
create table public.kaosz_members (
  room_id uuid not null references public.kaosz_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  character_name text not null default '' check (char_length(character_name) <= 100),
  character_race text not null default '' check (char_length(character_race) <= 40),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create table kaosz_private.invites (
  room_id uuid primary key references public.kaosz_rooms(id) on delete cascade,
  code uuid unique not null default gen_random_uuid()
);
create table public.kaosz_scene (
  room_id uuid primary key references public.kaosz_rooms(id) on delete cascade,
  scene text not null default '' check (char_length(scene) <= 4000),
  segment integer check (segment >= 0),
  version integer not null default 0 check (version >= 0)
);
create table public.kaosz_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null,
  sender_id uuid not null default auth.uid(),
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  sent_at timestamptz not null default now(),
  foreign key (room_id, sender_id) references public.kaosz_members(room_id, user_id) on delete cascade
);
create index kaosz_members_user on public.kaosz_members(user_id);
create index kaosz_messages_room_time on public.kaosz_messages(room_id, sent_at desc, id);

alter table public.kaosz_rooms enable row level security;
alter table public.kaosz_members enable row level security;
alter table public.kaosz_scene enable row level security;
alter table public.kaosz_messages enable row level security;
alter table kaosz_private.invites enable row level security;

create function kaosz_private.is_member(in_room uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (
  select 1 from public.kaosz_members where room_id = in_room and user_id = auth.uid()
) $$;
revoke all on function kaosz_private.is_member(uuid) from public;
grant execute on function kaosz_private.is_member(uuid) to authenticated;

create policy room_members_read on public.kaosz_rooms for select to authenticated using (kaosz_private.is_member(id));
create policy members_read on public.kaosz_members for select to authenticated using (kaosz_private.is_member(room_id));
create policy scene_read on public.kaosz_scene for select to authenticated using (kaosz_private.is_member(room_id));
create policy messages_read on public.kaosz_messages for select to authenticated using (kaosz_private.is_member(room_id));
create policy own_member_update on public.kaosz_members for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_messages_insert on public.kaosz_messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and kaosz_private.is_member(room_id));

revoke all on public.kaosz_rooms, public.kaosz_members, public.kaosz_scene, public.kaosz_messages from public, anon, authenticated;
grant select on public.kaosz_rooms, public.kaosz_members, public.kaosz_scene, public.kaosz_messages to authenticated;
grant update (character_name, character_race) on public.kaosz_members to authenticated;
grant insert (room_id, body) on public.kaosz_messages to authenticated;

create function public.kaosz_create_room(room_title text, nickname text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare actor uuid := auth.uid(); room uuid;
begin
  if actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  insert into public.kaosz_rooms(host_id, title) values (actor, btrim(room_title)) returning id into room;
  insert into public.kaosz_members(room_id, user_id, display_name) values (room, actor, btrim(nickname));
  insert into kaosz_private.invites(room_id) values (room);
  insert into public.kaosz_scene(room_id) values (room);
  return room;
end $$;

create function public.kaosz_join_room(invite_code uuid, nickname text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare actor uuid := auth.uid(); room uuid;
begin
  if actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select room_id into room from kaosz_private.invites where code = invite_code for share;
  if room is null then raise exception 'Invalid invite' using errcode = '22023'; end if;
  insert into public.kaosz_members(room_id, user_id, display_name) values (room, actor, btrim(nickname))
    on conflict (room_id, user_id) do nothing;
  return room;
end $$;

create function public.kaosz_room_invite(room uuid, rotate boolean default false) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare result uuid;
begin
  if not exists(select 1 from public.kaosz_rooms where id = room and host_id = auth.uid()) then
    raise exception 'Host permission required' using errcode = '42501';
  end if;
  if rotate then
    update kaosz_private.invites set code = gen_random_uuid() where room_id = room returning code into result;
  else
    select code into result from kaosz_private.invites where room_id = room;
  end if;
  return result;
end $$;

create function public.kaosz_update_scene(room uuid, expected_version integer, new_scene text, new_segment integer)
returns public.kaosz_scene
language plpgsql security definer set search_path = ''
as $$
declare updated public.kaosz_scene;
begin
  if not exists(select 1 from public.kaosz_rooms where id = room and host_id = auth.uid()) then
    raise exception 'Host permission required' using errcode = '42501';
  end if;
  update public.kaosz_scene set scene = new_scene, segment = new_segment, version = version + 1
    where room_id = room and version = expected_version returning * into updated;
  if not found then raise exception 'Scene version changed' using errcode = '40001'; end if;
  return updated;
end $$;

revoke execute on function public.kaosz_create_room(text, text), public.kaosz_join_room(uuid, text),
  public.kaosz_room_invite(uuid, boolean), public.kaosz_update_scene(uuid, integer, text, integer)
  from public, anon;
grant execute on function public.kaosz_create_room(text, text), public.kaosz_join_room(uuid, text),
  public.kaosz_room_invite(uuid, boolean), public.kaosz_update_scene(uuid, integer, text, integer) to authenticated;

alter publication supabase_realtime add table public.kaosz_members, public.kaosz_scene, public.kaosz_messages;
