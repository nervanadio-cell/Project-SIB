create table if not exists public.comments (
    id bigint generated always as identity primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    author_name text not null check (char_length(author_name) between 2 and 30),
    body text not null check (char_length(trim(body)) between 2 and 500),
    created_at timestamptz not null default now()
);

create index if not exists comments_created_at_idx on public.comments (created_at desc);

alter table public.comments enable row level security;

grant usage on schema public to anon, authenticated;
revoke all on public.comments from anon, authenticated;
grant select on public.comments to anon, authenticated;
grant insert (user_id, author_name, body) on public.comments to authenticated;

drop policy if exists "Читать отзывы могут все" on public.comments;
drop policy if exists "Писать отзывы могут владельцы аккаунтов" on public.comments;

create policy "Читать отзывы могут все"
on public.comments for select to anon, authenticated
using (true);

create policy "Писать отзывы могут владельцы аккаунтов"
on public.comments for insert to authenticated
with check ((select auth.uid()) = user_id);
