const NAV_ITEMS = [
  {
    id: 'library',
    label: 'Библиотека',
  },
  {
    id: 'dashboard',
    label: 'Дашборд',
  },
]

export function TopNav({ current, onNavigate }) {
  return (
    <header className="hidden lg:block fixed top-6 left-1/2 z-50 -translate-x-1/2">
      <nav
        aria-label="Основная навигация"
        className="flex h-13 items-center gap-1.5 rounded-full border border-gray-100/90 bg-white/95 p-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.08)] backdrop-blur-md"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = current === item.id

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex h-full items-center justify-center rounded-full px-5 text-xs font-bold transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </nav>
    </header>
  )
}
