/**
 * Извлекает и очищает метаданные книги (название, автор, обложка, теги)
 * по URL-ссылке с популярных сайтов (LiveLib, Litres, Лабиринт, Читай-город, Ozon, Goodreads и др.)
 */

export async function fetchBookMetadataFromUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('Укажите корректную ссылку на книгу')
  }

  let url = rawUrl.trim()
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`
  }

  try {
    const endpoint = `https://api.microlink.io?url=${encodeURIComponent(url)}`
    const res = await fetch(endpoint)
    if (!res.ok) {
      throw new Error(`Ошибка загрузки: ${res.statusText}`)
    }

    const json = await res.json()
    if (json.status !== 'success' || !json.data) {
      throw new Error('Не удалось распознать страницу книги')
    }

    const data = json.data
    const rawTitle = data.title || ''
    const rawAuthor = data.author || ''

    const { title, author } = cleanTitleAndAuthor(rawTitle, rawAuthor, url)
    const coverUrl = extractRealCoverUrl(url, data)
    const tags = extractTagsFromMetadata(data)
    const pages = extractPageCount(data)

    return {
      title: title || rawTitle,
      author: author || rawAuthor,
      coverUrl: coverUrl || '',
      tags,
      pages: pages || null,
    }
  } catch (error) {
    console.error('Book metadata fetch error:', error)
    throw new Error(error.message || 'Не удалось загрузить данные по ссылке')
  }
}

/**
 * Ищет жанры и теги книги в интернете по названию и автору
 */
export async function detectGenresForBook(title, author = '') {
  if (!title || !title.trim()) {
    throw new Error('Сначала укажите название книги')
  }

  const query = `${title.trim()} ${author.trim()}`.trim()
  const detected = new Set(extractGenresFromText(query))

  try {
    const searchUrl = `https://www.livelib.ru/find/${encodeURIComponent(query)}`
    const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(searchUrl)}`)
    if (res.ok) {
      const json = await res.json()
      if (json.status === 'success' && json.data) {
        const found = extractTagsFromMetadata(json.data)
        found.forEach((t) => detected.add(t))
      }
    }
  } catch {
    // Фоллбек на локальные правила
  }

  if (detected.size === 0) {
    const fallback = extractGenresFromText(`${title} ${author}`)
    fallback.forEach((t) => detected.add(t))
  }

  return [...detected]
}

function extractRealCoverUrl(url, data) {
  // 1. Прямой CDN обложек для ЛитРес
  if (/litres\.ru/i.test(url)) {
    const match = url.match(/-(\d+)(?:\/|\?|$)/) || url.match(/\/(\d+)(?:\/|\?|$)/)
    if (match && match[1]) {
      return `https://www.litres.ru/pub/c/cover_415/${match[1]}.jpg`
    }
  }

  // 2. Проверка OpenGraph картинки
  const candidate = data.image?.url || ''

  // Игнорируем фавиконки, логотипы и пустые заглушки
  if (
    !candidate ||
    /favicon/i.test(candidate) ||
    /\.ico$/i.test(candidate) ||
    /logo/i.test(candidate) ||
    /apple-touch-icon/i.test(candidate) ||
    /avatar/i.test(candidate) ||
    /blank\.gif/i.test(candidate) ||
    /pixel\./i.test(candidate)
  ) {
    return ''
  }

  return candidate
}

const PUBLISHERS = [
  'азбука-аттикус',
  'азбука',
  'аст',
  'эксмо',
  'миф',
  'манн, иванов и фербер',
  'альпина нон-фикшн',
  'альпина паблишер',
  'альпина',
  'рипол классик',
  'рипол',
  'росмэн',
  'clever',
  'книжный клуб',
  'corpus',
]

/**
 * Удаляет русское отчество (если 3 слова в ФИО), оставляя только Имя и Фамилию
 */
export function stripPatronymic(name) {
  if (!name) return ''
  const parts = name.trim().split(/\s+/)
  if (parts.length === 3) {
    const patronymicPattern = /(?:ович|евич|ич|овна|евна|ична|инична)$/i
    const pIndex = parts.findIndex((p) => patronymicPattern.test(p))
    if (pIndex !== -1) {
      parts.splice(pIndex, 1)
      return parts.join(' ')
    }
  }
  return name.trim()
}

function cleanTitleAndAuthor(rawTitle, rawAuthor, _url) {
  let title = (rawTitle || '').trim()
  let author = (rawAuthor || '').trim()

  // 1. Очистка от магазинных суффиксов и мусора
  title = title
    .replace(/\s*[-–—|]\s*(купить|читать онлайн|скачать|отзывы|рецензии|книга|интернет-магазин|лабиринт|читай-город|литрес|livelib|буквоед|ozon|wildberries).*$/i, '')
    .replace(/\s*\|\s*.*$/i, '')
    .replace(/^книга\s*[:«"“]?\s*/i, '')
    .trim()

  // 2. Разделение по тире "Название — Автор" или "Автор — Название"
  const dashSeparators = /\s+[-–—]\s+/
  if (dashSeparators.test(title)) {
    const parts = title.split(dashSeparators).map((s) => s.trim().replace(/^[«"“\s]+|[»"”\s]+$/g, ''))
    if (parts.length === 2) {
      const [part1, part2] = parts
      if (!author) {
        if (part2.split(' ').length <= 4 && !/^\d+/.test(part2)) {
          title = part1
          author = part2
        } else if (part1.split(' ').length <= 3) {
          title = part2
          author = part1
        }
      } else {
        // Автор уже был передан, отрезаем автора от названия
        title = part1
      }
    }
  }

  // 3. Формат "Автор: Название"
  const colonMatch = title.match(/^(.+?)\s*:\s*(.+)$/)
  if (colonMatch && !author) {
    const part1 = colonMatch[1].trim()
    const part2 = colonMatch[2].trim()
    if (part1.split(' ').length <= 3 && /[А-ЯЁA-Z]/.test(part1)) {
      title = part2
      author = part1
    } else {
      title = part1
      author = part2
    }
  }

  // 4. Окончательная очистка кавычек и отчеств
  title = title.replace(/^[«"“\s]+|[»"”\s]+$/g, '').trim()
  author = stripPatronymic(
    author
      .replace(/^(автор|книга автора|писатель)[:\s]+/i, '')
      .replace(/^[«"“\s]+|[»"”\s]+$/g, '')
      .trim(),
  )

  return cleanPublishers({ title, author })
}

function cleanPublishers({ title, author }) {
  let cleanT = title || ''
  let cleanA = author || ''

  for (const pub of PUBLISHERS) {
    const regexEnd = new RegExp(`\\s+${pub}\\s*$`, 'i')
    cleanT = cleanT.replace(regexEnd, '').trim()
    cleanA = cleanA.replace(regexEnd, '').trim()
  }

  return {
    title: cleanT.replace(/^[«"“\s]+|[»"”\s]+$/g, '').trim(),
    author: stripPatronymic(cleanA),
  }
}

const GENRE_RULES = [
  { tag: 'Психология', keywords: ['психолог', 'психотерапи', 'саморазвити', 'самооценк', 'мозг', 'эмоци', 'мышлени', 'психик', 'травм', 'биполярн', 'депресси', 'расстройств', 'терапи'] },
  { tag: 'Нон-фикшн', keywords: ['нон-фикшн', 'non-fiction', 'научпоп', 'биографи', 'мемуар', 'исследовани', 'наук', 'истори'] },
  { tag: 'Детектив', keywords: ['детектив', 'триллер', 'расследовани', 'криминал', 'убийств', 'исчезновени', 'тайны', 'маньяк', 'холодное дело'] },
  { tag: 'Триллер', keywords: ['триллер', 'саспенс', 'психологический триллер', 'острые предметы', 'исчезнувшая', 'напряжени'] },
  { tag: 'Фантастика', keywords: ['фантастик', 'sci-fi', 'космос', 'будуще', 'киберпанк', 'антиутопи', 'утопи', 'роботы'] },
  { tag: 'Фэнтези', keywords: ['фэнтези', 'маги', 'дракон', 'эльф', 'меч', 'колдовств', 'ведьм', 'заклинани'] },
  { tag: 'Классика', keywords: ['классик', 'роман-эпопея', 'шедевр', 'достоевск', 'толстой', 'булгаков', 'чехов', 'гоголь', 'пушкин', 'тургенев'] },
  { tag: 'Бизнес', keywords: ['бизнес', 'маркетинг', 'стартап', 'менеджмент', 'экономик', 'деньги', 'инвестици', 'продаж', 'финансы'] },
  { tag: 'Саморазвитие', keywords: ['саморазвити', 'продуктивност', 'привычк', 'успех', 'мотиваци', 'цели', 'дисциплин', 'тайм-менеджмент'] },
  { tag: 'Роман', keywords: ['любовный роман', 'романтич', 'драма', 'отношени', 'любовь'] },
  { tag: 'Философия', keywords: ['философи', 'смысл жизни', 'стоицизм', 'ницше', 'кант', 'этик'] },
]

function extractGenresFromText(text) {
  const normalized = (text || '').toLowerCase()
  const tags = []

  for (const item of GENRE_RULES) {
    if (item.keywords.some((kw) => normalized.includes(kw))) {
      tags.push(item.tag)
    }
  }

  return tags
}

function extractTagsFromMetadata(data) {
  const text = `${data.title || ''} ${data.description || ''} ${data.publisher || ''}`
  return extractGenresFromText(text)
}

function extractPageCount(data) {
  const text = `${data.title || ''} ${data.description || ''}`
  const match = text.match(/(\d{2,4})\s*(?:стр(?:аниц)?|pages)/i)
  if (match && Number(match[1]) > 10 && Number(match[1]) < 3500) {
    return Number(match[1])
  }
  return null
}
