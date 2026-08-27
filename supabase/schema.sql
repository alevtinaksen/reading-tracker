-- ============================================================
--  Reading Log — схема Supabase (PostgreSQL)
--  Вариант: личный трекер без логина. RLS включён, доступ открыт.
--  Запустите целиком в SQL-редакторе дашборда Supabase.
-- ============================================================

-- ---------- Таблицы ----------

create table if not exists public.authors (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- Уникальное имя автора без учёта регистра, чтобы не плодить дубли
create unique index if not exists authors_name_lower_key
  on public.authors (lower(name));

create table if not exists public.books (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  author_id  uuid not null references public.authors (id) on delete restrict,
  cover_url  text,
  rating     smallint not null default 7 check (rating between 1 and 10),
  status     text not null default 'read' check (status in ('read', 'reading', 'abandoned')),
  format     text not null default 'paper' check (format in ('paper', 'audio', 'ebook')),
  read_month smallint check (read_month between 1 and 12),
  read_year  smallint,
  review     text,
  quotes     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists books_author_id_idx on public.books (author_id);
create index if not exists books_status_idx    on public.books (status);

create table if not exists public.tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz not null default now()
);

-- Связь книг и тегов (многие-ко-многим)
create table if not exists public.book_tags (
  book_id uuid not null references public.books (id) on delete cascade,
  tag_id  uuid not null references public.tags  (id) on delete cascade,
  primary key (book_id, tag_id)
);

-- ---------- Автообновление updated_at ----------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger books_set_updated_at
  before update on public.books
  for each row execute function public.set_updated_at();

-- ---------- RLS: включаем, доступ открыт (личный трекер) ----------

alter table public.authors   enable row level security;
alter table public.books     enable row level security;
alter table public.tags      enable row level security;
alter table public.book_tags enable row level security;

create policy books_public_all     on public.books     for all using (true) with check (true);
create policy authors_public_all   on public.authors   for all using (true) with check (true);
create policy tags_public_all      on public.tags      for all using (true) with check (true);
create policy book_tags_public_all on public.book_tags for all using (true) with check (true);

-- ---------- Опционально: стартовые теги из приложения ----------

insert into public.tags (name) values
  ('Триллер'),
  ('Детектив'),
  ('Скандинавский нуар'),
  ('Криминал'),
  ('Шпионский')
on conflict (name) do nothing;
