import { useRef, useState } from 'react'
import {
  Download,
  FileCode,
  FileSpreadsheet,
  FileText,
  Loader2,
  Upload,
  X,
} from 'lucide-react'
import { formatLabel, statusLabel } from '../constants'

export function BackupModal({ books, onImportBooks, onClose }) {
  const [importStatus, setImportStatus] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef(null)

  const dateStr = new Date().toISOString().split('T')[0]

  // 1. Экспорт в JSON
  function exportJson() {
    const dataStr = JSON.stringify(books, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    downloadBlob(blob, `reading-log-${dateStr}.json`)
  }

  // 2. Экспорт в CSV (с UTF-8 BOM для корректного открытия в Excel)
  function exportCsv() {
    const headers = ['Название', 'Автор', 'Статус', 'Оценка', 'Формат', 'Страниц', 'Месяц', 'Год', 'Жанры', 'Отзыв', 'Цитаты']
    const rows = books.map((b) => [
      escapeCsv(b.title),
      escapeCsv(b.author),
      escapeCsv(statusLabel(b.status)),
      b.rating ?? '',
      escapeCsv(formatLabel(b.format)),
      b.pages ?? '',
      b.readMonth ?? '',
      b.readYear ?? '',
      escapeCsv((b.tags || []).join(', ')),
      escapeCsv(b.review),
      escapeCsv(b.quotes),
    ])

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(blob, `reading-log-${dateStr}.csv`)
  }

  // 3. Экспорт в Markdown для Obsidian
  function exportMarkdown() {
    const mdLines = [
      '# 📚 Моя книжная коллекция',
      `*Экспортировано: ${dateStr} | Всего книг: ${books.length}*\n`,
      '---',
    ]

    books.forEach((book, idx) => {
      mdLines.push(`## ${idx + 1}. ${book.title}`)
      if (book.author) mdLines.push(`**Автор:** ${book.author}`)
      mdLines.push(`**Статус:** ${statusLabel(book.status)} | **Формат:** ${formatLabel(book.format)}`)
      if (book.rating) mdLines.push(`**Оценка:** ${book.rating} / 10 ★`)
      if (book.pages) mdLines.push(`**Страниц:** ${book.pages}`)
      if (book.readMonth && book.readYear) mdLines.push(`**Прочитано:** ${book.readMonth}.${book.readYear}`)
      if (book.tags?.length) mdLines.push(`**Теги:** #${book.tags.join(' #')}`)
      if (book.review) mdLines.push(`\n### 📝 Отзыв\n${book.review}`)
      if (book.quotes) mdLines.push(`\n### 💬 Цитаты\n${book.quotes.split('\n').map((q) => `> ${q}`).join('\n')}`)
      mdLines.push('\n---')
    })

    const blob = new Blob([mdLines.join('\n')], { type: 'text/markdown;charset=utf-8;' })
    downloadBlob(blob, `reading-log-obsidian-${dateStr}.md`)
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function escapeCsv(str) {
    if (!str) return '""'
    const clean = String(str).replace(/"/g, '""')
    return `"${clean}"`
  }

  // Обработка загрузки файла JSON
  function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setImportStatus('')

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result)
        if (!Array.isArray(imported)) {
          throw new Error('Файл должен содержать массив книг')
        }

        const validBooks = imported.filter((b) => b && typeof b === 'object' && b.title)
        if (validBooks.length === 0) {
          throw new Error('В файле не найдено корректных книг')
        }

        onImportBooks(validBooks)
        setImportStatus(`Успешно импортировано: ${validBooks.length} книг`)
        setTimeout(() => {
          onClose()
        }, 1200)
      } catch (err) {
        setImportStatus(`Ошибка: ${err.message || 'Не удалось прочитать JSON'}`)
      } finally {
        setIsImporting(false)
      }
    }
    reader.readAsText(file)
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
        className="w-full max-w-lg flex flex-col overflow-hidden rounded-t-[32px] sm:rounded-[28px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 duration-200"
      >
        {/* Индикатор свайпа для мобильных */}
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-gray-300 sm:hidden" />
        <header className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-800">
              <Download size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-gray-900">
                Резервная копия и экспорт
              </h2>
              <p className="text-xs text-gray-400">Сохранение и восстановление коллекции</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
          >
            <X size={18} />
          </button>
        </header>

        <div className="space-y-4 p-6">
          {/* Блок экспорта */}
          <div>
            <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-gray-400">
              Экспорт ({books.length} книг)
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={exportJson}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5 text-center transition-all hover:bg-gray-100 hover:scale-102 active:scale-95 cursor-pointer"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-900 shadow-xs">
                  <FileCode size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">JSON Бэкап</p>
                  <p className="text-[10px] text-gray-400">Полная база</p>
                </div>
              </button>

              <button
                type="button"
                onClick={exportCsv}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5 text-center transition-all hover:bg-gray-100 hover:scale-102 active:scale-95 cursor-pointer"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-900 shadow-xs">
                  <FileSpreadsheet size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">Excel / CSV</p>
                  <p className="text-[10px] text-gray-400">Таблица</p>
                </div>
              </button>

              <button
                type="button"
                onClick={exportMarkdown}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5 text-center transition-all hover:bg-gray-100 hover:scale-102 active:scale-95 cursor-pointer"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-900 shadow-xs">
                  <FileText size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">Obsidian (MD)</p>
                  <p className="text-[10px] text-gray-400">Второй мозг</p>
                </div>
              </button>
            </div>
          </div>

          {/* Блок импорта */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-gray-400">
              Восстановление из файла
            </h3>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              disabled={isImporting}
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-5 text-center transition-all hover:border-gray-900 hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <Loader2 size={18} className="animate-spin text-gray-700" />
              ) : (
                <Upload size={18} className="text-gray-500" />
              )}
              <span className="text-xs font-bold text-gray-800">
                {isImporting ? 'Импортируем книги...' : 'Загрузить JSON файл'}
              </span>
            </button>

            {importStatus ? (
              <p className={`mt-2.5 text-center text-xs font-semibold ${importStatus.startsWith('Ошибка') ? 'text-red-500' : 'text-emerald-600'}`}>
                {importStatus}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
