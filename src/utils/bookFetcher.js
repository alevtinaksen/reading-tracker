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
 * Ищет жанры и теги книги в интернете по названию и автору через Google Books, OpenLibrary и смысловой классификатор
 */
export async function detectGenresForBook(title, author = '') {
  if (!title || !title.trim()) {
    throw new Error('Сначала укажите название книги')
  }

  const cleanT = title.trim()
  const cleanA = author.trim()
  const query = `${cleanT} ${cleanA}`.trim()
  const detected = new Set()

  // 1. Быстрый поиск в Google Books API
  try {
    const gUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=3`
    const res = await fetch(gUrl)
    if (res.ok) {
      const json = await res.json()
      if (json.items && json.items.length > 0) {
        for (const item of json.items) {
          const info = item.volumeInfo || {}
          const combinedText = [
            info.title,
            info.subtitle,
            info.description,
            ...(info.categories || []),
          ].filter(Boolean).join(' ')

          const found = extractGenresFromText(combinedText)
          found.forEach((g) => detected.add(g))
        }
      }
    }
  } catch (err) {
    console.warn('Google Books API genre check failed:', err)
  }

  // 2. Поиск в OpenLibrary API
  if (detected.size === 0) {
    try {
      const olUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=3`
      const res = await fetch(olUrl)
      if (res.ok) {
        const json = await res.json()
        if (json.docs && json.docs.length > 0) {
          for (const doc of json.docs) {
            const combinedText = [
              doc.title,
              ...(doc.subject || []),
              ...(doc.author_name || []),
            ].filter(Boolean).join(' ')

            const found = extractGenresFromText(combinedText)
            found.forEach((g) => detected.add(g))
          }
        }
      }
    } catch (err) {
      console.warn('OpenLibrary genre check failed:', err)
    }
  }

  // 3. Анализ названия книги и автора через базу авторов и ключевых корней
  const directFound = extractGenresFromText(query)
  directFound.forEach((g) => detected.add(g))

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
  {
    tag: 'Детектив',
    keywords: [
      'детектив', 'детективы', 'расследовани', 'криминал', 'убийств', 'исчезновени',
      'тайны', 'маньяк', 'холодное дело', 'сыщик', 'полиция', 'следстви', 'инспектор',
      'mystery', 'detective', 'crime', 'investigation', 'police', 'carmen mola', 'мола', 'несбё', 'кристи', 'конан дойл'
    ],
  },
  {
    tag: 'Триллер',
    keywords: [
      'триллер', 'триллеры', 'саспенс', 'психологический триллер', 'острые предметы',
      'исчезнувшая', 'напряжени', 'похищени', 'заложник', 'преследовани', 'thriller', 'suspense', 'психопат'
    ],
  },
  {
    tag: 'Психология',
    keywords: [
      'психолог', 'психотерапи', 'самооценк', 'мозг', 'эмоци', 'мышлени', 'психик',
      'травм', 'биполярн', 'депресси', 'расстройств', 'терапи', 'отношени', 'чувств',
      'psychology', 'counseling', 'neuroscience', 'грэй', 'лабковский', 'курпатов', 'фрейд', 'юнг'
    ],
  },
  {
    tag: 'Саморазвитие',
    keywords: [
      'саморазвити', 'продуктивност', 'привычк', 'успех', 'мотиваци', 'цели', 'дисциплин',
      'тайм-менеджмент', 'личностный рост', 'самосовершенствовани', 'self-help', 'personal growth', 'habit'
    ],
  },
  {
    tag: 'Нон-фикшн',
    keywords: [
      'нон-фикшн', 'non-fiction', 'научпоп', 'биографи', 'мемуар', 'исследовани', 'наук',
      'истори', 'документальн', 'популярная наука', 'science', 'biography'
    ],
  },
  {
    tag: 'Фантастика',
    keywords: [
      'фантастик', 'sci-fi', 'космос', 'будуще', 'киберпанк', 'антиутопи', 'утопи',
      'роботы', 'искусственный интеллект', 'science fiction', 'dystopia', 'оруэлл', 'брэдбери', 'азимов', 'стругацк'
    ],
  },
  {
    tag: 'Фэнтези',
    keywords: [
      'фэнтези', 'маги', 'дракон', 'эльф', 'меч', 'колдовств', 'ведьм', 'заклинани',
      'fantasy', 'dark fantasy', 'magic', 'толкин', 'марти', 'роулинг', 'сапковский', 'сандерсон'
    ],
  },
  {
    tag: 'Классика',
    keywords: [
      'классик', 'роман-эпопея', 'шедевр', 'достоевск', 'толстой', 'булгаков', 'чехов',
      'гоголь', 'пушкин', 'тургенев', 'classics', 'classic literature'
    ],
  },
  {
    tag: 'Бизнес',
    keywords: [
      'бизнес', 'маркетинг', 'стартап', 'менеджмент', 'экономик', 'деньги', 'инвестици',
      'продаж', 'финансы', 'управление', 'business', 'economics', 'finance', 'management'
    ],
  },
  {
    tag: 'Роман',
    keywords: [
      'любовный роман', 'романтич', 'драма', 'любовь', 'судьба', 'romance', 'love story', 'проза', 'fiction / general'
    ],
  },
  {
    tag: 'Ужасы',
    keywords: [
      'ужасы', 'хоррор', 'мистика', 'привидени', 'кошмар', 'демон', 'horror', 'ghost', 'кинг'
    ],
  },
  {
    tag: 'Философия',
    keywords: [
      'философи', 'смысл жизни', 'стоицизм', 'ницше', 'кант', 'этик', 'philosophy'
    ],
  },
  {
    tag: 'Приключения',
    keywords: [
      'приключени', 'путешестви', 'экспедици', 'пираты', 'выживани', 'adventure'
    ],
  },
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
