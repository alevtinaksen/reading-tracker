import { useMemo, useState } from 'react'
import {
  BookOpen,
  Check,
  ChevronsUpDown,
  Copy,
  Sparkles,
  Star,
  Trophy,
  X,
} from 'lucide-react'
import { STATUS } from '../constants'

function plural(n, one, few, many) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

export function YearInReviewModal({ books, defaultYear, onClose }) {
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
        map.set(t, (map.get(t) || 0) + 1)
      })
    })
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1])
    return sorted[0] ? { name: sorted[0][0], count: sorted[0][1] } : null
  }, [yearBooks])

  function handleCopySummary() {
    const text = [
      `📖 Мои книжные итоги за ${selectedYear} год!`,
      `• Прочитано книг: ${totalBooks}`,
      totalPages > 0 ? `• Прочитано страниц: ${totalPages.toLocaleString('ru-RU')}` : null,
      avgRating !== '—' ? `• Средняя оценка: ${avgRating} / 10 ★` : null,
      topAuthor ? `• Любимый автор: ${topAuthor.name} (${topAuthor.count} ${plural(topAuthor.count, 'книга', 'книги', 'книг')})` : null,
      topGenre ? `• Главный жанр: #${topGenre.name}` : null,
      bestBook ? `• Книга года: «${bestBook.title}» (${bestBook.author})` : null,
    ]
      .filter(Boolean)
      .join('\n')

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-white">
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
        <div className="p-6 sm:p-7">
          <div className="rounded-[24px] bg-[#111827] p-6 text-white shadow-lg">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                  READING LOG SUMMARY
                </span>
                <h3 className="text-2xl font-black tracking-tight">{selectedYear} ГОД</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white">
                <Trophy size={20} />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-white/5 p-3.5 border border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Прочитано
                </span>
                <p className="mt-1 text-3xl font-black">{totalBooks}</p>
                <p className="text-[11px] text-gray-400">{plural(totalBooks, 'книга', 'книги', 'книг')}</p>
              </div>

              <div className="rounded-2xl bg-white/5 p-3.5 border border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Средний балл
                </span>
                <p className="mt-1 text-3xl font-black">{avgRating}</p>
                <p className="text-[11px] text-gray-400">из 10 ★</p>
              </div>
            </div>

            {totalPages > 0 ? (
              <div className="mt-2.5 rounded-2xl bg-white/5 p-3.5 border border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Общий объём
                  </span>
                  <p className="text-lg font-black">{totalPages.toLocaleString('ru-RU')} страниц</p>
                </div>
                <BookOpen size={20} className="text-gray-500" />
              </div>
            ) : null}

            {/* Топ автор и Топ жанр */}
            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              {topAuthor ? (
                <div className="rounded-2xl bg-white/5 p-3 border border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Автор года
                  </span>
                  <p className="mt-1 text-xs font-bold truncate">{topAuthor.name}</p>
                  <p className="text-[10px] text-gray-400">{topAuthor.count} {plural(topAuthor.count, 'книга', 'книги', 'книг')}</p>
                </div>
              ) : null}

              {topGenre ? (
                <div className="rounded-2xl bg-white/5 p-3 border border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Любимый жанр
                  </span>
                  <p className="mt-1 text-xs font-bold truncate">#{topGenre.name}</p>
                  <p className="text-[10px] text-gray-400">{topGenre.count} {plural(topGenre.count, 'книга', 'книги', 'книг')}</p>
                </div>
              ) : null}
            </div>

            {/* Книга года */}
            {bestBook ? (
              <div className="mt-2.5 rounded-2xl bg-white/5 p-3.5 border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Главная книга года
                  </span>
                  {bestBook.rating ? (
                    <span className="inline-flex items-center gap-0.5 text-xs font-bold text-white">
                      <Star size={11} className="fill-white" />
                      <span>{bestBook.rating}</span>
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm font-extrabold truncate">{bestBook.title}</p>
                <p className="text-xs text-gray-400 truncate">{bestBook.author}</p>
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gray-900 py-3 text-xs font-bold text-white shadow-xs transition-all hover:bg-gray-800 active:scale-95 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check size={15} />
                  <span>Скопировано в буфер!</span>
                </>
              ) : (
                <>
                  <Copy size={15} />
                  <span>Скопировать текст итогов</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
