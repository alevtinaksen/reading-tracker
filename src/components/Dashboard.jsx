import { STATUS, formatReadPeriod } from '../constants'

const GENRE_COLORS = ['#84cc16', '#a78bfa', '#fb923c', '#38bdf8', '#f472b6', '#facc15']

export function Dashboard({ books }) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const finished = books.filter((book) => book.status === STATUS.read)
  const yearCount = finished.filter((book) => Number(book.readYear) === year).length
  const monthCount = finished.filter(
    (book) => Number(book.readYear) === year && Number(book.readMonth) === month,
  ).length
  const rated = books.filter((book) => Number(book.rating) > 0)
  const average =
    rated.length === 0
      ? '—'
      : (rated.reduce((sum, book) => sum + Number(book.rating), 0) / rated.length).toFixed(1)

  const genreMap = new Map()
  books.forEach((book) => {
    book.tags?.forEach((tag) => {
      genreMap.set(tag, (genreMap.get(tag) ?? 0) + 1)
    })
  })
  const genres = [...genreMap.entries()].sort((a, b) => b[1] - a[1])
  const maxGenre = genres[0]?.[1] ?? 1

  const stats = [
    {
      label: `За ${year}`,
      value: yearCount,
      hint: 'прочитано',
      className: 'bg-lime-300 text-lime-950',
    },
    {
      label: formatReadPeriod({ readMonth: month, readYear: year }) || 'Этот месяц',
      value: monthCount,
      hint: 'прочитано',
      className: 'bg-violet-300 text-violet-950',
    },
    {
      label: 'Средняя оценка',
      value: average,
      hint: `${rated.length} записей`,
      className: 'bg-amber-300 text-amber-950',
    },
    {
      label: 'В каталоге',
      value: books.length,
      hint: 'включая текущие',
      className: 'bg-sky-300 text-sky-950',
    },
  ]

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-stone-400">Обзор</p>
        <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-stone-950">Дашборд</h1>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className={`rounded-[2rem] px-5 py-6 shadow-[0_16px_40px_rgba(28,25,23,0.08)] ${stat.className}`}
          >
            <p className="text-sm font-semibold opacity-70">{stat.label}</p>
            <p className="mt-4 text-5xl font-extrabold tracking-tight">{stat.value}</p>
            <p className="mt-3 text-sm font-medium opacity-70">{stat.hint}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow-[0_16px_40px_rgba(28,25,23,0.08)] sm:p-7">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-extrabold tracking-tight text-stone-950">Жанры</h2>
          <p className="text-sm font-semibold text-stone-400">по тегам</p>
        </div>
        {genres.length === 0 ? (
          <p className="mt-8 text-sm text-stone-500">Нет тегов в каталоге.</p>
        ) : (
          <ul className="mt-8 space-y-4">
            {genres.map(([name, count], index) => (
              <li key={name}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
                    {name}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-stone-900">{count}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(10, (count / maxGenre) * 100)}%`,
                      background: GENRE_COLORS[index % GENRE_COLORS.length],
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
