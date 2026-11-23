-- Share Coding: setup for a new database.
-- Existing TanyaAja! database already has the required tables and RPC.
-- Do not run this script against that database just to start the extracted app.
-- Server-only secret key; RLS without policies blocks browser access.
-- All application queries filter GROUP_ID from server configuration.
begin;

create or replace function public.share_coding_set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table if not exists public.owner_sessions (
  token_hash text primary key,
  group_id   text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),

  constraint owner_sessions_group_id_format
    check (group_id ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  constraint owner_sessions_token_hash_format
    check (token_hash ~ '^[0-9a-f]{64}$')
);

create index if not exists owner_sessions_expires_idx
  on public.owner_sessions (expires_at);

-- ---------------------------------------------------------------------------
-- 3. Pembatasan percobaan (rate limit)
--    Disimpan di database supaya tetap berlaku di Vercel (serverless).
--    bucket berisi jenis + kelompok + hash IP, bukan IP asli.
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limits (
  bucket       text not null,
  window_start timestamptz not null,
  hits         integer not null default 0,
  primary key (bucket, window_start),

  constraint rate_limits_bucket_length check (char_length(bucket) <= 200)
);

-- Tambah 1 hitungan ke bucket pada jendela waktu saat ini.
-- Mengembalikan true jika masih di bawah batas, false jika sudah melewati batas.
create or replace function public.tanyaaja_hit_rate_limit(
  p_bucket text,
  p_max integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_hits integer;
begin
  if p_max < 1 or p_window_seconds < 1 then
    raise exception 'batas tidak valid';
  end if;

  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits as r (bucket, window_start, hits)
  values (p_bucket, v_window, 1)
  on conflict (bucket, window_start)
  do update set hits = r.hits + 1
  returning r.hits into v_hits;

  -- Bersihkan jendela lama milik bucket ini, dan sesekali seluruh data lama.
  delete from public.rate_limits
  where bucket = p_bucket and window_start < v_window;

  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
    delete from public.owner_sessions where expires_at < now();
  end if;

  return v_hits <= p_max;
end;
$$;

create table if not exists public.share_coding_posts (
  id         uuid primary key default gen_random_uuid(),
  group_id   text not null,
  title      text not null,
  -- Dokumen rich text terstruktur (Tiptap/ProseMirror JSON), bukan HTML.
  content    jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint share_coding_posts_group_id_format
    check (group_id ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  -- judul: 1–120 karakter, tidak boleh hanya spasi
  constraint share_coding_posts_title_length
    check (char_length(btrim(title)) between 1 and 120),
  -- isi harus dokumen ({"type":"doc", ...})
  constraint share_coding_posts_content_doc
    check (jsonb_typeof(content) = 'object' and coalesce(content ->> 'type', '') = 'doc'),
  -- batas ukuran isi (aplikasi membatasi lebih ketat)
  constraint share_coding_posts_content_size
    check (octet_length(content::text) <= 200000)
);

-- Daftar per kelompok, urut dari yang paling awal dibuat
create index if not exists share_coding_posts_group_created_idx
  on public.share_coding_posts (group_id, created_at, id);

-- updated_at otomatis
drop trigger if exists share_coding_posts_set_updated_at on public.share_coding_posts;
create trigger share_coding_posts_set_updated_at
  before update on public.share_coding_posts
  for each row execute function public.share_coding_set_updated_at();

-- Hak akses
alter table public.share_coding_posts enable row level security;

revoke all on table public.share_coding_posts from public, anon, authenticated;
grant select, insert, update, delete on table public.share_coding_posts to service_role;

alter table public.owner_sessions enable row level security;
revoke all on table public.owner_sessions from public, anon, authenticated;
grant select, insert, update, delete on table public.owner_sessions to service_role;

alter table public.rate_limits enable row level security;
revoke all on table public.rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.rate_limits to service_role;

revoke all on function public.tanyaaja_hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.tanyaaja_hit_rate_limit(text, integer, integer) to service_role;

commit;
