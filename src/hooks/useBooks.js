import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'

const BOOK_SELECT = `
  id,
  title,
  cover_url,
  rating,
  status,
  format,
  pages,
  read_month,
  read_year,
  review,
  quotes,
  created_at,
  authors ( id, name ),
  book_tags ( tags ( id, name ) )
`

function mapBook(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.authors?.name ?? '',
    coverUrl: row.cover_url ?? '',
    rating: row.rating,
    status: row.status,
    format: row.format,
    pages: row.pages ?? null,
    tags: (row.book_tags ?? []).map((link) => link.tags?.name).filter(Boolean),
    readMonth: row.read_month,
    readYear: row.read_year,
    review: row.review ?? '',
    quotes: row.quotes ?? '',
    createdAt: row.created_at ?? null,
  }
}

async function upsertAuthor(name) {
  const trimmed = (name || '').trim()
  if (!trimmed) return null

  const { data: existing } = await supabase
    .from('authors')
    .select('id')
    .ilike('name', trimmed)
    .limit(1)
    .maybeSingle()

  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('authors')
    .insert({ name: trimmed })
    .select('id')
    .single()

  if (error) throw error
  return created.id
}

async function upsertTag(name) {
  const { data: existing } = await supabase
    .from('tags')
    .select('id')
    .eq('name', name)
    .maybeSingle()

  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('tags')
    .insert({ name })
    .select('id')
    .single()

  if (error) throw error
  return created.id
}

async function syncBookTags(bookId, tags) {
  await supabase.from('book_tags').delete().eq('book_id', bookId)

  const tagIds = await Promise.all(tags.map((name) => upsertTag(name)))
  if (tagIds.length === 0) return

  const { error } = await supabase
    .from('book_tags')
    .insert(tagIds.map((tagId) => ({ book_id: bookId, tag_id: tagId })))

  if (error) throw error
}

export function useBooks() {
  const [books, setBooks] = useState(() => {
    try {
      const cached = localStorage.getItem('reading_tracker_books_cache')
      return cached ? JSON.parse(cached) : []
    } catch {
      return []
    }
  })
  const [tags, setTags] = useState(() => {
    try {
      const cached = localStorage.getItem('reading_tracker_tags_cache')
      return cached ? JSON.parse(cached) : []
    } catch {
      return []
    }
  })
  const [loading, setLoading] = useState(() => {
    try {
      return !localStorage.getItem('reading_tracker_books_cache')
    } catch {
      return true
    }
  })
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      setError('')
      try {
        // Таймаут на случай медленного соединения или сбоя сети
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Превышено время ожидания ответа сервера')), 8000)
        )

        const fetchPromise = Promise.all([
          supabase.from('books').select(BOOK_SELECT).order('created_at', { ascending: false }),
          supabase.from('tags').select('name').order('name'),
        ])

        const [booksResult, tagsResult] = await Promise.race([fetchPromise, timeoutPromise])

        if (!active) return

        if (booksResult.error) {
          // Резервный запрос без колонки pages
          const fallbackResult = await supabase
            .from('books')
            .select(
              `id, title, cover_url, rating, status, format, read_month, read_year, review, quotes, created_at, authors ( id, name ), book_tags ( tags ( id, name ) )`,
            )
            .order('created_at', { ascending: false })

          if (fallbackResult.error) {
            setError(fallbackResult.error.message)
          } else {
            const mapped = (fallbackResult.data ?? []).map(mapBook)
            setBooks(mapped)
            try {
              localStorage.setItem('reading_tracker_books_cache', JSON.stringify(mapped))
            } catch {}
          }
        } else {
          const mapped = (booksResult.data ?? []).map(mapBook)
          setBooks(mapped)
          try {
            localStorage.setItem('reading_tracker_books_cache', JSON.stringify(mapped))
          } catch {}
        }

        if (tagsResult?.data) {
          const mappedTags = (tagsResult.data ?? []).map((tag) => tag.name)
          setTags(mappedTags)
          try {
            localStorage.setItem('reading_tracker_tags_cache', JSON.stringify(mappedTags))
          } catch {}
        }
      } catch (err) {
        if (!active) return
        setError(err.message || 'Ошибка загрузки данных')
        // В случае ошибки подгружаем локальный кэш
        try {
          const cached = localStorage.getItem('reading_tracker_books_cache')
          if (cached && books.length === 0) setBooks(JSON.parse(cached))
          const cachedTags = localStorage.getItem('reading_tracker_tags_cache')
          if (cachedTags && tags.length === 0) setTags(JSON.parse(cachedTags))
        } catch {}
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [])

  const upsertBook = useCallback(async (book) => {
    try {
      const authorId = await upsertAuthor(book.author)

      const payload = {
        id: book.id,
        title: book.title,
        author_id: authorId,
        cover_url: book.coverUrl || null,
        rating: book.rating,
        status: book.status,
        format: book.format,
        read_month: book.readMonth ?? null,
        read_year: book.readYear ?? null,
        review: book.review || null,
        quotes: book.quotes || null,
      }
      if (book.pages != null) {
        payload.pages = book.pages
      }

      const { error: bookError } = await supabase.from('books').upsert(payload, {
        onConflict: 'id',
      })
      if (bookError) {
        delete payload.pages
        const { error: retryError } = await supabase.from('books').upsert(payload, {
          onConflict: 'id',
        })
        if (retryError) throw retryError
      }

      await syncBookTags(book.id, book.tags ?? [])

      setBooks((current) => {
        const exists = current.some((item) => item.id === book.id)
        const updated = exists
          ? current.map((item) => (item.id === book.id ? book : item))
          : [{ ...book, createdAt: new Date().toISOString() }, ...current]
        try {
          localStorage.setItem('reading_tracker_books_cache', JSON.stringify(updated))
        } catch {}
        return updated
      })
      toast.success('Книга сохранена')
    } catch {
      toast.error('Ошибка сохранения')
    }
  }, [])

  const removeBook = useCallback(async (id) => {
    try {
      const { error: deleteError } = await supabase.from('books').delete().eq('id', id)
      if (deleteError) throw deleteError

      setBooks((current) => {
        const updated = current.filter((item) => item.id !== id)
        try {
          localStorage.setItem('reading_tracker_books_cache', JSON.stringify(updated))
        } catch {}
        return updated
      })
      toast.success('Книга удалена')
    } catch {
      toast.error('Ошибка удаления')
    }
  }, [])

  const markAsRead = useCallback(
    async (id) => {
      try {
        const book = books.find((item) => item.id === id)
        const now = new Date()
        const readMonth = book?.readMonth || now.getMonth() + 1
        const readYear = book?.readYear || now.getFullYear()

        const { error: updateError } = await supabase
          .from('books')
          .update({ status: 'read', read_month: readMonth, read_year: readYear })
          .eq('id', id)
        if (updateError) throw updateError

        setBooks((current) => {
          const updated = current.map((item) =>
            item.id === id ? { ...item, status: 'read', readMonth, readYear } : item,
          )
          try {
            localStorage.setItem('reading_tracker_books_cache', JSON.stringify(updated))
          } catch {}
          return updated
        })
        toast.success('Отмечено прочитанным')
      } catch {
        toast.error('Не удалось обновить книгу')
      }
    },
    [books],
  )

  const importBooks = useCallback(
    async (importedList) => {
      try {
        for (const book of importedList) {
          await upsertBook(book)
        }
        toast.success(`Успешно загружено книг: ${importedList.length}`)
      } catch {
        toast.error('Не удалось импортировать все книги')
      }
    },
    [upsertBook],
  )

  return { books, tags, loading, error, upsertBook, removeBook, markAsRead, importBooks }
}
