import { ChartPie, LibraryBig } from 'lucide-react'

const ITEMS = [
  {
    id: 'library',
    label: 'Библиотека',
    description: 'Каталог книг и списки чтения',
    icon: LibraryBig,
  },
  {
    id: 'dashboard',
    label: 'Дашборд',
    description: 'Статистика, аналитика и цели',
    icon: ChartPie,
  },
]

export function SideNav({ current, onSelect }) {
  return (
    <aside
      aria-label="Основная навигация"
      className="fixed left-4 top-1/2 z-40 -translate-y-1/2 sm:left-6"
    >
      <nav className="flex flex-col items-center gap-4 rounded-[28px] bg-white p-3 shadow-[0_10px_40px_rgba(0,0,0,0.07)] border border-transparent transition-all duration-200 hover:shadow-[0_14px_48px_rgba(0,0,0,0.10)]">
        {ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = current === item.id

          return (
            <div key={item.id} className="group relative flex items-center">
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200 ${
                  isActive
                    ? 'text-gray-900 bg-gray-50'
                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <Icon size={24} strokeWidth={isActive ? 2 : 1.75} />
              </button>

              {/* Выплывающее меню с полным названием при ховере */}
              <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-3.5 -translate-y-1/2 opacity-0 -translate-x-2 transition-all duration-200 ease-out group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100">
                <div className="flex flex-col rounded-2xl border border-gray-100 bg-white/95 px-4 py-2.5 shadow-[0_12px_36px_rgba(0,0,0,0.12)] backdrop-blur whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tracking-tight text-gray-900">
                      {item.label}
                    </span>
                    {isActive ? (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        Активно
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs text-gray-400">{item.description}</span>
                </div>
              </div>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
