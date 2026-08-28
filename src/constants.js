export const STATUS = {
  wantToRead: 'want_to_read',
  reading: 'reading',
  read: 'read',
  abandoned: 'abandoned',
}

export const STATUS_OPTIONS = [
  { value: STATUS.wantToRead, label: 'Хочу прочитать' },
  { value: STATUS.reading, label: 'В процессе' },
  { value: STATUS.read, label: 'Прочитано' },
  { value: STATUS.abandoned, label: 'Брошено' },
]

export const FORMAT = {
  paper: 'paper',
  audio: 'audio',
  ebook: 'ebook',
}

export const FORMAT_OPTIONS = [
  { value: FORMAT.paper, label: 'Бумага' },
  { value: FORMAT.audio, label: 'Аудио' },
  { value: FORMAT.ebook, label: 'Электронная' },
]

export const TAG_OPTIONS = [
  'Детектив',
  'Триллер',
  'Криминальная проза',
  'Профлитература',
  'Классика',
]

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Сначала новые' },
  { value: 'oldest', label: 'Сначала старые' },
  { value: 'author', label: 'По автору (А–Я)' },
  { value: 'title', label: 'По названию (А–Я)' },
  { value: 'rating', label: 'По высшей оценке' },
]

export const MONTHS = [
  { value: 1, label: 'Январь' },
  { value: 2, label: 'Февраль' },
  { value: 3, label: 'Март' },
  { value: 4, label: 'Апрель' },
  { value: 5, label: 'Май' },
  { value: 6, label: 'Июнь' },
  { value: 7, label: 'Июль' },
  { value: 8, label: 'Август' },
  { value: 9, label: 'Сентябрь' },
  { value: 10, label: 'Октябрь' },
  { value: 11, label: 'Ноябрь' },
  { value: 12, label: 'Декабрь' },
]

export const YEAR_OPTIONS = Array.from({ length: 12 }, (_, index) => 2018 + index)

export const EMPTY_BOOK = {
  title: '',
  author: '',
  coverUrl: '',
  rating: null,
  status: STATUS.read,
  format: FORMAT.paper,
  tags: [],
  pages: null,
  readMonth: new Date().getMonth() + 1,
  readYear: new Date().getFullYear(),
  review: '',
  quotes: '',
}

export function statusLabel(value) {
  return STATUS_OPTIONS.find((item) => item.value === value)?.label ?? value
}

export function formatLabel(value) {
  return FORMAT_OPTIONS.find((item) => item.value === value)?.label ?? value
}

export function formatReadPeriod(book) {
  if (!book?.readMonth || !book?.readYear) return ''
  const month = MONTHS.find((item) => item.value === Number(book.readMonth))
  return month ? `${month.label} ${book.readYear}` : ''
}

export function uniqueAuthors(books) {
  return [...new Set(books.map((book) => book.author?.trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, 'ru'),
  )
}
