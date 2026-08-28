import { Telegraf, Markup } from 'telegraf'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fetch from 'node-fetch'
import * as cheerio from 'cheerio'

dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://lyuczttevtovpjlndagt.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_AleSKAWSvH4Fv9m0X2ly6g_A9elesfQ'
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN

if (!BOT_TOKEN) {
  console.log('⚠️ Переменная TELEGRAM_BOT_TOKEN не задана!')
  console.log('👉 Создайте бота через @BotFather в Telegram и укажите токен.')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const bot = new Telegraf(BOT_TOKEN || 'dummy_token')

// Популярные жанры в библиотеке для быстрого выбора
const POPULAR_GENRES = [
  'Детектив',
  'Триллер',
  'Психология',
  'Саморазвитие',
  'Нон-фикшн',
  'Роман',
  'Фантастика',
  'Классика',
  'Биография',
  'Бизнес'
]

// Сессии пользователей: { draft: {...}, state: null | 'edit_title' | 'edit_author' | 'edit_pages' | 'add_custom_genre' }
const userSessions = new Map()

// Убираем отчество у авторов
function stripPatronymic(author) {
  if (!author) return ''
  let cleaned = author.trim()
  cleaned = cleaned.replace(/^(?:автор|авторы|by)\s*[:—]?\s*/i, '').trim()
  
  const parts = cleaned.split(/\s+/)
  if (parts.length === 3) {
    const last = parts[2].toLowerCase()
    if (
      last.endsWith('ич') ||
      last.endsWith('на') ||
      last.endsWith('овна') ||
      last.endsWith('евич') ||
      last.endsWith('евна') ||
      last.endsWith('ична')
    ) {
      return `${parts[0]} ${parts[1]}`
    }
  }
  return cleaned
}

// Хелпер добавления / поиска автора в Supabase
async function upsertAuthor(name) {
  const trimmed = stripPatronymic((name || '').trim())
  if (!trimmed) return null

  const { data: existing } = await supabase
    .from('authors')
    .select('id')
    .ilike('name', trimmed)
    .limit(1)
    .maybeSingle()

  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('authors')
    .insert({ name: trimmed })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating author:', error)
    return null
  }
  return created.id
}

// Хелпер добавления тегов
async function syncBookTags(bookId, tags) {
  if (!tags || tags.length === 0) return
  for (const tagName of tags) {
    const cleanTag = tagName.trim()
    if (!cleanTag) continue

    let tagId = null
    const { data: existing } = await supabase
      .from('tags')
      .select('id')
      .eq('name', cleanTag)
      .maybeSingle()

    if (existing) {
      tagId = existing.id
    } else {
      const { data: created } = await supabase
        .from('tags')
        .insert({ name: cleanTag })
        .select('id')
        .single()
      if (created) tagId = created.id
    }

    if (tagId) {
      await supabase.from('book_tags').insert({ book_id: bookId, tag_id: tagId })
    }
  }
}

const GENRE_RULES = [
  {
    tag: 'Детектив',
    keywords: [
      'детектив', 'детективы', 'расследовани', 'криминал', 'убийств', 'исчезновени',
      'тайны', 'маньяк', 'холодное дело', 'сыщик', 'полиция', 'следстви', 'инспектор',
      'mystery', 'detective', 'crime', 'investigation', 'police', 'carmen mola', 'мола', 'несбё', 'кристи', 'конан дойл', 'марс', 'маррс'
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
  const detected = []
  for (const item of GENRE_RULES) {
    if (item.keywords.some((kw) => normalized.includes(kw))) {
      detected.push(item.tag)
    }
  }
  return detected
}

// Поиск книги в Google Books API
async function searchBook(query) {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1&langRestrict=ru`
    const res = await fetch(url)
    const data = await res.json()

    if (!data.items || data.items.length === 0) return null
    const info = data.items[0].volumeInfo

    let coverUrl = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || ''
    if (coverUrl.startsWith('http://')) {
      coverUrl = coverUrl.replace('http://', 'https://')
    }

    const rawGenresText = `${info.title || ''} ${info.description || ''} ${(info.categories || []).join(' ')}`
    const detectedTags = extractGenresFromText(rawGenresText)

    return {
      title: info.title || query,
      author: info.authors ? info.authors.join(', ') : '',
      coverUrl: coverUrl,
      pages: info.pageCount || 350,
      tags: detectedTags.length > 0 ? detectedTags : (info.categories || []),
    }
  } catch (err) {
    console.error('Error searching Google Books:', err)
    return null
  }
}

function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Очистка названия и автора от рекламы магазинов (Буквоед, Ozon, Читай-город, Лабиринт, ЛитРес, LiveLib)
function cleanBookTitleAndAuthor(rawTitle, rawAuthor) {
  let title = (rawTitle || '').trim()
  let author = (rawAuthor || '').trim()

  // 1. Убираем эмодзи
  title = title.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ' ')

  // 2. Убираем ISBN в скобках или без
  title = title.replace(/\(?\b(?:ISBN\s*)?97[89][-\s\d]{10,}\)?/gi, ' ')

  // 3. Обработка формата LiveLib: «Название». Автор: Имя Фамилия
  if (title.includes('Автор:') || title.includes('автор:')) {
    const llMatch = title.match(/«?([^».]+)[».]*\s*[Аа]втор:\s*(.+)/i)
    if (llMatch) {
      title = llMatch[1].trim()
      if (!author) author = llMatch[2].trim()
    }
  }

  // 4. Убираем магазинные маркетинговые хвосты
  const marketingPatterns = [
    /\s*[-–—|•]\s*(?:купить|читать|скачать|отзывы|рецензии|книга|интернет-магазин|лабиринт|читай-город|литрес|livelib|буквоед|ozon|озон|wildberries|в интернет-магазине).*$/i,
    /\s*(?:купить|заказать|доставка)\s+(?:книгу|в интернет-магазине|по выгодной цене|в буквоеде|в читай-городе|на ozon|на озоне).*$/i,
    /\s*\|\s*(?:Литрес|Читай-город|Лабиринт|LiveLib|ЛитРес|Буквоед|OZON|Озон).*$/i,
    /^книга\s*[:«"“]?\s*/i,
  ]
  for (const pat of marketingPatterns) {
    title = title.replace(pat, '').trim()
  }

  // 5. Проверяем паттерн "Название (Автор)", e.g. "Десять негритят (Агата Кристи)"
  const parenAuthorMatch = title.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
  if (parenAuthorMatch) {
    const candidateTitle = parenAuthorMatch[1].trim()
    const candidateAuthor = parenAuthorMatch[2].trim()
    if (!author && /^([А-ЯЁA-Z][а-яёa-z]+(?:\s+[А-ЯЁA-Z][а-яёa-z.]+){1,3})$/.test(candidateAuthor)) {
      title = candidateTitle
      author = candidateAuthor
    }
  }

  // 6. Проверяем тире "Название — Автор" или "Автор — Название"
  if (title.includes(' — ') || title.includes(' - ') || title.includes(' – ')) {
    const parts = title.split(/\s+[—–-]\s+/)
    if (parts.length >= 2) {
      const part1 = parts[0].trim().replace(/^[«"“\s]+|[»"”\s]+$/g, '')
      let part2 = parts[1].trim().replace(/^[«"“\s]+|[»"”\s]+$/g, '')
      part2 = part2.replace(/\s+(?:София|АСТ|Эксмо|Азбука|МИФ|Питер|Альпина|Издательство|Медиа|Группа|ЛитРес|LiveLib|Лабиринт|Буквоед).*$/i, '').trim()

      if (!author || author.trim() === '') {
        if (part2.split(' ').length <= 3 && /[А-ЯЁA-Z]/.test(part2)) {
          title = part1
          author = part2
        } else if (part1.split(' ').length <= 3 && /[А-ЯЁA-Z]/.test(part1)) {
          title = part2
          author = part1
        } else {
          title = part1
        }
      } else {
        title = part1
      }
    }
  }

  title = title.replace(/^[«"“\s]+|[»"”\s]+$/g, '').trim()
  author = author.replace(/^[«"“\s]+|[»"”\s]+$/g, '').trim()

  return { title, author }
}

// Умный парсинг метаданных по URL (Буквоед, Ozon, ЛитРес, Читай-Город, Лабиринт, LiveLib)
async function fetchByUrl(urlStr) {
  try {
    const res = await fetch(urlStr, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    })
    const html = await res.text()
    const $ = cheerio.load(html)

    let rawTitle = ''
    let rawAuthor = ''
    let coverUrl = ''
    let pages = null
    const tags = []

    // 1. Извлечение структурированных данных Schema.org JSON-LD
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const raw = $(el).html()
        const parsed = JSON.parse(raw)
        const items = Array.isArray(parsed) ? parsed : [parsed]
        for (const item of items) {
          if (item['@type'] === 'Book' || item['@type'] === 'Product' || item.name) {
            if (!rawTitle && (item.name || item.headline)) rawTitle = item.name || item.headline
            if (!rawAuthor && item.author) {
              if (typeof item.author === 'string') rawAuthor = item.author
              else if (Array.isArray(item.author)) rawAuthor = item.author.map((a) => (typeof a === 'string' ? a : a.name)).filter(Boolean).join(', ')
              else if (item.author.name) rawAuthor = item.author.name
            }
            if (!coverUrl && item.image) {
              coverUrl = typeof item.image === 'string' ? item.image : (Array.isArray(item.image) ? item.image[0] : item.image.url)
            }
            if (!pages && (item.numberOfPages || item.pageCount)) {
              const num = parseInt(item.numberOfPages || item.pageCount, 10)
              if (num && num > 10 && num < 5000) pages = num
            }
            if (item.genre) {
              if (typeof item.genre === 'string') tags.push(...extractGenresFromText(item.genre))
              else if (Array.isArray(item.genre)) tags.push(...extractGenresFromText(item.genre.join(' ')))
            }
          }
        }
      } catch {}
    })

    // 2. OpenGraph, Twitter Card и селекторы
    if (!rawTitle) {
      rawTitle = $('meta[property="og:title"]').attr('content') || $('title').text() || ''
    }
    if (!rawAuthor) {
      rawAuthor = $('meta[name="author"]').attr('content') ||
        $('[itemprop="author"]').text() ||
        $('.author-name').text() ||
        $('.book-author').text() ||
        $('.product-card-meta__authors-link').text() ||
        $('.authors').text() ||
        ''
    }
    if (!coverUrl) {
      coverUrl = $('meta[property="og:image"]').attr('content') ||
        $('meta[property="og:image:secure_url"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content') ||
        $('link[rel="image_src"]').attr('href') ||
        $('[itemprop="image"]').attr('src') ||
        ''
    }

    // 3. Точный поиск страниц в характеристиках и JSON (без ложных совпадений с адресами)
    if (!pages) {
      const pageSelector = $('[itemprop="numberOfPages"]').text() || $('[itemprop="pageCount"]').text()
      if (pageSelector && parseInt(pageSelector, 10) > 10) {
        pages = parseInt(pageSelector, 10)
      }
    }

    if (!pages) {
      const pageRegexes = [
        /["']numberOfPages["']\s*:\s*["']?(\d{2,4})["']?/i,
        /["']pageCount["']\s*:\s*["']?(\d{2,4})["']?/i,
        /(?:Количество страниц|Кол-во страниц|Число страниц|Объем книги)\s*[:—"?\s]+(\d{2,4})\b/i,
      ]
      for (const r of pageRegexes) {
        const m = html.match(r)
        if (m && parseInt(m[1], 10) > 10 && parseInt(m[1], 10) < 5000) {
          pages = parseInt(m[1], 10)
          break
        }
      }
    }

    // 4. Поиск жанров в разметке и тексте страницы
    const pageText = `${rawTitle} ${$('meta[name="description"]').attr('content') || ''} ${$('meta[name="keywords"]').attr('content') || ''} ${$('.breadcrumbs').text() || ''}`
    const directGenres = extractGenresFromText(pageText)
    tags.push(...directGenres)

    // 5. Очистка названия и автора
    const { title, author } = cleanBookTitleAndAuthor(rawTitle, rawAuthor)

    // 6. Обработка URL обложки (protocol-relative //, относительные /, LitRes ID)
    if (coverUrl) {
      if (coverUrl.startsWith('//')) {
        coverUrl = `https:${coverUrl}`
      } else if (coverUrl.startsWith('/')) {
        try {
          coverUrl = new URL(coverUrl, urlStr).href
        } catch {}
      }
    }

    if (urlStr.includes('litres.ru')) {
      const match = urlStr.match(/-(\d+)(?:\/|\?|$)/) || urlStr.match(/\/(\d+)(?:\/|\?|$)/)
      if (match && match[1]) {
        coverUrl = `https://www.litres.ru/pub/c/cover_415/${match[1]}.jpg`
      }
    }

    // 7. Поиск ISBN для точного определения страниц и жанров
    const isbnMatch = (rawTitle + ' ' + urlStr + ' ' + html).match(/\b(?:ISBN\s*)?(97[89][-\s\d]{10,})\b/i)
    const cleanIsbn = isbnMatch ? isbnMatch[1].replace(/[-\s]/g, '') : null

    // 8. Обогащение через Google Books если не хватает страниц, жанров или обложки
    if (!pages || tags.length === 0 || !coverUrl) {
      try {
        const query = cleanIsbn ? `isbn:${cleanIsbn}` : `${title} ${author}`.trim()
        const gb = await searchBook(query)
        if (gb) {
          if (!pages && gb.pages) pages = gb.pages
          if (!coverUrl && gb.coverUrl) coverUrl = gb.coverUrl
          if (gb.tags?.length) {
            tags.push(...extractGenresFromText(gb.tags.join(' ')))
          }
        }
      } catch {}
    }

    // Дополнительный смысловой анализ по названию и автору
    if (tags.length === 0) {
      tags.push(...extractGenresFromText(`${title} ${author}`))
    }

    return {
      title: title || 'Без названия',
      author: stripPatronymic(author),
      coverUrl,
      pages: pages || 350,
      tags: [...new Set(tags)],
    }
  } catch (err) {
    console.error('Error fetching URL:', err)
    return null
  }
}

// -------------------------------------------------------------
// ГЕНЕРАТОРЫ СООБЩЕНИЙ И КЛАВИАТУР (ЧИСТЫЙ UX БЕЗ ПЕРЕГРУЗА)
// -------------------------------------------------------------

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
]

const SHORT_MONTHS = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'
]

function getMonthLabel(m) {
  if (!m || m < 1 || m > 12) return 'Без даты'
  return MONTH_NAMES[m - 1]
}

function getStatusLabel(status) {
  const map = {
    want_to_read: '💜 Хочу прочитать',
    reading: '💙 В процессе',
    read: '💚 Прочитано',
    abandoned: '💔 Брошено'
  }
  return map[status] || 'Хочу прочитать'
}

function getFormatLabel(format) {
  const map = {
    paper: '📖 Бумага',
    audio: '🎧 Аудио',
    ebook: '📱 Электронная'
  }
  return map[format] || 'Бумага'
}

// Карточка описания книги
function getDraftCaption(draft) {
  const genresText = draft.tags && draft.tags.length > 0 ? draft.tags.map(escapeHtml).join(', ') : 'Не выбраны'
  const isWant = draft.status === 'want_to_read'
  const isRead = draft.status === 'read'
  const formatLine = !isWant ? `\n📦 Формат: <b>${escapeHtml(getFormatLabel(draft.format))}</b>` : ''
  const ratingLine = isRead ? `\n⭐ Оценка: <b>${draft.rating != null ? draft.rating + ' / 10' : 'Без оценки'}</b>` : ''
  const dateLine = isRead ? `\n🗓 Прочитано: <b>${draft.readMonth && draft.readYear ? `${getMonthLabel(draft.readMonth)} ${draft.readYear}` : 'Без даты'}</b>` : ''

  return (
    `📖 <b>${escapeHtml(draft.title)}</b>\n` +
    `✍️ Автор: <b>${escapeHtml(draft.author || 'Не указан')}</b>\n` +
    `📄 Страниц: <b>${draft.pages || 350}</b>\n` +
    `🏷 Жанры: <b>${genresText}</b>\n` +
    `Статус: <b>${escapeHtml(getStatusLabel(draft.status))}</b>` +
    formatLine +
    ratingLine +
    dateLine
  )
}

// 1. Главное меню
function getMainKeyboard(draft) {
  const genreCount = draft.tags?.length || 0
  const genreLabel = genreCount > 0 ? `🏷 Жанры (${genreCount})` : '🏷 Выбрать жанр'
  const isWant = draft.status === 'want_to_read'
  const isRead = draft.status === 'read'

  if (isRead) {
    const ratingLabel = draft.rating != null ? `⭐ ${draft.rating} ★` : '⭐ Оценка'
    const dateLabel = draft.readMonth && draft.readYear ? `🗓 ${SHORT_MONTHS[draft.readMonth - 1]} ${draft.readYear}` : '🗓 Без даты'
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(getStatusLabel(draft.status), 'open_status_menu'),
        Markup.button.callback(`📦 ${getFormatLabel(draft.format)}`, 'open_format_menu'),
      ],
      [
        Markup.button.callback(ratingLabel, 'open_rating_menu'),
        Markup.button.callback(dateLabel, 'open_date_menu'),
      ],
      [
        Markup.button.callback(genreLabel, 'open_genres_menu'),
        Markup.button.callback('✏️ Изменить', 'open_edit_menu'),
      ],
      [
        Markup.button.callback('❌ Отменить', 'cancel_book'),
        Markup.button.callback('✅ Сохранить', 'save_book'),
      ]
    ])
  }

  const firstRow = isWant
    ? [Markup.button.callback(getStatusLabel(draft.status), 'open_status_menu')]
    : [
        Markup.button.callback(getStatusLabel(draft.status), 'open_status_menu'),
        Markup.button.callback(`📦 ${getFormatLabel(draft.format)}`, 'open_format_menu'),
      ]

  return Markup.inlineKeyboard([
    firstRow,
    [
      Markup.button.callback(genreLabel, 'open_genres_menu'),
      Markup.button.callback('✏️ Изменить данные', 'open_edit_menu'),
    ],
    [
      Markup.button.callback('❌ Отменить', 'cancel_book'),
      Markup.button.callback('✅ Сохранить', 'save_book'),
    ]
  ])
}

// 2. Подменю: Статус
function getStatusKeyboard(draft) {
  const items = [
    { key: 'want_to_read', label: '💜 Хочу прочитать' },
    { key: 'reading', label: '💙 В процессе' },
    { key: 'read', label: '💚 Прочитано' },
    { key: 'abandoned', label: '💔 Брошено' },
  ]

  const buttons = items.map((item) => {
    const isSelected = draft.status === item.key
    return [Markup.button.callback(`${isSelected ? '✓ ' : ''}${item.label}`, `set_status_${item.key}`)]
  })

  buttons.push([Markup.button.callback('« Назад к карточке', 'back_to_main')])
  return Markup.inlineKeyboard(buttons)
}

// 3. Подменю: Дата прочтения
function getDateKeyboard(draft) {
  const currentYear = new Date().getFullYear()
  const y = draft.readYear || currentYear
  const m = draft.readMonth || null

  const yearRow = [
    Markup.button.callback(`◀ ${y - 1}`, `set_year_${y - 1}`),
    Markup.button.callback(`📅 ${y} год`, 'noop'),
    Markup.button.callback(`${y + 1} ▶`, `set_year_${y + 1}`),
  ]

  const monthRows = []
  for (let r = 0; r < 4; r++) {
    const row = []
    for (let c = 0; c < 3; c++) {
      const mNum = r * 3 + c + 1
      const isSelected = m === mNum && draft.readYear === y
      row.push(
        Markup.button.callback(
          `${isSelected ? '✓ ' : ''}${SHORT_MONTHS[mNum - 1]}`,
          `set_month_${mNum}_${y}`
        )
      )
    }
    monthRows.push(row)
  }

  const bottomRow = [
    Markup.button.callback(`${!m ? '✓ ' : ''}⚪️ Без даты`, 'set_date_null'),
    Markup.button.callback('« Назад к карточке', 'back_to_main'),
  ]

  return Markup.inlineKeyboard([yearRow, ...monthRows, bottomRow])
}

// 3. Подменю: Оценка (для прочитанных книг)
function getRatingKeyboard(draft) {
  const row1 = [1, 2, 3, 4, 5].map((n) =>
    Markup.button.callback(`${draft.rating === n ? '✓ ' : ''}${n} ★`, `set_rating_${n}`)
  )
  const row2 = [6, 7, 8, 9, 10].map((n) =>
    Markup.button.callback(`${draft.rating === n ? '✓ ' : ''}${n} ★`, `set_rating_${n}`)
  )
  const row3 = [
    Markup.button.callback(`${draft.rating == null ? '✓ ' : ''}⚪️ Без оценки`, 'set_rating_null'),
    Markup.button.callback('« Назад к карточке', 'back_to_main'),
  ]

  return Markup.inlineKeyboard([row1, row2, row3])
}

// 3. Подменю: Формат
function getFormatKeyboard(draft) {
  const items = [
    { key: 'paper', label: '📖 Бумага' },
    { key: 'audio', label: '🎧 Аудио' },
    { key: 'ebook', label: '📱 Электронная' },
  ]

  const buttons = items.map((item) => {
    const isSelected = draft.format === item.key
    return [Markup.button.callback(`${isSelected ? '✓ ' : ''}${item.label}`, `set_format_${item.key}`)]
  })

  buttons.push([Markup.button.callback('« Назад к карточке', 'back_to_main')])
  return Markup.inlineKeyboard(buttons)
}

// 4. Подменю: Жанры
function getGenresKeyboard(draft) {
  const activeTags = new Set(draft.tags || [])
  const rows = []

  for (let i = 0; i < POPULAR_GENRES.length; i += 2) {
    const g1 = POPULAR_GENRES[i]
    const g2 = POPULAR_GENRES[i + 1]

    const b1 = Markup.button.callback(`${activeTags.has(g1) ? '✓ ' : '◻️ '}${g1}`, `toggle_genre_${g1}`)
    const row = [b1]

    if (g2) {
      const b2 = Markup.button.callback(`${activeTags.has(g2) ? '✓ ' : '◻️ '}${g2}`, `toggle_genre_${g2}`)
      row.push(b2)
    }
    rows.push(row)
  }

  // Дополнительные пользовательские жанры (если они добавлены)
  const customTags = (draft.tags || []).filter((t) => !POPULAR_GENRES.includes(t))
  if (customTags.length > 0) {
    for (const ct of customTags) {
      rows.push([Markup.button.callback(`✓ ${ct} (нажмите чтобы убрать)`, `toggle_genre_${ct}`)])
    }
  }

  rows.push([
    Markup.button.callback('➕ Свой жанр', 'add_custom_genre_prompt'),
    Markup.button.callback('« Готово (Назад)', 'back_to_main')
  ])

  return Markup.inlineKeyboard(rows)
}

// 5. Подменю: Редактирование
function getEditKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✏️ Название', 'prompt_edit_title'),
      Markup.button.callback('✍️ Автор', 'prompt_edit_author'),
    ],
    [
      Markup.button.callback('📄 Страницы', 'prompt_edit_pages'),
      Markup.button.callback('🖼 Ссылка на обложку', 'prompt_edit_cover'),
    ],
    [
      Markup.button.callback('« Назад к карточке', 'back_to_main'),
    ]
  ])
}

// Хелпер скачивания обложки для стабильной отправки в Telegram
async function getPhotoBuffer(coverUrl) {
  if (!coverUrl) return null
  try {
    const res = await fetch(coverUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': coverUrl.includes('litres') ? 'https://www.litres.ru/' : 'https://www.google.com/'
      },
      signal: AbortSignal.timeout(4000)
    })
    if (res.ok) {
      const ab = await res.arrayBuffer()
      if (ab.byteLength > 800) {
        return Buffer.from(ab)
      }
    }
  } catch (err) {
    console.warn('Cover buffer download failed:', err.message)
  }
  return null
}

// Хелпер обновления карточки в Telegram
async function renderCard(ctx, draft, keyboard) {
  const caption = getDraftCaption(draft)

  // 1. Если это нажатие inline-кнопки (callback query)
  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageCaption(caption, {
        parse_mode: 'HTML',
        ...keyboard
      })
      return
    } catch {
      try {
        await ctx.editMessageText(caption, {
          parse_mode: 'HTML',
          ...keyboard
        })
        return
      } catch {}
    }
  }

  // 2. Если это новое сообщение: скачиваем картинку и отправляем фото
  if (draft.coverUrl) {
    const photoBuffer = await getPhotoBuffer(draft.coverUrl)
    if (photoBuffer) {
      try {
        await ctx.replyWithPhoto({ source: photoBuffer }, {
          caption,
          parse_mode: 'HTML',
          ...keyboard
        })
        return
      } catch (err) {
        console.warn('Failed to send photo buffer:', err.message)
      }
    }
  }

  // Фоллбек на отправку текста
  try {
    await ctx.reply(caption, {
      parse_mode: 'HTML',
      ...keyboard
    })
  } catch (err) {
    console.error('Failed to send card message:', err)
  }
}

// -------------------------------------------------------------
// ОБРАБОТКА КОМАНД И ВХОДЯЩИХ СООБЩЕНИЙ
// -------------------------------------------------------------

bot.start((ctx) => {
  ctx.replyWithMarkdown(
    `👋 *Привет! Я твой книжный бот-ассистент.* 📚\n\n` +
    `Отправь мне со смартфона:\n` +
    `1. 🔗 *Ссылку на книгу* (с ЛитРес, Читай-Города, LiveLib или Лабиринта)\n` +
    `2. ✍️ *Название книги и автора* (например: \`Джон Грэй Мужчины с Марса\`)\n\n` +
    `Я сам найду обложку, автора, страницы и жанры!\n\n` +
    `🌐 *Твой трекер онлайн:* https://reading-tracker-ten-rho.vercel.app/`
  )
})

// Обработка текстовых сообщений
bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim()
  const userId = ctx.from.id
  const session = userSessions.get(userId)

  // 1. Если бот ожидает ручного ввода поля
  if (session && session.state) {
    const draft = session.draft
    if (session.state === 'edit_author') {
      draft.author = stripPatronymic(text)
      await ctx.reply(`✅ Автор обновлён: «*${draft.author}*»`, { parse_mode: 'Markdown' })
    } else if (session.state === 'edit_title') {
      draft.title = text
      await ctx.reply(`✅ Название обновлено: «*${draft.title}*»`, { parse_mode: 'Markdown' })
    } else if (session.state === 'edit_pages') {
      const num = parseInt(text.replace(/\D/g, ''), 10)
      if (num && num > 0) {
        draft.pages = num
        await ctx.reply(`✅ Количество страниц: *${draft.pages}*`, { parse_mode: 'Markdown' })
      } else {
        return ctx.reply('Пожалуйста, укажите количество страниц числом (например, `320`).')
      }
    } else if (session.state === 'edit_cover') {
      const urlMatch = text.match(/https?:\/\/[^\s]+/i)
      draft.coverUrl = urlMatch ? urlMatch[0] : text.trim()
      await ctx.reply(`✅ Ссылка на обложку обновлена!`, { parse_mode: 'Markdown' })
    } else if (session.state === 'add_custom_genre') {
      const genre = text.replace(/^#/, '').trim()
      if (genre) {
        if (!draft.tags) draft.tags = []
        if (!draft.tags.includes(genre)) draft.tags.push(genre)
        await ctx.reply(`✅ Добавлен жанр: «*${genre}*»`, { parse_mode: 'Markdown' })
      }
    }

    session.state = null
    userSessions.set(userId, session)

    // Показываем обновленную главную карточку
    await renderCard(ctx, draft, getMainKeyboard(draft))
    return
  }

  // 2. Обычное сообщение: парсинг ссылки или поиск книги
  await ctx.sendChatAction('typing')

  let loadingMsg = null
  try {
    loadingMsg = await ctx.reply(
      text.startsWith('http://') || text.startsWith('https://')
        ? '🔎 Загружаю данные по ссылке...'
        : `🔎 Ищу книгу: «${text}»...`,
      Markup.inlineKeyboard([
        [Markup.button.callback('❌ Отменить поиск', 'abort_loading')]
      ])
    )
  } catch {}

  let bookData = null
  if (text.startsWith('http://') || text.startsWith('https://')) {
    bookData = await fetchByUrl(text)
  } else {
    bookData = await searchBook(text)
  }

  // Удаляем временное сообщение загрузки
  if (loadingMsg) {
    try {
      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id)
    } catch {}
  }

  if (!bookData || !bookData.title) {
    return ctx.reply('😔 Не удалось найти книгу. Попробуйте написать «Автор Название» точнее.')
  }

  const now = new Date()
  const draft = {
    title: bookData.title,
    author: stripPatronymic(bookData.author),
    coverUrl: bookData.coverUrl,
    pages: bookData.pages || 350,
    status: 'want_to_read',
    format: 'paper',
    rating: null,
    readMonth: now.getMonth() + 1,
    readYear: now.getFullYear(),
    tags: bookData.tags || [],
    review: null // Отзыв никогда не заполняется автоматически
  }

  userSessions.set(userId, { draft, state: null })
  await renderCard(ctx, draft, getMainKeyboard(draft))
})

// -------------------------------------------------------------
// ИНТЕРАКТИВНЫЕ ДЕЙСТВИЯ (CALLBACK QUERIES)
// -------------------------------------------------------------

// Отмена загрузки по ссылке
bot.action('abort_loading', async (ctx) => {
  try {
    await ctx.deleteMessage()
    await ctx.reply('❌ Загрузка книги отменена.')
  } catch {}
})

// Открыть подменю статуса
bot.action('open_status_menu', async (ctx) => {
  const session = userSessions.get(ctx.from.id)
  if (!session) return ctx.answerCbQuery('Сессия устарела.')
  await ctx.answerCbQuery()
  await renderCard(ctx, session.draft, getStatusKeyboard(session.draft))
})

// Выбор статуса
bot.action(/^set_status_(.+)$/, async (ctx) => {
  const session = userSessions.get(ctx.from.id)
  if (!session) return ctx.answerCbQuery('Сессия устарела.')
  session.draft.status = ctx.match[1]

  // Если статус изменился на "Прочитано" и нет даты, устанавливаем текущий месяц и год
  if (session.draft.status === 'read' && !session.draft.readYear) {
    const d = new Date()
    session.draft.readYear = d.getFullYear()
    session.draft.readMonth = d.getMonth() + 1
  }

  await ctx.answerCbQuery(`Выбрано: ${getStatusLabel(session.draft.status)}`)
  // Возвращаем в главное меню с обновленным статусом
  await renderCard(ctx, session.draft, getMainKeyboard(session.draft))
})

// Открыть подменю даты
bot.action('open_date_menu', async (ctx) => {
  const session = userSessions.get(ctx.from.id)
  if (!session) return ctx.answerCbQuery('Сессия устарела.')
  await ctx.answerCbQuery()
  await renderCard(ctx, session.draft, getDateKeyboard(session.draft))
})

// Переключение года в меню даты
bot.action(/^set_year_(\d+)$/, async (ctx) => {
  const session = userSessions.get(ctx.from.id)
  if (!session) return ctx.answerCbQuery('Сессия устарела.')
  session.draft.readYear = Number(ctx.match[1])
  await ctx.answerCbQuery(`${session.draft.readYear} год`)
  await renderCard(ctx, session.draft, getDateKeyboard(session.draft))
})

// Выбор месяца в меню даты
bot.action(/^set_month_(\d+)_(\d+)$/, async (ctx) => {
  const session = userSessions.get(ctx.from.id)
  if (!session) return ctx.answerCbQuery('Сессия устарела.')
  const m = Number(ctx.match[1])
  const y = Number(ctx.match[2])
  session.draft.readMonth = m
  session.draft.readYear = y
  await ctx.answerCbQuery(`${getMonthLabel(m)} ${y}`)
  await renderCard(ctx, session.draft, getMainKeyboard(session.draft))
})

// Сброс даты ("Без даты")
bot.action('set_date_null', async (ctx) => {
  const session = userSessions.get(ctx.from.id)
  if (!session) return ctx.answerCbQuery('Сессия устарела.')
  session.draft.readMonth = null
  session.draft.readYear = null
  await ctx.answerCbQuery('Без даты')
  await renderCard(ctx, session.draft, getMainKeyboard(session.draft))
})

// Заглушка для заголовка года
bot.action('noop', (ctx) => ctx.answerCbQuery())

// Открыть подменю оценки
bot.action('open_rating_menu', async (ctx) => {
  const session = userSessions.get(ctx.from.id)
  if (!session) return ctx.answerCbQuery('Сессия устарела.')
  await ctx.answerCbQuery()
  await renderCard(ctx, session.draft, getRatingKeyboard(session.draft))
})

// Выбор оценки
bot.action(/^set_rating_(.+)$/, async (ctx) => {
  const session = userSessions.get(ctx.from.id)
  if (!session) return ctx.answerCbQuery('Сессия устарела.')
  const val = ctx.match[1]
  session.draft.rating = val === 'null' ? null : Number(val)
  await ctx.answerCbQuery(session.draft.rating ? `Оценка: ${session.draft.rating} ★` : 'Без оценки')
  await renderCard(ctx, session.draft, getMainKeyboard(session.draft))
})

// Открыть подменю формата
bot.action('open_format_menu', async (ctx) => {
  const session = userSessions.get(ctx.from.id)
  if (!session) return ctx.answerCbQuery('Сессия устарела.')
  await ctx.answerCbQuery()
  await renderCard(ctx, session.draft, getFormatKeyboard(session.draft))
})

// Выбор формата
bot.action(/^set_format_(.+)$/, async (ctx) => {
  const session = userSessions.get(ctx.from.id)
  if (!session) return ctx.answerCbQuery('Сессия устарела.')
  session.draft.format = ctx.match[1]
  await ctx.answerCbQuery(`Выбран формат: ${getFormatLabel(session.draft.format)}`)
  // Возвращаем в главное меню с обновленным форматом
  await renderCard(ctx, session.draft, getMainKeyboard(session.draft))
})

// Открыть подменю жанров
bot.action('open_genres_menu', async (ctx) => {
  const session = userSessions.get(ctx.from.id)
  if (!session) return ctx.answerCbQuery('Сессия устарела.')
  await ctx.answerCbQuery()
  await renderCard(ctx, session.draft, getGenresKeyboard(session.draft))
})

// Переключение жанра (toggle checkbox)
bot.action(/^toggle_genre_(.+)$/, async (ctx) => {
  const session = userSessions.get(ctx.from.id)
  if (!session) return ctx.answerCbQuery('Сессия устарела.')

  const genre = ctx.match[1]
  if (!session.draft.tags) session.draft.tags = []

  if (session.draft.tags.includes(genre)) {
    session.draft.tags = session.draft.tags.filter((t) => t !== genre)
    await ctx.answerCbQuery(`Убран жанр: ${genre}`)
  } else {
    session.draft.tags.push(genre)
    await ctx.answerCbQuery(`Добавлен жанр: ${genre}`)
  }

  // Обновляем клавиатуру выбора жанров с актуальными галочками
  await renderCard(ctx, session.draft, getGenresKeyboard(session.draft))
})

// Промпт для ввода своего жанра
bot.action('add_custom_genre_prompt', async (ctx) => {
  const session = userSessions.get(ctx.from.id)
  if (!session) return ctx.answerCbQuery('Сессия устарела.')
  session.state = 'add_custom_genre'
  userSessions.set(ctx.from.id, session)

  await ctx.answerCbQuery()
  await ctx.reply('🏷 *Напишите свой жанр* в ответном сообщении:', { parse_mode: 'Markdown' })
})

// Открыть меню редактирования
bot.action('open_edit_menu', async (ctx) => {
  const session = userSessions.get(ctx.from.id)
  if (!session) return ctx.answerCbQuery('Сессия устарела.')
  await ctx.answerCbQuery()
  await renderCard(ctx, session.draft, getEditKeyboard())
})

// Промпты для редактирования полей
bot.action('prompt_edit_title', async (ctx) => {
  const session = userSessions.get(ctx.from.id)
  if (!session) return ctx.answerCbQuery('Сессия устарела.')
  session.state = 'edit_title'
  userSessions.set(ctx.from.id, session)
  await ctx.answerCbQuery()
  await ctx.reply('✍️ *Напишите точное название книги* в ответном сообщении:', { parse_mode: 'Markdown' })
})

bot.action('prompt_edit_author', async (ctx) => {
  const session = userSessions.get(ctx.from.id)
  if (!session) return ctx.answerCbQuery('Сессия устарела.')
  session.state = 'edit_author'
  userSessions.set(ctx.from.id, session)
  await ctx.answerCbQuery()
  await ctx.reply('✍️ *Напишите имя и фамилию автора* в ответном сообщении:', { parse_mode: 'Markdown' })
})

bot.action('prompt_edit_pages', async (ctx) => {
  const session = userSessions.get(ctx.from.id)
  if (!session) return ctx.answerCbQuery('Сессия устарела.')
  session.state = 'edit_pages'
  userSessions.set(ctx.from.id, session)
  await ctx.answerCbQuery()
  await ctx.reply('📄 *Введите количество страниц* (числом):', { parse_mode: 'Markdown' })
})

bot.action('prompt_edit_cover', async (ctx) => {
  const session = userSessions.get(ctx.from.id)
  if (!session) return ctx.answerCbQuery('Сессия устарела.')
  session.state = 'edit_cover'
  userSessions.set(ctx.from.id, session)
  await ctx.answerCbQuery()
  await ctx.reply('🖼 *Отправьте ссылку на обложку* книги (URL адрес картинки):', { parse_mode: 'Markdown' })
})

// Кнопка возврата в главное меню
bot.action('back_to_main', async (ctx) => {
  const session = userSessions.get(ctx.from.id)
  if (!session) return ctx.answerCbQuery('Сессия устарела.')
  await ctx.answerCbQuery()
  await renderCard(ctx, session.draft, getMainKeyboard(session.draft))
})

// Кнопка отмены
bot.action('cancel_book', async (ctx) => {
  const userId = ctx.from.id
  const session = userSessions.get(userId)
  const title = session?.draft?.title || 'книги'

  userSessions.delete(userId)
  await ctx.answerCbQuery('Добавление отменено')

  try {
    await ctx.deleteMessage()
  } catch {
    try {
      await ctx.editMessageCaption(`❌ Добавление «${title}» отменено.`)
    } catch {}
  }

  await ctx.reply(`❌ Добавление книги «${title}» отменено.`)
})

// Сохранение книги в Supabase
bot.action('save_book', async (ctx) => {
  const userId = ctx.from.id
  const session = userSessions.get(userId)
  if (!session || !session.draft) return ctx.answerCbQuery('Сессия устарела.')

  const draft = session.draft
  await ctx.answerCbQuery('Сохраняем...')

  try {
    const authorId = await upsertAuthor(draft.author)
    const bookId = crypto.randomUUID()

    const readMonth = draft.status === 'read' ? (draft.readMonth || null) : null
    const readYear = draft.status === 'read' ? (draft.readYear || null) : null

    const isWant = draft.status === 'want_to_read'
    const { error: insertError } = await supabase.from('books').insert({
      id: bookId,
      title: draft.title,
      author_id: authorId,
      cover_url: draft.coverUrl || null,
      rating: draft.rating,
      status: draft.status,
      format: isWant ? null : (draft.format || 'paper'),
      pages: draft.pages,
      read_month: readMonth,
      read_year: readYear,
      review: null // Отзыв пустой для личных заметок пользователя
    })

    if (insertError) throw insertError

    await syncBookTags(bookId, draft.tags || [])

    userSessions.delete(userId)

    const genresText = draft.tags && draft.tags.length > 0 ? `\n🏷 Жанры: ${draft.tags.join(', ')}` : ''
    const formatSuccessLine = !isWant ? `\n📦 Формат: ${getFormatLabel(draft.format)}` : ''
    const ratingSuccessLine = draft.status === 'read' && draft.rating != null ? `\n⭐ Оценка: *${draft.rating} / 10*` : ''
    const dateSuccessLine = draft.status === 'read' && readMonth && readYear ? `\n🗓 Прочитано: *${getMonthLabel(readMonth)} ${readYear}*` : ''

    await ctx.replyWithMarkdown(
      `🎉 *Книга «${draft.title}» (${draft.author || 'Без автора'}) успешно добавлена в библиотеку!*\n\n` +
      `📌 Статус: ${getStatusLabel(draft.status)}` +
      formatSuccessLine +
      ratingSuccessLine +
      dateSuccessLine +
      `\n📄 Страниц: *${draft.pages}*${genresText}\n\n` +
      `🌐 Открыть в трекере:\nhttps://reading-tracker-ten-rho.vercel.app/`
    )
  } catch (err) {
    console.error('Error saving book via Telegram bot:', err)
    ctx.reply('❌ Ошибка при сохранении в базу данных. Попробуйте еще раз.')
  }
})

// Запуск бота
export async function startBot() {
  if (!BOT_TOKEN || BOT_TOKEN === 'dummy_token') {
    console.log('Telegram Bot Token не задан.')
    return
  }
  try {
    await bot.launch()
    console.log('🤖 Telegram-бот успешно запущен!')
  } catch (err) {
    console.error('Ошибка запуска Telegram-бота:', err)
  }
}

if (process.env.TELEGRAM_BOT_TOKEN) {
  startBot()
}
