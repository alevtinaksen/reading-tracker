-- ============================================================
--  Миграция: статус «Хочу прочитать» + NULL-оценка + базовые теги
-- ============================================================

-- 1. Добавляем новый статус в ограничение
alter table public.books drop constraint if exists books_status_check;
alter table public.books add constraint books_status_check
  check (status in ('read', 'reading', 'abandoned', 'want_to_read'));

-- 2. Оценка может быть NULL для книг «хочу прочитать»
alter table public.books alter column rating drop not null;

-- 3. Базовые теги: добавляем новые, удаляем прежние
insert into public.tags (name) values
  ('Детектив'),
  ('Триллер'),
  ('Криминальная проза'),
  ('Профлитература'),
  ('Классика')
on conflict (name) do nothing;

-- Связи в book_tags для удаляемых тегов уйдут каскадом
delete from public.tags
where name in ('Скандинавский нуар', 'Шпионский', 'Криминал');
