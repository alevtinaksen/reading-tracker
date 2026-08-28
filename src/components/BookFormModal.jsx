import { useEffect, useRef, useState } from 'react'
import {
  BookMarked,
  BookOpen,
  Check,
  ChevronDown,
  Headphones,
  Link2,
  Loader2,
  Mic,
  MicOff,
  Minus,
  PenLine,
  Plus,
  Tablet,
  Trash2,
  X,
} from 'lucide-react'
import {
  EMPTY_BOOK,
  MONTHS,
  STATUS,
  TAG_OPTIONS,
  YEAR_OPTIONS,
  uniqueAuthors,
} from '../constants'
import { detectGenresForBook, fetchBookMetadataFromUrl, stripPatronymic } from '../utils/bookFetcher'
import { AuthorCombobox } from './AuthorCombobox'
import { TagMultiSelect } from './TagMultiSelect'

const STATUS_CHIPS = [
  { value: STATUS.wantToRead, label: 'Хочу прочитать', dot: 'bg-[#8B5CF6]' },
  { value: STATUS.reading, label: 'В процессе', dot: 'bg-[#38BDF8]' },
  { value: STATUS.read, label: 'Прочитано', dot: 'bg-[#22C55E]' },
  { value: STATUS.abandoned, label: 'Брошено', dot: 'bg-[#EF4444]' },
]

const FORMAT_CHIPS = [
  { value: 'paper', label: 'Бумага', icon: BookOpen },
  { value: 'audio', label: 'Аудио', icon: Headphones },
  { value: 'ebook', label: 'Электронная', icon: Tablet },
]

export function BookFormModal({ book, books, tags = [], onClose, onSave, onDelete }) {
  const isEdit = Boolean(book?.id)
  const [form, setForm] = useState(book ?? EMPTY_BOOK)
  const [fieldErrors, setFieldErrors] = useState({})

  const [mode, setMode] = useState(isEdit ? 'manual' : 'url')
  const [importUrl, setImportUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState(false)

  const [isDetectingGenres, setIsDetectingGenres] = useState(false)
  const [genreMessage, setGenreMessage] = useState('')
  const [genreMessageType, setGenreMessageType] = useState('info')

  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef(null)

  const [showNotes, setShowNotes] = useState(Boolean(book?.review || book?.quotes))
  const [showConfirmClose, setShowConfirmClose] = useState(false)
  const initialFormRef = useRef(book ?? EMPTY_BOOK)

  const isWishlist = form.status === STATUS.wantToRead
  const noRating = form.rating == null || form.rating === ''
  const noDate = !form.readMonth && !form.readYear
  const tagOptions = [...new Set([...TAG_OPTIONS, ...tags])]

  useEffect(() => {
    if (isRecording) {
      try { recognitionRef.current?.stop() } catch {}
      setIsRecording(false)
    }
    const init = book ?? EMPTY_BOOK
    setForm(init)
    initialFormRef.current = init
    setFieldErrors({})
    setImportUrl('')
    setImportError('')
    setImportSuccess(false)
    setGenreMessage('')
    setMode(book?.id ? 'manual' : 'url')
    setShowNotes(Boolean(book?.review || book?.quotes))
    setShowConfirmClose(false)
  }, [book])

  useEffect(() => {
    const origOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = origOverflow
      if (recognitionRef.current) try { recognitionRef.current.stop() } catch {}
    }
  }, [])

  function checkIsDirty() {
    const init = initialFormRef.current
    if (!init) return false
    return (
      (form.title || '').trim() !== (init.title || '').trim() ||
      (form.author || '').trim() !== (init.author || '').trim() ||
      (form.status || '') !== (init.status || '') ||
      (form.format || '') !== (init.format || '') ||
      (form.rating ?? '') !== (init.rating ?? '') ||
      (form.pages ?? '') !== (init.pages ?? '') ||
      (form.readMonth ?? '') !== (init.readMonth ?? '') ||
      (form.readYear ?? '') !== (init.readYear ?? '') ||
      (form.review || '').trim() !== (init.review || '').trim() ||
      (form.quotes || '').trim() !== (init.quotes || '').trim() ||
      JSON.stringify(form.tags || []) !== JSON.stringify(init.tags || [])
    )
  }

  function handleAttemptClose() {
    if (checkIsDirty()) {
      setShowConfirmClose(true)
    } else {
      onClose()
    }
  }

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        if (showConfirmClose) {
          setShowConfirmClose(false)
        } else if (checkIsDirty()) {
          setShowConfirmClose(true)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, showConfirmClose, form])

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: '' }))
    }
  }

  function handleImportUrlChange(val) {
    setImportUrl(val)
    if (fieldErrors.importUrl) {
      setFieldErrors((prev) => ({ ...prev, importUrl: '' }))
    }
    if (importError) {
      setImportError('')
    }
  }

  async function handleAutoDetectGenres(titleToUse, authorToUse) {
    const bookTitle = (titleToUse ?? form.title ?? '').trim()
    const bookAuthor = (authorToUse ?? form.author ?? '').trim()
    if (!bookTitle) return

    setIsDetectingGenres(true)
    setGenreMessage('Подбираем жанры…')
    setGenreMessageType('info')

    try {
      const suggested = await detectGenresForBook(bookTitle, bookAuthor)
      if (suggested && suggested.length > 0) {
        setForm((prev) => {
          const currentTags = prev.tags || []
          const merged = [...new Set([...currentTags, ...suggested])]
          return { ...prev, tags: merged }
        })
        setGenreMessage(`Добавлено: ${suggested.join(', ')}`)
        setGenreMessageType('success')
      } else {
        setGenreMessage('Жанры не найдены')
        setGenreMessageType('neutral')
      }
    } catch {
      setGenreMessage('Не удалось определить жанры')
      setGenreMessageType('neutral')
    } finally {
      setIsDetectingGenres(false)
      setTimeout(() => { setGenreMessage('') }, 4000)
    }
  }

  async function handleImportFromUrl() {
    if (!importUrl.trim()) {
      setFieldErrors((prev) => ({ ...prev, importUrl: 'Укажите ссылку на книгу' }))
      return
    }
    setIsImporting(true)
    setImportError('')
    setFieldErrors({})

    try {
      const data = await fetchBookMetadataFromUrl(importUrl.trim())
      setForm((prev) => ({
        ...prev,
        title: data.title || prev.title,
        author: data.author || prev.author,
        coverUrl: data.coverUrl || prev.coverUrl,
        pages: data.pages || prev.pages,
        format: data.format || prev.format || 'paper',
        tags: data.tags?.length ? [...new Set([...(prev.tags || []), ...data.tags])] : prev.tags,
      }))
      setImportSuccess(true)
      setMode('manual')

      if (!data.tags || data.tags.length === 0) {
        handleAutoDetectGenres(data.title, data.author)
      }
    } catch (err) {
      setImportError(err.message || 'Не удалось загрузить данные по этой ссылке')
    } finally {
      setIsImporting(false)
    }
  }

  function toggleDictation() {
    if (isRecording) {
      try { recognitionRef.current?.stop() } catch {}
      setIsRecording(false)
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setFieldErrors((prev) => ({ ...prev, review: 'Голосовой ввод не поддерживается в этом браузере' }))
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition
      recognition.lang = 'ru-RU'
      recognition.continuous = true
      recognition.interimResults = true

      let finalTranscript = form.review ? form.review + ' ' : ''

      recognition.onresult = (event) => {
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' '
          } else {
            interim += event.results[i][0].transcript
          }
        }
        update('review', (finalTranscript + interim).trim())
      }
      recognition.onerror = () => { setIsRecording(false) }
      recognition.onend = () => { setIsRecording(false) }
      recognition.start()
      setIsRecording(true)
    } catch {
      setIsRecording(false)
    }
  }



  function handleSubmit(event) {
    if (event) event.preventDefault()

    // Если режим ссылки и ещё не загрузили
    if (mode === 'url' && !importSuccess && !isEdit) {
      if (!importUrl.trim()) {
        setFieldErrors({ importUrl: 'Укажите ссылку на книгу' })
        return
      }
      handleImportFromUrl()
      return
    }

    // Режим ручного ввода или редактирования
    const errors = {}
    if (!form.title || !form.title.trim()) {
      errors.title = 'Укажите название книги'
    }
    if (!form.author || !form.author.trim()) {
      errors.author = 'Укажите автора книги'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    const bookToSave = {
      ...form,
      title: form.title.trim(),
      author: stripPatronymic(form.author.trim()),
      coverUrl: form.coverUrl ? form.coverUrl.trim() : '',
      review: form.review ? form.review.trim() : '',
      quotes: form.quotes ? form.quotes.trim() : '',
      format: isWishlist ? null : (form.format || 'paper'),
      rating: isWishlist || noRating ? null : Number(form.rating),
      pages: form.pages ? Number(form.pages) : null,
      readMonth: isWishlist || noDate ? null : Number(form.readMonth),
      readYear: isWishlist || noDate ? null : Number(form.readYear),
      tags: form.tags ?? [],
    }
    onSave(bookToSave)
    onClose()
  }

  const inputClass =
    'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-gray-900 focus:ring-1 focus:ring-gray-900'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-xs overflow-hidden transition-opacity duration-200"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) handleAttemptClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-xl flex flex-col overflow-hidden rounded-t-[32px] sm:rounded-[28px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] max-h-[85dvh] sm:max-h-[88vh] animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 duration-200"
      >
        {showConfirmClose && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-sm rounded-[28px] bg-white p-7 shadow-[0_24px_70px_rgba(0,0,0,0.20)] border border-gray-100 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-900">
                <PenLine size={20} strokeWidth={2} />
              </div>
              <h3 className="mt-4 text-[16px] font-extrabold text-gray-900">Несохранённые изменения</h3>
              <p className="mt-1.5 text-xs text-gray-500 leading-relaxed px-2">
                Вы изменили данные книги. Сохранить их перед закрытием?
              </p>
              <div className="mt-6 space-y-2.5">
                <button
                  type="button"
                  onClick={(e) => {
                    setShowConfirmClose(false)
                    handleSubmit(e)
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 py-3.5 text-xs font-bold text-white transition-all hover:bg-gray-800 active:scale-95 cursor-pointer shadow-xs"
                >
                  <Check size={14} strokeWidth={2.5} />
                  <span>Сохранить изменения</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmClose(false)
                    onClose()
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-100 py-3 text-xs font-bold text-gray-700 transition-all hover:bg-gray-200 active:scale-95 cursor-pointer"
                >
                  <span>Сбросить и закрыть</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmClose(false)}
                  className="w-full py-1.5 text-xs font-semibold text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
                >
                  Продолжить редактирование
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-gray-300 sm:hidden" />
        <header className="shrink-0 flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-800 shrink-0">
              <BookMarked size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-gray-900 line-clamp-2">
                {isEdit ? form.title || 'Параметры книги' : 'Новая книга'}
              </h2>
              <p className="text-xs text-gray-400">
                {isEdit ? 'Измените параметры книги' : 'Добавление книги в коллекцию'}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Закрыть"
            onClick={handleAttemptClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto space-y-4 px-5 py-4 sm:px-6 sm:py-5 overscroll-contain">
            {!isEdit ? (
              <div className="flex rounded-xl bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setMode('url')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
                    mode === 'url'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Link2 size={14} />
                  <span>По ссылке</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('manual')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
                    mode === 'manual'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <PenLine size={14} />
                  <span>Вручную</span>
                </button>
              </div>
            ) : null}

            {mode === 'url' && !importSuccess && !isEdit ? (
              <div className="rounded-2xl bg-gray-100/70 p-4 transition-all">
                <div className="mb-2 text-xs font-bold text-gray-800">
                  <span>Вставьте ссылку на книгу</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={importUrl}
                    onChange={(e) => handleImportUrlChange(e.target.value)}
                    placeholder="https://..."
                    className={`${inputClass} text-xs ${
                      fieldErrors.importUrl ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''
                    }`}
                  />
                  <button
                    type="button"
                    disabled={isImporting}
                    onClick={handleImportFromUrl}
                    title="Заполнить по ссылке"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isImporting ? (
                      <Loader2 size={16} className="animate-spin text-gray-600" />
                    ) : (
                      <Check size={16} strokeWidth={2.5} />
                    )}
                  </button>
                </div>
                {fieldErrors.importUrl && (
                  <p className="mt-1.5 text-xs font-medium text-red-500">{fieldErrors.importUrl}</p>
                )}
                {importError && (
                  <p className="mt-2 text-xs font-medium text-red-500">{importError}</p>
                )}
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Название книги" required error={fieldErrors.title}>
                    <input
                      value={form.title}
                      onChange={(e) => update('title', e.target.value)}
                      className={`${inputClass} ${
                        fieldErrors.title ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''
                      }`}
                      placeholder="Например: Снеговик"
                    />
                  </Field>
                  <Field label="Автор" required error={fieldErrors.author}>
                    <AuthorCombobox
                      value={form.author}
                      onChange={(v) => update('author', v)}
                      existingAuthors={uniqueAuthors(books)}
                      hasError={Boolean(fieldErrors.author)}
                      placeholder="Например: Ю Несбё"
                    />
                  </Field>
                </div>

                <Field label="Ссылка на обложку">
                  <div className="relative">
                    <input
                      value={form.coverUrl}
                      onChange={(e) => update('coverUrl', e.target.value)}
                      className={`${inputClass} pl-10`}
                      placeholder="https://..."
                    />
                    <Link2
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                  </div>
                </Field>

                <Field label="Статус книги">
                  <div className="flex flex-wrap items-center gap-2">
                    {STATUS_CHIPS.map((option) => {
                      const active = form.status === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => update('status', option.value)}
                          className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                            active
                              ? 'bg-gray-900 text-white shadow-xs'
                              : 'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <span className={`h-2 w-2 rounded-full shrink-0 ${option.dot}`} />
                          <span>{option.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </Field>

                {!isWishlist && (
                  <div className="space-y-4">
                    <Field label="Формат">
                      <div className="flex flex-wrap items-center gap-2">
                        {FORMAT_CHIPS.map((option) => {
                          const active = form.format === option.value
                          const Icon = option.icon
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => update('format', option.value)}
                              className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                                active
                                  ? 'bg-gray-900 text-white shadow-xs'
                                  : 'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <Icon size={14} strokeWidth={1.8} />
                              <span>{option.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </Field>

                    <Field label="Месяц и год прочтения">
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="relative">
                            <select
                              value={form.readMonth ?? ''}
                              disabled={noDate}
                              onChange={(e) => update('readMonth', e.target.value)}
                              className={`${inputClass} appearance-none pr-9 cursor-pointer`}
                            >
                              {MONTHS.map((m) => (
                                <option key={m.value} value={m.value}>
                                  {m.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              size={14}
                              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                          </div>

                          <div className="relative">
                            <select
                              value={form.readYear ?? ''}
                              disabled={noDate}
                              onChange={(e) => update('readYear', e.target.value)}
                              className={`${inputClass} appearance-none pr-9 cursor-pointer`}
                            >
                              {YEAR_OPTIONS.map((y) => (
                                <option key={y} value={y}>
                                  {y}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              size={14}
                              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                          </div>
                        </div>

                        <CustomCheckbox
                          checked={noDate}
                          onChange={(c) => {
                            if (c) {
                              setForm((prev) => ({ ...prev, readMonth: null, readYear: null }))
                            } else {
                              const d = new Date()
                              update('readMonth', d.getMonth() + 1)
                              update('readYear', d.getFullYear())
                            }
                          }}
                          label="Без даты"
                        />
                      </div>
                    </Field>
                  </div>
                )}

                <Field
                  label="Жанры и теги"
                  action={
                    (mode === 'manual' || isEdit) && genreMessage ? (
                      <span
                        className={`text-[11px] font-semibold animate-pulse ${
                          genreMessageType === 'success'
                            ? 'text-emerald-600'
                            : genreMessageType === 'neutral'
                              ? 'text-gray-500'
                              : 'text-sky-600'
                        }`}
                      >
                        {genreMessage}
                      </span>
                    ) : null
                  }
                >
                  <TagMultiSelect
                    value={form.tags ?? []}
                    options={tagOptions}
                    onChange={(v) => update('tags', v)}
                    onAutoDetect={mode === 'manual' || isEdit ? () => handleAutoDetectGenres() : undefined}
                    isDetecting={isDetectingGenres}
                    canAutoDetect={Boolean(form.title?.trim())}
                  />
                </Field>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowNotes((v) => !v)}
                    className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                  >
                    {showNotes ? <Minus size={14} /> : <Plus size={14} />}
                    <span>{showNotes ? 'Скрыть заметки и цитаты' : 'Добавить отзыв или цитаты'}</span>
                  </button>
                </div>

                {showNotes ? (
                  <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                    <Field label="Отзыв о книге">
                      <div className="relative">
                        <textarea
                          value={form.review}
                          onChange={(e) => update('review', e.target.value)}
                          className={`${inputClass} pr-12 min-h-[90px] resize-y leading-relaxed ${
                            isRecording ? 'border-red-400 ring-2 ring-red-100' : ''
                          }`}
                          placeholder="Ваши впечатления или заметки (можно надиктовать голосом)…"
                        />
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 z-10">
                          {/* Микрофон */}
                          <button
                            type="button"
                            onClick={toggleDictation}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all active:scale-95 cursor-pointer ${
                              isRecording
                                ? 'bg-red-500 text-white animate-pulse'
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200 hover:text-gray-900'
                            }`}
                            title={isRecording ? 'Остановить запись' : 'Надиктовать отзыв голосом'}
                          >
                            {isRecording ? (
                              <MicOff size={15} strokeWidth={2} className="text-white" />
                            ) : (
                              <Mic size={15} strokeWidth={2} className="text-gray-900" />
                            )}
                          </button>
                        </div>
                      </div>
                    </Field>

                    <Field label="Цитаты и заметки">
                      <textarea
                        value={form.quotes}
                        onChange={(e) => update('quotes', e.target.value)}
                        className={`${inputClass} min-h-[70px] resize-y leading-relaxed`}
                        placeholder="Запоминающиеся цитаты или мысли…"
                      />
                    </Field>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <footer className="shrink-0 flex items-center justify-between border-t border-gray-100 px-5 py-3 sm:px-6 sm:py-4 bg-white z-10">
            <div>
              {isEdit ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onDelete(form.id)
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 transition-colors cursor-pointer px-1 py-1.5"
                >
                  <Trash2 size={13} />
                  <span>Удалить</span>
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAttemptClose}
                className="rounded-xl px-4 py-2.5 text-xs font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-all cursor-pointer"
              >
                Отмена
              </button>

              <button
                type="submit"
                className="rounded-xl bg-gray-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-gray-800 active:scale-95 cursor-pointer"
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

function Field({ label, hint, action, required, error, children }) {
  return (
    <label className="block text-left">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-gray-800">
            {label} {required ? <span className="text-red-500">*</span> : null}
          </span>
          {hint ? <span className="text-[11px] text-gray-400">({hint})</span> : null}
        </div>
        {action}
      </div>
      {children}
      {error ? <p className="mt-1 text-xs font-medium text-red-500">{error}</p> : null}
    </label>
  )
}

function CustomCheckbox({ checked, onChange, label }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <div
        className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
          checked ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white'
        }`}
      >
        {checked && <Check size={11} strokeWidth={3} />}
      </div>
      <span className="text-xs font-semibold text-gray-600">{label}</span>
    </label>
  )
}
