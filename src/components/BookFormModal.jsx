import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import {
  EMPTY_BOOK,
  FORMAT_OPTIONS,
  MONTHS,
  STATUS_OPTIONS,
  TAG_OPTIONS,
  YEAR_OPTIONS,
  uniqueAuthors,
} from '../constants'
import { AuthorCombobox } from './AuthorCombobox'

export function BookFormModal({ book, books, onClose, onSave, onDelete }) {
  const isEdit = Boolean(book?.id)
  const [form, setForm] = useState(book ?? EMPTY_BOOK)
  const [error, setError] = useState('')

  useEffect(() => {
    setForm(book ?? EMPTY_BOOK)
    setError('')
  }, [book])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function toggleTag(tag) {
    setForm((current) => {
      const has = current.tags.includes(tag)
      return {
        ...current,
        tags: has ? current.tags.filter((item) => item !== tag) : [...current.tags, tag],
      }
    })
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!form.title.trim() || !form.author.trim()) {
      setError('Название и автор обязательны.')
      return
    }
    const rating = Math.min(10, Math.max(1, Number(form.rating) || 1))
    onSave({
      ...form,
      id: form.id ?? crypto.randomUUID(),
      title: form.title.trim(),
      author: form.author.trim(),
      coverUrl: form.coverUrl.trim(),
      readMonth: Number(form.readMonth),
      readYear: Number(form.readYear),
      rating,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-start sm:p-6 sm:pt-8">
      <button
        type="button"
        aria-label="Закрыть"
        className="absolute inset-0 bg-stone-950/30"
        onClick={onClose}
      />
      <div className="relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-[0_24px_80px_rgba(28,25,23,0.22)] sm:rounded-[2rem]">
        <header className="flex items-center justify-between px-5 py-4 sm:px-6">
          <div>
            <p className="text-sm font-semibold text-stone-400">
              {isEdit ? 'Редактирование' : 'Новая запись'}
            </p>
            <h2 className="text-2xl font-extrabold tracking-tight text-stone-950">
              {isEdit ? form.title || 'Книга' : 'Добавить книгу'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть форму"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200"
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2 sm:px-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Название">
                <input
                  value={form.title}
                  onChange={(event) => update('title', event.target.value)}
                  className={inputClass}
                  placeholder="Снеговик"
                />
              </Field>
              <Field label="Автор">
                <AuthorCombobox
                  value={form.author}
                  onChange={(value) => update('author', value)}
                  authors={uniqueAuthors(books)}
                  placeholder="Начните вводить имя"
                />
              </Field>
              <Field label="Ссылка на обложку" className="sm:col-span-2">
                <input
                  value={form.coverUrl}
                  onChange={(event) => update('coverUrl', event.target.value)}
                  className={inputClass}
                  placeholder="https://… или /covers/…"
                />
              </Field>
              <Field label="Оценка (1–10)">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={form.rating}
                  onChange={(event) => update('rating', event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Статус">
                <select
                  value={form.status}
                  onChange={(event) => update('status', event.target.value)}
                  className={inputClass}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Формат">
                <select
                  value={form.format}
                  onChange={(event) => update('format', event.target.value)}
                  className={inputClass}
                >
                  {FORMAT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Месяц и год прочтения">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={form.readMonth}
                    onChange={(event) => update('readMonth', event.target.value)}
                    className={inputClass}
                  >
                    {MONTHS.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={form.readYear}
                    onChange={(event) => update('readYear', event.target.value)}
                    className={inputClass}
                  >
                    {YEAR_OPTIONS.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
              <Field label="Теги" className="sm:col-span-2">
                <div className="flex min-h-12 flex-wrap gap-2 rounded-2xl bg-stone-50 px-3 py-3">
                  {TAG_OPTIONS.map((tag) => {
                    const active = form.tags.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          active
                            ? 'bg-stone-950 text-white'
                            : 'bg-white text-stone-600 shadow-[0_4px_14px_rgba(28,25,23,0.06)]'
                        }`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </Field>
              <Field label="Отзыв" className="sm:col-span-2">
                <textarea
                  value={form.review}
                  onChange={(event) => update('review', event.target.value)}
                  rows={6}
                  className={`${inputClass} resize-y`}
                  placeholder="Развёрнутый отзыв"
                />
              </Field>
              <Field label="Любимые цитаты" className="sm:col-span-2">
                <textarea
                  value={form.quotes}
                  onChange={(event) => update('quotes', event.target.value)}
                  rows={5}
                  className={`${inputClass} resize-y`}
                  placeholder="По одной цитате на строку"
                />
              </Field>
            </div>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          </div>

          <footer className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6">
            {isEdit ? (
              <button
                type="button"
                onClick={() => onDelete(form.id)}
                className="text-sm font-semibold text-red-600 hover:text-red-700"
              >
                Удалить
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
              >
                Сохранить
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  )
}

function Field({ label, className = '', children }) {
  return (
    <div className={className}>
      <p className="mb-2 text-xs font-semibold tracking-wide text-stone-400 uppercase">
        {label}
      </p>
      {children}
    </div>
  )
}

const inputClass =
  'w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-950 outline-none placeholder:text-stone-400 focus:border-stone-300 focus:bg-white'
