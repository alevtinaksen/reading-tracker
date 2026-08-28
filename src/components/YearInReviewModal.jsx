import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen,
  Check,
  ChevronsUpDown,
  Copy,
  Download,
  Sparkles,
  Star,
  Trophy,
  X,
} from 'lucide-react'
import { toPng } from 'html-to-image'
import { STATUS } from '../constants'

function plural(n, one, few, many) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

export function YearInReviewModal({ books, defaultYear, onClose }) {
  const posterRef = useRef(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [coverBase64, setCoverBase64] = useState(null)

  const availableYears = useMemo(() => {
    const set = new Set(books.map((b) => Number(b.readYear)).filter(Boolean))
    set.add(new Date().getFullYear())
    return [...set].sort((a, b) => b - a)
  }, [books])

  const [selectedYear, setSelectedYear] = useState(defaultYear || availableYears[0])
  const [copied, setCopied] = useState(false)

  const yearBooks = useMemo(
    () => books.filter((b) => b.status === STATUS.read && Number(b.readYear) === selectedYear),
    [books, selectedYear],
  )

  const totalBooks = yearBooks.length
  const totalPages = yearBooks.reduce((sum, b) => sum + (Number(b.pages) || 0), 0)

  const ratedBooks = yearBooks.filter((b) => Number(b.rating) > 0)
  const avgRating =
    ratedBooks.length > 0
      ? (ratedBooks.reduce((sum, b) => sum + Number(b.rating), 0) / ratedBooks.length).toFixed(1)
      : '—'

  // Лучшая книга года (по рейтингу)
  const bestBook = useMemo(() => {
    if (ratedBooks.length === 0) return yearBooks[0] || null
    return [...ratedBooks].sort((a, b) => Number(b.rating) - Number(a.rating))[0]
  }, [ratedBooks, yearBooks])

  // Предзагрузка обложки в base64 для 100% надежного скачивания картинки (без CORS-ошибок)
  useEffect(() => {
    let cancelled = false
    setCoverBase64(null)

    if (bestBook?.coverUrl) {
      fetch(bestBook.coverUrl)
        .then((res) => (res.ok ? res.blob() : null))
        .then((blob) => {
          if (!blob || cancelled) return
          const reader = new FileReader()
          reader.onloadend = () => {
            if (!cancelled) setCoverBase64(reader.result)
          }
          reader.readAsDataURL(blob)
        })
        .catch(() => {})
    }

    return () => {
      cancelled = true
    }
  }, [bestBook?.coverUrl])

  // Топ автор года
  const topAuthor = useMemo(() => {
    const map = new Map()
    yearBooks.forEach((b) => {
      if (!b.author) return
      map.set(b.author, (map.get(b.author) || 0) + 1)
    })
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1])
    return sorted[0] ? { name: sorted[0][0], count: sorted[0][1] } : null
  }, [yearBooks])

  // Главный жанр года
  const topGenre = useMemo(() => {
    const map = new Map()
    yearBooks.forEach((b) => {
      b.tags?.forEach((t) => {
        const cleanTag = t.replace(/^#/, '').trim()
        if (cleanTag) {
          map.set(cleanTag, (map.get(cleanTag) || 0) + 1)
        }
      })
    })
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1])
    return sorted[0] ? { name: sorted[0][0], count: sorted[0][1] } : null
  }, [yearBooks])

  function handleCopySummary() {
    const genreName = topGenre?.name?.replace(/^#/, '')
    const text = [
      `📖 Мои книжные итоги за ${selectedYear} год!`,
      `• Прочитано книг: ${totalBooks}`,
      totalPages > 0 ? `• Прочитано страниц: ${totalPages.toLocaleString('ru-RU')}` : null,
      avgRating !== '—' ? `• Средняя оценка: ${avgRating} / 10 ★` : null,
      topGenre ? `• Любимый жанр: ${genreName}` : null,
      topAuthor ? `• Любимый автор: ${topAuthor.name} (${topAuthor.count} ${plural(topAuthor.count, 'книга', 'книги', 'книг')})` : null,
      bestBook ? `• Книга года: «${bestBook.title}» (${bestBook.author})` : null,
    ]
      .filter(Boolean)
      .join('\n')

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDownloadImage() {
    if (!posterRef.current) return
    try {
      setIsDownloading(true)
      const dataUrl = await toPng(posterRef.current, {
        cacheBust: false,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        skipFonts: true,
      })

      if (dataUrl) {
        const link = document.createElement('a')
        link.download = `Книжные_итоги_${selectedYear}_Alevtina.png`
        link.href = dataUrl
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (err) {
      console.warn('Export retry fallback:', err)
      try {
        const dataUrl = await toPng(posterRef.current, {
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          skipFonts: true,
          filter: (node) => node.tagName !== 'IMG' || node.src?.startsWith('data:'),
        })
        if (dataUrl) {
          const link = document.createElement('a')
          link.download = `Книжные_итоги_${selectedYear}_Alevtina.png`
          link.href = dataUrl
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
      } catch (finalErr) {
        console.error('Final image export error:', finalErr)
      }
    } finally {
      setIsDownloading(false)
    }
  }

  const cleanGenreName = topGenre?.name?.replace(/^#/, '')

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center overflow-y-auto bg-black/50 p-0 sm:p-4 backdrop-blur-xs transition-opacity"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg flex flex-col overflow-hidden rounded-t-[32px] sm:rounded-[32px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.22)] max-h-[92vh] sm:max-h-[88vh] animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 duration-200"
      >
        {/* Индикатор свайпа для мобильных */}
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-gray-300 sm:hidden" />
        <header className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-white shrink-0">
              <Sparkles size={14} />
            </div>
            <h2 className="text-base font-bold tracking-tight text-gray-900">Итоги года</h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="appearance-none rounded-xl border border-gray-200 bg-white py-1 pl-3 pr-7 text-xs font-bold text-gray-800 outline-none cursor-pointer"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y} год
                  </option>
                ))}
              </select>
              <ChevronsUpDown
                size={12}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>

            <button
              type="button"
              aria-label="Закрыть"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Инфографический постер итогов года */}
        <div className="overflow-y-auto p-6 sm:p-7 space-y-4">
          <div ref={posterRef} className="rounded-[28px] bg-[#F9FAFB] p-5 sm:p-6">
            {/* Шапка карточки */}
            <div className="flex items-center justify-between pb-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 leading-tight">
                  КНИЖНАЯ СТАТИСТИКА
                </span>
                <h3 className="text-2xl font-extrabold tracking-tight text-gray-900 leading-tight mt-0.5">
                  {selectedYear} год
                </h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-900 shrink-0">
                <Trophy size={18} strokeWidth={2} />
              </div>
            </div>

            {/* 4 гармоничные карточки в единой сетке 2x2 с отступом ровно 4px (gap-1) */}
            <div className="mt-2 grid grid-cols-2 gap-1">
              {/* Карточка 1: Прочитано */}
              <div className="flex flex-col justify-between rounded-2xl bg-white p-4 min-h-[96px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 truncate">
                  ПРОЧИТАНО
                </span>
                <div className="mt-2">
                  <p className="text-3xl font-extrabold text-gray-900 tracking-tight leading-none">{totalBooks}</p>
                  <p className="mt-1 text-xs font-medium text-gray-400 truncate">{plural(totalBooks, 'книга за год', 'книги за год', 'книг за год')}</p>
                </div>
              </div>

              {/* Карточка 2: Страниц */}
              <div className="flex flex-col justify-between rounded-2xl bg-white p-4 min-h-[96px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 truncate">
                  СТРАНИЦ
                </span>
                <div className="mt-2">
                  <p className="text-3xl font-extrabold text-gray-900 tracking-tight leading-none">
                    {totalPages > 0 ? totalPages.toLocaleString('ru-RU') : '0'}
                  </p>
                  <p className="mt-1 text-xs font-medium text-gray-400 truncate">прочитано страниц</p>
                </div>
              </div>

              {/* Карточка 3: Средний балл */}
              <div className="flex flex-col justify-between rounded-2xl bg-white p-4 min-h-[96px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 truncate">
                  СРЕДНИЙ БАЛЛ
                </span>
                <div className="mt-2">
                  <p className="text-3xl font-extrabold text-gray-900 tracking-tight leading-none">{avgRating}</p>
                  <p className="mt-1 text-xs font-medium text-gray-400 truncate">из 10 ★</p>
                </div>
              </div>

              {/* Карточка 4: Любимый жанр */}
              <div className="flex flex-col justify-between rounded-2xl bg-white p-4 min-h-[96px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 truncate">
                  ЛЮБИМЫЙ ЖАНР
                </span>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight leading-tight truncate">
                    {cleanGenreName || '—'}
                  </p>
                  <p className="mt-1 text-xs font-medium text-gray-400 truncate">
                    {topGenre ? `${topGenre.count} ${plural(topGenre.count, 'книга', 'книги', 'книг')}` : 'нет данных'}
                  </p>
                </div>
              </div>
            </div>

            {/* Карточка 5: Любимый автор */}
            {topAuthor ? (
              <div className="mt-1 flex flex-col justify-between rounded-2xl bg-white p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 truncate">
                  ЛЮБИМЫЙ АВТОР
                </span>
                <div className="mt-2 flex items-baseline justify-between gap-2">
                  <p className="text-base sm:text-lg font-extrabold text-gray-900 truncate">
                    {topAuthor.name}
                  </p>
                  <span className="text-xs font-bold text-gray-400 shrink-0">
                    {topAuthor.count} {plural(topAuthor.count, 'книга за год', 'книги за год', 'книг за год')}
                  </span>
                </div>
              </div>
            ) : null}

            {/* Карточка 6: Главная книга года — стиль каталога */}
            {bestBook ? (
              <div className="mt-1 flex items-center gap-4 rounded-2xl bg-white p-4">
                {bestBook.coverUrl ? (
                  <img
                    src={coverBase64 || bestBook.coverUrl}
                    alt={bestBook.title}
                    className="w-18 sm:w-20 aspect-[2/3] shrink-0 rounded-xl object-cover shadow-2xs bg-gray-100"
                  />
                ) : (
                  <div className="w-18 sm:w-20 aspect-[2/3] shrink-0 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                    <BookOpen size={24} />
                  </div>
                )}
                <div className="min-w-0 flex-1 py-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      КНИГА ГОДА
                    </span>
                    {bestBook.rating ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-900 px-2 py-0.5 text-[11px] font-bold text-white shrink-0">
                        <Star size={10} className="fill-white text-white" />
                        <span>{bestBook.rating}</span>
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm sm:text-base font-extrabold text-gray-900 line-clamp-2 leading-snug">
                    {bestBook.title}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-gray-500 truncate">
                    {bestBook.author || 'Автор не указан'}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {bestBook.pages ? (
                      <span className="inline-flex items-center rounded-lg bg-gray-50 px-2.5 py-1 text-[10px] font-bold text-gray-600">
                        {bestBook.pages} стр.
                      </span>
                    ) : null}
                    {bestBook.tags && bestBook.tags[0] ? (
                      <span className="inline-flex items-center rounded-lg bg-gray-50 px-2.5 py-1 text-[10px] font-bold text-gray-600">
                        {bestBook.tags[0].replace(/^#/, '')}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Кнопки действий: слева Secondary (Скопировать текст), справа Primary (Скачать картинку) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3.5 text-xs font-bold text-gray-800 transition-all hover:bg-gray-50 active:scale-95 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check size={15} strokeWidth={2.5} className="text-gray-900" />
                  <span>Скопировано!</span>
                </>
              ) : (
                <>
                  <Copy size={15} strokeWidth={2} className="text-gray-600" />
                  <span>Скопировать текст</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isDownloading}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gray-900 py-3.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-gray-800 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Download size={15} strokeWidth={2.5} />
              <span>{isDownloading ? 'Сохранение...' : 'Скачать картинку'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
