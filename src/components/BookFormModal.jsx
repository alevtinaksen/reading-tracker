import { useEffect, useRef, useState } from 'react'
import {
  BookMarked,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  Circle,
  Link2,
  Loader2,
  Mic,
  MicOff,
  Minus,
  PenLine,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import {
  EMPTY_BOOK,
  FORMAT_OPTIONS,
  MONTHS,
  STATUS,
  STATUS_OPTIONS,
  TAG_OPTIONS,
  YEAR_OPTIONS,
  uniqueAuthors,
} from '../constants'
import { detectGenresForBook, fetchBookMetadataFromUrl, stripPatronymic } from '../utils/bookFetcher'
import { polishReviewText } from '../utils/reviewPolisher'
import { AuthorCombobox } from './AuthorCombobox'
import { TagMultiSelect } from './TagMultiSelect'

const STATUS_DESCRIPTIONS = {
  [STATUS.read]: {
    desc: 'Книга полностью прочитана',
    badge: 'bg-[#DCFFDF] text-[#15803D]',
  },
  [STATUS.reading]: {
    desc: 'Сейчас читаю эту книгу',
    badge: 'bg-[#E0F2FE] text-[#0369A1]',
  },
  [STATUS.wantToRead]: {
    desc: 'В списке желаний и планов',
    badge: 'bg-[#F3E8FF] text-[#7C3AED]',
  },
  [STATUS.abandoned]: {
    desc: 'Чтение отложено или брошено',
    badge: 'bg-[#FFE5E5] text-[#D32F2F]',
  },
}

export function BookFormModal({ book, books, tags = [], onClose, onSave, onDelete }) {
  const isEdit = Boolean(book?.id)
  const [form, setForm] = useState(book ?? EMPTY_BOOK)
  const [error, setError] = useState('')

  // Вкладка добавления: 'url' (По ссылке) или 'manual' (Вручную)
  const [mode, setMode] = useState(isEdit ? 'manual' : 'url')

  // Стейты для автозаполнения по ссылке
  const [importUrl, setImportUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState(false)

  // Стейты для авто-определения жанров
  const [isDetectingGenres, setIsDetectingGenres] = useState(false)
  const [genreMessage, setGenreMessage] = useState('')

  // Стейты для диктофона и улучшения текста отзыва
  const [isRecording, setIsRecording] = useState(false)
  const [isPolishing, setIsPolishing] = useState(false)
  const [rawReviewBackup, setRawReviewBackup] = useState(null)
  const recognitionRef = useRef(null)

  // Сворачивание блока заметок / отзывов
  const [showNotes, setShowNotes] = useState(Boolean(book?.review || book?.quotes))

  const isWishlist = form.status === STATUS.wantToRead
  const noRating = form.rating == null || form.rating === ''
  const noDate = !form.readMonth && !form.readYear
  const tagOptions = [...new Set([...TAG_OPTIONS, ...tags])]

  useEffect(() => {
    if (isRecording) {
      try {
        recognitionRef.current?.stop()
      } catch {
        // ignore
      }
      setIsRecording(false)
    }
    setRawReviewBackup(null)
    setIsPolishing(false)
    setForm(book ?? EMPTY_BOOK)
    setError('')
    setImportUrl('')
    setImportError('')
    setImportSuccess(false)
    setGenreMessage('')
    setMode(book?.id ? 'manual' : 'url')
    setShowNotes(Boolean(book?.review || book?.quotes))
  }, [book])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // ignore
        }
      }
    }
  }, [])

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

  async function handleImportFromUrl() {
    if (!importUrl.trim()) return
    setIsImporting(true)
    setImportError('')
    setImportSuccess(false)
    try {
      const data = await fetchBookMetadataFromUrl(importUrl.trim())
      setForm((prev) => ({
        ...prev,
        title: data.title || prev.title,
        author: data.author || prev.author,
        coverUrl: data.coverUrl || prev.coverUrl,
        pages: data.pages || prev.pages,
        tags: data.tags?.length ? [...new Set([...prev.tags, ...data.tags])] : prev.tags,
      }))
      setImportSuccess(true)
    } catch (err) {
      setImportError(err.message || 'Не удалось загрузить данные по ссылке')
    } finally {
      setIsImporting(false)
    }
  }

  async function handleDetectGenres() {
    if (!form.title.trim()) {
      setError('Сначала введите название книги')
      return
    }
    setIsDetectingGenres(true)
    setGenreMessage('')
    try {
      const found = await detectGenresForBook(form.title, form.author)
      if (found.length > 0) {
        setForm((prev) => ({
          ...prev,
          tags: [...new Set([...prev.tags, ...found])],
        }))
        setGenreMessage(`Найдено: +${found.length}`)
        setTimeout(() => setGenreMessage(''), 3000)
      } else {
        setGenreMessage('Жанры не определены')
        setTimeout(() => setGenreMessage(''), 3000)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsDetectingGenres(false)
    }
  }

  // Запуск / остановка диктофона для наговаривания отзыва
  function toggleRecording() {
    if (isRecording) {
      try {
        recognitionRef.current?.stop()
      } catch {
        // ignore
      }
      setIsRecording(false)
      return
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setError('Голосовой ввод не поддерживается вашим браузером (рекомендуется Chrome, Safari или Edge)')
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.lang = 'ru-RU'
      recognition.continuous = true
      recognition.interimResults = true

      let baseText = form.review ? form.review.trim() + ' ' : ''

      recognition.onresult = (event) => {
        let interim = ''
        let final = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            final += transcript
          } else {
            interim += transcript
          }
        }

        if (final) {
          baseText += final + ' '
          update('review', baseText)
        } else if (interim) {
          update('review', baseText + interim)
        }
      }

      recognition.onerror = (event) => {
        console.warn('SpeechRecognition error:', event.error)
        if (event.error === 'not-allowed') {
          setError('Доступ к микрофону заблокирован. Разрешите микрофон в настройках браузера.')
        } else if (event.error !== 'no-speech') {
          setError(`Ошибка распознавания речи: ${event.error}`)
        }
        setIsRecording(false)
      }

      recognition.onend = () => {
        setIsRecording(false)
      }

      recognition.start()
      recognitionRef.current = recognition
      setIsRecording(true)
      setError('')
    } catch (err) {
      console.error('Failed to start speech recognition:', err)
      setError('Не удалось запустить диктофон')
      setIsRecording(false)
    }
  }

  // Улучшение текста надиктованного отзыва
  async function handlePolishReview() {
    if (!form.review || !form.review.trim() || isPolishing) return
    setIsPolishing(true)
    setRawReviewBackup(form.review)
    try {
      const polished = await polishReviewText(form.review, {
        bookTitle: form.title,
        bookAuthor: form.author,
      })
      update('review', polished)
    } catch (err) {
      console.error('Error polishing review:', err)
    } finally {
      setIsPolishing(false)
    }
  }

  function handleRestoreRawReview() {
    if (rawReviewBackup) {
      update('review', rawReviewBackup)
      setRawReviewBackup(null)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!form.title.trim()) {
      setError('Укажите название книги')
      return
    }

    const cleanedAuthor = stripPatronymic(form.author.trim())

    const bookToSave = {
      ...form,
      title: form.title.trim(),
      author: cleanedAuthor,
      coverUrl: form.coverUrl.trim(),
      review: form.review.trim(),
      quotes: form.quotes.trim(),
      rating: isWishlist || noRating ? null : Number(form.rating),
      pages: form.pages ? Number(form.pages) : null,
      readMonth: isWishlist || noDate ? null : Number(form.readMonth),
      readYear: isWishlist || noDate ? null : Number(form.readYear),
      tags: form.tags ?? [],
    }

    onSave(bookToSave)
  }

  const inputClass =
    'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-gray-900 focus:ring-1 focus:ring-gray-900'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center overflow-y-auto bg-black/50 p-0 sm:p-4 backdrop-blur-xs transition-opacity duration-200"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-xl flex flex-col overflow-hidden rounded-t-[32px] sm:rounded-[28px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] max-h-[92vh] sm:max-h-[88vh] animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 duration-200"
      >
        {/* Индикатор свайпа для мобильных */}
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-gray-300 sm:hidden" />
        {/* Заголовок с круглым серым фоном под иконку книги */}
        <header className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-800 shrink-0">
              <BookMarked size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-gray-900 line-clamp-2">
                {isEdit ? (form.title || 'Параметры книги') : 'Новая книга'}
              </h2>
              <p className="text-xs text-gray-400">
                {isEdit ? 'Измените параметры книги в библиотеке' : 'Добавление книги в вашу коллекцию'}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 px-6 py-5 overscroll-contain">
            {/* Переключатель вкладок «По ссылке» / «Вручную» при создании */}
            {!isEdit ? (
              <div className="flex rounded-xl bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setMode('url')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
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
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
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

            {/* Вкладка 1: По ссылке (до подтверждения) */}
            {mode === 'url' && !importSuccess && !isEdit ? (
              <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 transition-all">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-gray-900">
                  <Link2 size={15} className="text-gray-500" />
                  <span>Вставьте ссылку на книгу</span>
                </div>
                <p className="mb-3 text-[11px] text-gray-500 leading-relaxed">
                  Поддерживаются ссылки с <strong>ЛитРес</strong>, <strong>LiveLib</strong>, <strong>Читай-город</strong> и <strong>Лабиринт</strong>.
                </p>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      placeholder="https://www.litres.ru/book/..."
                      className={`${inputClass} pl-9 text-xs`}
                    />
                    <Link2
                      size={15}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isImporting || !importUrl.trim()}
                    onClick={handleImportFromUrl}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gray-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95 cursor-pointer"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Загружаем...</span>
                      </>
                    ) : (
                      <span>Заполнить</span>
                    )}
                  </button>
                </div>

                {importError ? (
                  <p className="mt-3 text-xs font-medium text-red-500">{importError}</p>
                ) : null}
              </div>
            ) : (
              /* Состояние 2: Форма с полями (вручную или после успешного импорта) */
              <>
                {/* Бейдж успешного импорта по ссылке с возможностью перезагрузки */}
                {mode === 'url' && !isEdit ? (
                  <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3.5 py-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 text-white">
                        <Check size={10} strokeWidth={3} />
                      </span>
                      <span className="font-semibold text-gray-900">
                        Данные книги подгружены
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setForm(EMPTY_BOOK)
                        setImportSuccess(false)
                        setImportUrl('')
                      }}
                      className="font-medium text-gray-400 transition-colors hover:text-gray-900 cursor-pointer"
                    >
                      Заменить ссылку
                    </button>
                  </div>
                ) : null}

                {/* 1. Название книги и Автор */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Название книги" required>
                    <input
                      value={form.title}
                      onChange={(event) => update('title', event.target.value)}
                      className={inputClass}
                      placeholder="Например: Снеговик"
                    />
                  </Field>

                  <Field label="Автор" required>
                    <AuthorCombobox
                      value={form.author}
                      onChange={(value) => update('author', value)}
                      existingAuthors={uniqueAuthors(books)}
                      inputClass={inputClass}
                      placeholder="Например: Ю Несбё"
                    />
                  </Field>
                </div>

                {/* 2. Ссылка на обложку (минималистично, без подсказки) */}
                <Field label="Ссылка на обложку">
                  <div className="relative">
                    <input
                      value={form.coverUrl}
                      onChange={(event) => update('coverUrl', event.target.value)}
                      className={`${inputClass} pl-10`}
                      placeholder="https://..."
                    />
                    <Link2
                      size={16}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                  </div>
                </Field>

                {/* 3. Статус книги: просторная сетка 2x2 с правильными отступами */}
                <Field label="Статус книги">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {STATUS_OPTIONS.map((option) => {
                      const active = form.status === option.value
                      const statusInfo = STATUS_DESCRIPTIONS[option.value]

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            update('status', option.value)
                            if (
                              (option.value === STATUS.wantToRead || option.value === STATUS.abandoned) &&
                              !form.rating
                            ) {
                              update('rating', null)
                            }
                          }}
                          className={`relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all cursor-pointer min-h-[88px] ${
                            active
                              ? 'border-2 border-gray-900 bg-white shadow-xs'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className="flex w-full items-center justify-between">
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${statusInfo?.badge}`}
                            >
                              {option.label}
                            </span>
                            <div className="shrink-0">
                              {active ? (
                                <CheckCircle2 size={18} className="text-gray-900" />
                              ) : (
                                <Circle size={18} className="text-gray-300" />
                              )}
                            </div>
                          </div>
                          <p className="mt-2 text-xs text-gray-400 font-medium">
                            {statusInfo?.desc}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </Field>

                {/* 4. Формат книги: цельный сегмент во всю ширину */}
                <Field label="Формат">
                  <div className="flex rounded-2xl bg-gray-100/80 p-1">
                    {FORMAT_OPTIONS.map((option) => {
                      const active = form.format === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => update('format', option.value)}
                          className={`flex flex-1 items-center justify-center rounded-xl py-2.5 text-xs font-bold transition-all cursor-pointer ${
                            active
                              ? 'bg-white text-gray-900 shadow-xs'
                              : 'text-gray-500 hover:text-gray-900'
                          }`}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </Field>

                {/* 5. Оценка (во всю ширину) и Месяц/Год прочтения */}
                {!isWishlist ? (
                  <div className="space-y-4">
                    {/* Оценка во всю ширину */}
                    <Field label="Оценка (1–10)">
                      <div className="space-y-2">
                        <RatingPicker
                          value={form.rating}
                          onChange={(val) => update('rating', val)}
                          disabled={noRating}
                        />
                        <CustomCheckbox
                          checked={noRating}
                          onChange={(checked) => update('rating', checked ? null : 8)}
                          label="Без оценки"
                        />
                      </div>
                    </Field>

                    {/* Месяц и год прочтения */}
                    <Field label="Месяц и год прочтения">
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="relative">
                            <select
                              value={form.readMonth ?? ''}
                              disabled={noDate}
                              onChange={(event) => update('readMonth', event.target.value)}
                              className={`${inputClass} appearance-none pr-9 cursor-pointer ${
                                noDate ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-dashed' : ''
                              }`}
                            >
                              {MONTHS.map((month) => (
                                <option key={month.value} value={month.value}>
                                  {month.label}
                                </option>
                              ))}
                            </select>
                            <ChevronsUpDown
                              size={15}
                              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                          </div>

                          <div className="relative">
                            <select
                              value={form.readYear ?? ''}
                              disabled={noDate}
                              onChange={(event) => update('readYear', event.target.value)}
                              className={`${inputClass} appearance-none pr-9 cursor-pointer ${
                                noDate ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-dashed' : ''
                              }`}
                            >
                              {YEAR_OPTIONS.map((year) => (
                                <option key={year} value={year}>
                                  {year}
                                </option>
                              ))}
                            </select>
                            <ChevronsUpDown
                              size={15}
                              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                          </div>
                        </div>
                        <CustomCheckbox
                          checked={noDate}
                          onChange={(checked) => {
                            if (checked) {
                              setForm((prev) => ({ ...prev, readMonth: null, readYear: null }))
                            } else {
                              const now = new Date()
                              setForm((prev) => ({
                                ...prev,
                                readMonth: now.getMonth() + 1,
                                readYear: now.getFullYear(),
                              }))
                            }
                          }}
                          label="Без даты (не помню)"
                        />
                      </div>
                    </Field>
                  </div>
                ) : null}

                {/* 6. Жанры и теги (без лишних подсказок) */}
                <Field
                  label="Жанры и теги"
                  action={
                    (mode === 'manual' || isEdit) && genreMessage ? (
                      <span className="text-[11px] font-medium text-emerald-600 animate-pulse">
                        {genreMessage}
                      </span>
                    ) : null
                  }
                >
                  <TagMultiSelect
                    value={form.tags}
                    onChange={(value) => update('tags', value)}
                    options={tagOptions}
                    placeholder="Добавить жанр (Детектив, Классика...)"
                    onAutoDetect={mode === 'manual' || isEdit ? handleDetectGenres : undefined}
                    isDetecting={isDetectingGenres}
                    canAutoDetect={Boolean(form.title.trim())}
                  />
                </Field>

                {/* 7. Количество страниц (со стрелочками как у автора) */}
                <Field label="Количество страниц">
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={form.pages ?? ''}
                      onChange={(event) =>
                        update('pages', event.target.value ? Number(event.target.value) : null)
                      }
                      className={`${inputClass} pr-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                      placeholder="Например: 380"
                    />
                    <ChevronsUpDown
                      size={15}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                  </div>
                </Field>

                {/* 8. Свернутый блок: Отзыв и цитаты */}
                <div className="border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowNotes(!showNotes)}
                    className="flex w-full items-center justify-between py-1 text-left text-xs font-semibold text-gray-500 transition-colors hover:text-gray-900 select-none cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      {showNotes ? (
                        <Minus size={13} className="text-gray-500" strokeWidth={2.5} />
                      ) : (
                        <Plus size={13} className="text-gray-500" strokeWidth={2.5} />
                      )}
                      <span>Отзыв или цитаты (необязательно)</span>
                    </span>
                    <ChevronDown
                      size={15}
                      className={`text-gray-400 transition-transform duration-200 ${
                        showNotes ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {showNotes ? (
                    <div className="mt-3 space-y-4 pt-1">
                      <Field
                        label="Отзыв"
                        action={
                          <div className="flex items-center gap-1.5">
                            {/* Кнопка отмены улучшения (вернуть оригинал) */}
                            {rawReviewBackup ? (
                              <button
                                type="button"
                                onClick={handleRestoreRawReview}
                                title="Вернуть исходный надиктованный текст"
                                className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-200 active:scale-95 cursor-pointer"
                              >
                                <RotateCcw size={11} />
                                <span>Вернуть оригинал</span>
                              </button>
                            ) : null}

                            {/* Кнопка улучшения текста (AI) */}
                            <button
                              type="button"
                              disabled={isPolishing || !form.review?.trim()}
                              onClick={handlePolishReview}
                              title="Улучшить структуру и стиль отзыва"
                              className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-800 transition-all hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40 active:scale-95 cursor-pointer"
                            >
                              {isPolishing ? (
                                <>
                                  <Loader2 size={12} className="animate-spin text-gray-700" />
                                  <span>Улучшаем...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles size={12} className="text-gray-700" />
                                  <span>Улучшить</span>
                                </>
                              )}
                            </button>
                          </div>
                        }
                      >
                        <div className="relative">
                          <textarea
                            value={form.review}
                            onChange={(event) => update('review', event.target.value)}
                            rows={3}
                            className={`${inputClass} resize-y text-xs pr-11 transition-all ${
                              isRecording ? 'border-red-400 ring-2 ring-red-100' : ''
                            }`}
                            placeholder={
                              isRecording
                                ? 'Говорите... Идёт запись голоса в реальном времени'
                                : 'Наговорите отзыв голосом или напишите вручную...'
                            }
                          />

                          {/* Кнопка диктофона внутри поля (только иконка) */}
                          <button
                            type="button"
                            onClick={toggleRecording}
                            title={isRecording ? 'Остановить запись' : 'Надиктовать отзыв голосом'}
                            className={`absolute top-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-lg transition-all active:scale-95 cursor-pointer ${
                              isRecording
                                ? 'bg-red-500 text-white shadow-xs animate-pulse'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                            }`}
                          >
                            {isRecording ? (
                              <MicOff size={13} />
                            ) : (
                              <Mic size={13} />
                            )}
                          </button>
                        </div>
                      </Field>

                      <Field label="Любимые цитаты" hint="По одной цитате на строку">
                        <textarea
                          value={form.quotes}
                          onChange={(event) => update('quotes', event.target.value)}
                          rows={2}
                          className={`${inputClass} resize-y text-xs`}
                          placeholder="«Каждая цитата на отдельной строке...»"
                        />
                      </Field>
                    </div>
                  ) : null}
                </div>
              </>
            )}

            {error ? (
              <p className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-medium text-red-600">
                {error}
              </p>
            ) : null}
          </div>

          <footer className="flex shrink-0 items-center justify-between border-t border-gray-100 px-6 py-4 bg-white">
            {isEdit ? (
              <button
                type="button"
                onClick={() => onDelete(form.id)}
                className="inline-flex items-center gap-1.5 py-2 text-xs font-semibold text-red-500 transition-colors hover:text-red-600 active:scale-95 cursor-pointer"
              >
                <Trash2 size={15} />
                <span>Удалить книгу</span>
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 active:scale-95 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="rounded-xl bg-gray-900 px-6 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-gray-800 active:scale-95 cursor-pointer"
              >
                {isEdit ? 'Сохранить изменения' : 'Добавить книгу'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  )
}

function Field({ label, hint, action, required, children }) {
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
    </label>
  )
}

function RatingPicker({ value, onChange, disabled }) {
  const current = Number(value) || 0

  return (
    <div className={`flex flex-wrap items-center gap-1 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => {
        const isSelected = current === val
        const isPast = current >= val

        return (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isSelected
                ? 'bg-gray-900 text-white shadow-xs scale-105'
                : isPast
                  ? 'bg-gray-200 text-gray-800'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {val}
          </button>
        )
      })}
    </div>
  )
}

function CustomCheckbox({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-600 font-medium">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
      />
      <span>{label}</span>
    </label>
  )
}
