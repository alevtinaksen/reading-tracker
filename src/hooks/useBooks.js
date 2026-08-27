import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const BOOK_SELECT = `
  id,
  title,
  cover_url,
  rating,
  status,
  format,
  read_month,
  read_year,
  review,
  quotes,
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
    tags: (row.book_tags ?? []).map((link) => link.tags?.name).filter(Boolean),
    readMonth: row.read_month,
    readYear: row.read_year,
    review: row.review ?? '',
    quotes: row.quotes ?? '',
  }
}

async function upsertAuthor(name) {
  const trimmed = name.trim()

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
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError('')
      const { data, error: fetchError } = await supabase
        .from('books')
        .select(BOOK_SELECT)
        .order('created_at', { ascending: false })

      if (!active) return

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setBooks((data ?? []).map(mapBook))
      }
      setLoading(false)
    }

    load()

    return () => {
      active = false
    }
  }, [])

  const upsertBook = useCallback(async (book) => {
    setError('')
    try {
      const authorId = await upsertAuthor(book.author)

      const { error: bookError } = await supabase.from('books').upsert(
        {
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
        },
        { onConflict: 'id' },
      )
      if (bookError) throw bookError

      await syncBookTags(book.id, book.tags ?? [])

      setBooks((current) => {
        const exists = current.some((item) => item.id === book.id)
        return exists
          ? current.map((item) => (item.id === book.id ? book : item))
          : [book, ...current]
      })
    } catch (err) {
      setError(err.message ?? 'Не удалось сохранить книгу')
    }
  }, [])

  const removeBook = useCallback(async (id) => {
    setError('')
    try {
      const { error: deleteError } = await supabase.from('books').delete().eq('id', id)
      if (deleteError) throw deleteError

      setBooks((current) => current.filter((item) => item.id !== id))
    } catch (err) {
      setError(err.message ?? 'Не удалось удалить книгу')
    }
  }, [])

  const markAsRead = useCallback(
    async (id) => {
      setError('')
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

        setBooks((current) =>
          current.map((item) =>
            item.id === id ? { ...item, status: 'read', readMonth, readYear } : item,
          ),
        )
      } catch (err) {
        setError(err.message ?? 'Не удалось обновить книгу')
      }
    },
    [books],
  )

  return { books, loading, error, upsertBook, removeBook, markAsRead }
}
