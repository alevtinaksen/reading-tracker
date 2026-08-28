import { useEffect, useRef, useState } from 'react'
import {
  BookMarked,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  Circle,
  Headphones,
  Link2,
  Loader2,
  Mic,
  MicOff,
  Minus,
  PenLine,
  Plus,
  RotateCcw,
  Sparkles,
  Tablet,
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
  const [error, setError] = useState('')

  const [mode, setMode] = useState(isEdit ? 'manual' : 'url')
  const [importUrl, setImportUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState(false)

  const [isDetectingGenres, setIsDetectingGenres] = useState(false)
  const [genreMessage, setGenreMessage] = useState('')

  const [isRecording, setIsRecording] = useState(false)
  const [isPolishing, setIsPolishing] = useState(false)
  const [rawReviewBackup, setRawReviewBackup] = useState(null)
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
    setRawReviewBackup(null)
    setIsPolishing(false)
    const init = book ?? EMPTY_BOOK
    setForm(init)
    initialFormRef.current = init
    setError('')
    setImportUrl('')
    setImportError('')
    setImportSuccess(false)
    setGenreMessage('')
    setMode(book?.id ? 'manual' : 'url')
    setShowNotes(Boolean(book?.review || book?.quotes))
    setShowConfirmClose(false)
  }, [book])

  useEffect(() => {
    return () => { if (recognitionRef.current) try { recognitionRef.current.stop() } catch {} }
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

  function update(field, val) {
    setForm((prev) => ({ ...prev, [field]: val }))
  }

  async function handleImportFromUrl() {
    if (!importUrl.trim()) {
      setImportError('Введите ссылку на книгу')
      return
    }
    setIsImporting(true)
    setImportError('')
    try {
      const data = await fetchBookMetadataFromUrl(importUrl.trim())
      setForm((prev) => ({
        ...prev,
        title: data.title || prev.title,
        author: stripPatronymic(data.author || prev.author),
        coverUrl: data.coverUrl || prev.coverUrl,
        format: data.format || prev.format || 'paper',
        tags: data.tags?.length ? [...new Set([...prev.tags, ...data.tags])] : prev.tags,
        pages: data.pages || prev.pages,
      }))
      setImportSuccess(true)
    } catch (err) {
      setImportError(err.message || 'Не удалось получить данные по этой ссылке. Попробуйте заполнить вручную.')
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
        setForm((prev) => ({ ...prev, tags: [...new Set([...(prev.tags || []), ...found])] }))
        setGenreMessageType('success')
        setGenreMessage(`Определено: +${found.length}`)
        setTimeout(() => setGenreMessage(''), 3500)
      } else {
        setGenreMessageType('warning')
        setGenreMessage('Жанры не найдены')
        setTimeout(() => setGenreMessage(''), 3500)
      }
    } catch (err) {
      console.error(err)
      setGenreMessageType('error')
      setGenreMessage('Не удалось определить жанры')
      setTimeout(() => setGenreMessage(''), 3500)
    } finally {
      setIsDetectingGenres(false)
    }
  }

  function toggleRecording() {
    if (isRecording) {
      try { recognitionRef.current?.stop() } catch {}
      setIsRecording(false)
      return
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('Голосовой ввод не поддерживается')
      return
    }
    try {
      const recognition = new SpeechRecognition()
      recognition.lang = 'ru-RU'
      recognition.continuous = true
      recognition.interimResults = true
      let baseText = form.review ? form.review.trim() + ' ' : ''
      recognition.onresult = (event) => {
        let interim = '', final = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) final += event.results[i][0].transcript
          else interim += event.results[i][0].transcript
        }
        if (final) { baseText += final + ' '; update('review', baseText) }
        else if (interim) update('review', baseText + interim)
      }
      recognition.onerror = (event) => { setIsRecording(false) }
      recognition.onend = () => { setIsRecording(false) }
      recognition.start()
      recognitionRef.current = recognition
      setIsRecording(true)
    } catch (err) {
      setError('Не удалось запустить диктофон')
      setIsRecording(false)
    }
  }

  async function handlePolishReview() {
    if (!form.review || !form.review.trim() || isPolishing) return
    setIsPolishing(true)
    setRawReviewBackup(form.review)
    try {
      const polished = await polishReviewText(form.review)
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
    if (event) event.preventDefault()
    if (!form.title.trim()) { setError('Укажите название книги'); return }
    const bookToSave = {
      ...form,
      title: form.title.trim(),
      author: stripPatronymic(form.author.trim()),
      coverUrl: form.coverUrl.trim(),
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

  const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-gray-900 focus:ring-1 focus:ring-gray-900'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center overflow-y-auto bg-black/50 p-0 sm:p-4 backdrop-blur-xs transition-opacity duration-200" onPointerDown={(event) => { if (event.target === event.currentTarget) handleAttemptClose() }}>
      <div role="dialog" aria-modal="true" className="relative w-full max-w-xl flex flex-col overflow-hidden rounded-t-[32px] sm:rounded-[28px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] max-h-[92vh] sm:max-h-[88vh] animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 duration-200">
        
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
                  onClick={(e) => { setShowConfirmClose(false); handleSubmit(e) }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 py-3.5 text-xs font-bold text-white transition-all hover:bg-gray-800 active:scale-95 cursor-pointer shadow-xs"
                >
                  <Check size={14} strokeWidth={2.5} />
                  <span>Сохранить изменения</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setShowConfirmClose(false); onClose() }}
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

        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-gray-300 sm:hidden" />
        <header className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-800 shrink-0"><BookMarked size={20} /></div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-gray-900 line-clamp-2">{isEdit ? (form.title || 'Параметры книги') : 'Новая книга'}</h2>
              <p className="text-xs text-gray-400">{isEdit ? 'Измените параметры книги' : 'Добавление книги в коллекцию'}</p>
            </div>
          </div>
          <button type="button" aria-label="Закрыть" onClick={handleAttemptClose} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 cursor-pointer"><X size={18} /></button>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 px-6 py-5 overscroll-contain">
            {!isEdit ? (
              <div className="flex rounded-xl bg-gray-100 p-1">
                <button type="button" onClick={() => setMode('url')} className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${mode === 'url' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}><Link2 size={14} /><span>По ссылке</span></button>
                <button type="button" onClick={() => setMode('manual')} className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${mode === 'manual' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}><PenLine size={14} /><span>Вручную</span></button>
              </div>
            ) : null}

            {mode === 'url' && !importSuccess && !isEdit ? (
              <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 transition-all">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-gray-900"><Link2 size={15} className="text-gray-500" /><span>Вставьте ссылку на книгу</span></div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input type="url" value={importUrl} onChange={(e) => setImportUrl(e.target.value)} placeholder="https://..." className={`${inputClass} text-xs`} />
                  <button type="button" disabled={isImporting} onClick={handleImportFromUrl} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gray-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-gray-800 disabled:opacity-50 cursor-pointer">
                    {isImporting ? <Loader2 size={14} className="animate-spin" /> : 'Заполнить'}
                  </button>
                </div>
                {importError && <p className="mt-3 text-xs font-medium text-red-500">{importError}</p>}
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Название книги" required><input value={form.title} onChange={(e) => update('title', e.target.value)} className={inputClass} placeholder="Например: Снеговик" /></Field>
                  <Field label="Автор" required><AuthorCombobox value={form.author} onChange={(v) => update('author', v)} existingAuthors={uniqueAuthors(books)} inputClass={inputClass} placeholder="Например: Ю Несбё" /></Field>
                </div>
                <Field label="Ссылка на обложку"><div className="relative"><input value={form.coverUrl} onChange={(e) => update('coverUrl', e.target.value)} className={`${inputClass} pl-10`} placeholder="https://..." /><Link2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" /></div></Field>
                <Field label="Статус книги">
                  <div className="flex flex-wrap items-center gap-2">
                    {STATUS_CHIPS.map((option) => {
                      const active = form.status === option.value
                      return (
                        <button key={option.value} type="button" onClick={() => update('status', option.value)} className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${active ? 'bg-gray-900 text-white shadow-xs' : 'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'}`}>
                          <span className={`h-2 w-2 rounded-full shrink-0 ${option.dot}`} /><span>{option.label}</span>
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
                            <button key={option.value} type="button" onClick={() => update('format', option.value)} className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${active ? 'bg-gray-900 text-white shadow-xs' : 'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'}`}>
                              <Icon size={14} strokeWidth={1.8} /><span>{option.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </Field>
                    <Field label="Оценка">
                      <div className="space-y-3 pb-1">
                        <RatingPicker value={form.rating} onChange={(v) => update('rating', v)} disabled={noRating} />
                        <div className="pt-1"><CustomCheckbox checked={noRating} onChange={(c) => update('rating', c ? null : 8)} label="Без оценки" /></div>
                      </div>
                    </Field>
                    <Field label="Месяц и год прочтения">
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <select value={form.readMonth ?? ''} disabled={noDate} onChange={(e) => update('readMonth', e.target.value)} className={`${inputClass} appearance-none pr-9 cursor-pointer`}>{MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
                          <select value={form.readYear ?? ''} disabled={noDate} onChange={(e) => update('readYear', e.target.value)} className={`${inputClass} appearance-none pr-9 cursor-pointer`}>{YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}</select>
                        </div>
                        <CustomCheckbox checked={noDate} onChange={(c) => { if (c) setForm(prev => ({ ...prev, readMonth: null, readYear: null })); else { const d = new Date(); update('readMonth', d.getMonth() + 1); update('readYear', d.getFullYear()); } }} label="Без даты" />
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
                            : genreMessageType === 'warning'
                              ? 'text-amber-600'
                              : 'text-red-500'
                        }`}
                      >
                        {genreMessage}
                      </span>
                    ) : null
                  }
                >
                  <TagMultiSelect value={form.tags} onChange={(v) => update('tags', v)} options={tagOptions} onAutoDetect={mode === 'manual' || isEdit ? handleDetectGenres : undefined} isDetecting={isDetectingGenres} canAutoDetect={Boolean(form.title.trim())} />
                </Field>
                <Field label="Количество страниц">
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={form.pages ?? ''}
                      onChange={(e) => update('pages', e.target.value ? Number(e.target.value) : null)}
                      className={`${inputClass} pr-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                      placeholder="Например: 380"
                    />
                    <ChevronsUpDown
                      size={16}
                      className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-400"
                    />
                  </div>
                </Field>
                <div className="border-t border-gray-100 pt-3">
                  <button type="button" onClick={() => setShowNotes(!showNotes)} className="flex w-full items-center justify-between py-1 text-xs font-semibold text-gray-500 hover:text-gray-900 cursor-pointer">
                    <span className="flex items-center gap-1.5">{showNotes ? <Minus size={13} /> : <Plus size={13} />}<span>Отзыв или цитаты</span></span>
                    <ChevronDown size={15} className={`transition-transform duration-200 ${showNotes ? 'rotate-180' : ''}`} />
                  </button>
                  {showNotes && (
                    <div className="mt-3 space-y-4 pt-1">
                      <Field label="Отзыв">
                        <div className="relative">
                          <textarea value={form.review} onChange={(e) => update('review', e.target.value)} rows={3} className={`${inputClass} pr-32 ${isRecording ? 'border-red-400 ring-2 ring-red-100' : ''}`} placeholder="Напишите или надиктуйте..." />
                          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                            {rawReviewBackup && <button type="button" onClick={handleRestoreRawReview} className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all cursor-pointer"><RotateCcw size={13} /></button>}
                            <button type="button" disabled={isPolishing || !form.review?.trim()} onClick={handlePolishReview} className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-900 disabled:opacity-35 transition-all cursor-pointer">
                              {isPolishing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                            </button>
                            <button type="button" onClick={toggleRecording} className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all cursor-pointer ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100'}`}>{isRecording ? <MicOff size={13} /> : <Mic size={13} />}</button>
                          </div>
                        </div>
                      </Field>
                      <Field label="Любимые цитаты"><textarea value={form.quotes} onChange={(e) => update('quotes', e.target.value)} rows={2} className={inputClass} placeholder="По одной на строку..." /></Field>
                    </div>
                  )}
                </div>
              </>
            )}
            {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-medium text-red-600">{error}</p>}
          </div>
          <footer className="flex shrink-0 items-center justify-between border-t border-gray-100 px-4 py-3 sm:px-6 sm:py-4 bg-white">
            {isEdit ? (
              <button
                type="button"
                onClick={() => onDelete(form.id)}
                className="inline-flex items-center gap-1 py-2 text-xs font-semibold text-red-500 transition-colors hover:text-red-600 active:scale-95 cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Удалить</span>
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAttemptClose}
                className="rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 active:scale-95 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="rounded-xl bg-gray-900 px-5 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-gray-800 active:scale-95 cursor-pointer"
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
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-gray-500 hover:text-gray-900 transition-colors group"
    >
      <div
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-all ${
          checked
            ? 'border-gray-900 bg-gray-900 text-white shadow-2xs'
            : 'border-gray-300 bg-white group-hover:border-gray-400'
        }`}
      >
        {checked ? <Check size={11} strokeWidth={3} /> : null}
      </div>
      <span className="font-medium">{label}</span>
    </button>
  )
}
