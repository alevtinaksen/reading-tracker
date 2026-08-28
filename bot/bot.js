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

// Временные данные пользователей: { draft: {...}, state: null | 'edit_title' | 'edit_author' | 'edit_pages', messageId: number, chatId: number }
const userSessions = new Map()

// Убираем отчество у авторов
function stripPatronymic(author) {
  if (!author) return ''
  let cleaned = author.trim()
  // Убираем лишние префиксы "Автор:", "by" и т.д.
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

    return {
      title: info.title || query,
      author: info.authors ? info.authors.join(', ') : '',
      coverUrl: coverUrl,
      pages: info.pageCount || 350,
      tags: info.categories || ['Художественная литература'],
      description: info.description || '',
    }
  } catch (err) {
    console.error('Error searching Google Books:', err)
    return null
  }
}

// Умный парсинг метаданных по URL
async function fetchByUrl(urlStr) {
  try {
    const res = await fetch(urlStr, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    const html = await res.text()
    const $ = cheerio.load(html)

    let title = ''
    let author = ''
    let coverUrl = ''
    let description = ''
    let pages = null

    // 1. Попытка извлечь структурированные данные Schema.org JSON-LD
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const raw = $(el).html()
        const parsed = JSON.parse(raw)
        const items = Array.isArray(parsed) ? parsed : [parsed]
        for (const item of items) {
          if (item['@type'] === 'Book' || item['@type'] === 'Product' || item.name) {
            if (!title && (item.name || item.headline)) title = item.name || item.headline
            if (!author && item.author) {
              if (typeof item.author === 'string') author = item.author
              else if (Array.isArray(item.author)) author = item.author.map((a) => (typeof a === 'string' ? a : a.name)).filter(Boolean).join(', ')
              else if (item.author.name) author = item.author.name
            }
            if (!coverUrl && item.image) {
              coverUrl = typeof item.image === 'string' ? item.image : (Array.isArray(item.image) ? item.image[0] : item.image.url)
            }
            if (!pages && (item.numberOfPages || item.pageCount)) {
              pages = parseInt(item.numberOfPages || item.pageCount, 10)
            }
            if (!description && item.description) description = item.description
          }
        }
      } catch {}
    })

    // 2. OpenGraph и селекторы
    if (!title) {
      title = $('meta[property="og:title"]').attr('content') || $('title').text()
    }
    if (!author) {
      author = $('meta[name="author"]').attr('content') ||
        $('[itemprop="author"]').text() ||
        $('.author-name').text() ||
        $('.book-author').text() ||
        $('.product-card-meta__authors-link').text() ||
        $('.authors').text() ||
        ''
    }
    if (!coverUrl) {
      coverUrl = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || ''
    }
    if (!description) {
      description = $('meta[property="og:description"]').attr('content') || ''
    }

    // 3. Поиск страниц в тексте, если не найдено
    if (!pages) {
      const pagesMatch = html.match(/(?:Объем|Количество страниц|страниц|стр\.)\s*[:—]?\s*(\d{2,4})/i)
      if (pagesMatch) {
        pages = parseInt(pagesMatch[1], 10)
      } else {
        pages = 350
      }
    }

    // 4. Очистка заголовка и извлечение автора из формата «Название — Автор Издательство»
    title = title.replace(/\s*—\s*(?:книга на|купить на|читать на|скачать|интернет-магазин).*$/i, '').trim()
    title = title.replace(/\s*\|\s*(?:Литрес|Читай-город|Лабиринт|LiveLib).*$/i, '').trim()
    title = title.replace(/^«|»$/g, '').trim()

    // Если заголовок содержит тире и автор пустой или в заголовке
    if (title.includes(' — ') || title.includes(' - ')) {
      const parts = title.split(/\s+[—\-]\s+/)
      if (parts.length >= 2) {
        const potentialTitle = parts[0].trim().replace(/^«|»$/g, '')
        let potentialAuthor = parts[1].trim()

        // Убираем название издательств на конце
        potentialAuthor = potentialAuthor
          .replace(/\s+(?:София|АСТ|Эксмо|Азбука|МИФ|Питер|Альпина|Издательство|Медиа|Группа|ЛитРес|LiveLib|Лабиринт).*$/i, '')
          .trim()

        if (!author || author.trim() === '') {
          author = potentialAuthor
        }
        title = potentialTitle
      }
    }

    return {
      title: title || 'Без названия',
      author: stripPatronymic(author),
      coverUrl,
      pages,
      tags: [],
      description
    }
  } catch (err) {
    console.error('Error fetching URL:', err)
    return null
  }
}

// Генерация клавиатуры с 4 статусами, 3 форматами и кнопками редактирования
function getDraftKeyboard(draft) {
  const isWant = draft.status === 'want_to_read'
  const isReading = draft.status === 'reading'
  const isRead = draft.status === 'read'
  const isAbandoned = draft.status === 'abandoned'

  const isPaper = draft.format === 'paper'
  const isAudio = draft.format === 'audio'
  const isEbook = draft.format === 'ebook'

  return Markup.inlineKeyboard([
    // Ряд 1: Статусы (2x2 для красивого отображения без сжатия текста)
    [
      Markup.button.callback(isWant ? '💜 • Хочу читать' : '💜 Хочу читать', 'status_want_to_read'),
      Markup.button.callback(isReading ? '💙 • В процессе' : '💙 В процессе', 'status_reading'),
    ],
    [
      Markup.button.callback(isRead ? '💚 • Прочитано' : '💚 Прочитано', 'status_read'),
      Markup.button.callback(isAbandoned ? '💔 • Брошено' : '💔 Брошено', 'status_abandoned'),
    ],
    // Ряд 2: Форматы
    [
      Markup.button.callback(isPaper ? '📖 • Бумага' : '📖 Бумага', 'format_paper'),
      Markup.button.callback(isAudio ? '🎧 • Аудио' : '🎧 Аудио', 'format_audio'),
      Markup.button.callback(isEbook ? '📱 • Электронная' : '📱 Электронная', 'format_ebook'),
    ],
    // Ряд 3: Кнопки ручного исправления
    [
      Markup.button.callback('✏️ Изм. автора', 'edit_author'),
      Markup.button.callback('✏️ Изм. название', 'edit_title'),
      Markup.button.callback('✏️ Изм. страницы', 'edit_pages'),
    ],
    // Ряд 4: Сохранение и Отмена
    [
      Markup.button.callback('❌ Отменить', 'cancel_book'),
      Markup.button.callback('✅ Сохранить в библиотеку', 'save_book'),
    ]
  ])
}

function getDraftCaption(draft) {
  const statusLabels = {
    want_to_read: '💜 Хочу прочитать',
    reading: '💙 В процессе',
    read: '💚 Прочитано',
    abandoned: '💔 Брошено'
  }
  const formatLabels = {
    paper: '📖 Бумага',
    audio: '🎧 Аудио',
    ebook: '📱 Электронная'
  }

  return (
    `📖 *${draft.title}*\n` +
    `✍️ Автор: *${draft.author || 'Не указан'}*\n` +
    `📄 Страниц: *${draft.pages}*\n` +
    `📌 Статус: *${statusLabels[draft.status] || draft.status}*\n` +
    `📦 Формат: *${formatLabels[draft.format] || draft.format}*\n\n` +
    `_Выберите параметры или нажмите «✏️ Изм. автора / название», если нужно скорректировать._`
  )
}

// Команда /start
bot.start((ctx) => {
  ctx.replyWithMarkdown(
    `👋 *Привет! Я твой персональный книжный ассистент.* 📚\n\n` +
    `Отправь мне со смартфона:\n` +
    `1. 🔗 *Ссылку на книгу* (с ЛитРес, Читай-Города, LiveLib или Лабиринта)\n` +
    `2. ✍️ *Название книги и автора* (например: \`Джон Грэй Мужчины с Марса\`)\n\n` +
    `Я найду обложку, автора, страницы и добавлю прямо в трекер!\n\n` +
    `🌐 *Твой трекер:* https://reading-tracker-ten-rho.vercel.app/`
  )
})

// Обработка входящего текста (ссылка, поиск или ручной ввод поля)
bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim()
  const userId = ctx.from.id
  const session = userSessions.get(userId)

  // 1. Проверяем, ожидает ли бот ручного ввода поля
  if (session && session.state) {
    const draft = session.draft
    if (session.state === 'edit_author') {
      draft.author = stripPatronymic(text)
      await ctx.reply(`✅ Автор изменен на: «*${draft.author}*»`, { parse_mode: 'Markdown' })
    } else if (session.state === 'edit_title') {
      draft.title = text
      await ctx.reply(`✅ Название изменено на: «*${draft.title}*»`, { parse_mode: 'Markdown' })
    } else if (session.state === 'edit_pages') {
      const num = parseInt(text.replace(/\D/g, ''), 10)
      if (num && num > 0) {
        draft.pages = num
        await ctx.reply(`✅ Количество страниц: *${draft.pages}*`, { parse_mode: 'Markdown' })
      } else {
        return ctx.reply('Пожалуйста, введите число (например, `320`).')
      }
    }

    session.state = null
    userSessions.set(userId, session)

    // Обновляем карточку с книгой
    const caption = getDraftCaption(draft)
    const keyboard = getDraftKeyboard(draft)

    if (draft.coverUrl) {
      try {
        await ctx.replyWithPhoto(draft.coverUrl, {
          caption,
          parse_mode: 'Markdown',
          ...keyboard
        })
      } catch {
        await ctx.replyWithMarkdown(caption, keyboard)
      }
    } else {
      await ctx.replyWithMarkdown(caption, keyboard)
    }
    return
  }

  // 2. Если обычное сообщение — ищем или парсим книгу
  await ctx.sendChatAction('typing')

  let bookData = null
  if (text.startsWith('http://') || text.startsWith('https://')) {
    await ctx.reply('🔎 Загружаю данные по ссылке...')
    bookData = await fetchByUrl(text)
  } else {
    await ctx.reply(`🔎 Ищу книгу: «${text}»...`)
    bookData = await searchBook(text)
  }

  if (!bookData || !bookData.title) {
    return ctx.reply('😔 Не удалось найти книгу. Попробуйте ввести «Автор Название» точнее.')
  }

  const draft = {
    title: bookData.title,
    author: stripPatronymic(bookData.author),
    coverUrl: bookData.coverUrl,
    pages: bookData.pages || 350,
    status: 'want_to_read',
    format: 'paper',
    rating: null,
    tags: bookData.tags || [],
    review: bookData.description ? `Аннотация:\n${bookData.description.slice(0, 300)}...` : ''
  }

  userSessions.set(userId, { draft, state: null })

  const caption = getDraftCaption(draft)
  const keyboard = getDraftKeyboard(draft)

  if (draft.coverUrl) {
    try {
      await ctx.replyWithPhoto(draft.coverUrl, {
        caption,
        parse_mode: 'Markdown',
        ...keyboard
      })
    } catch {
      await ctx.replyWithMarkdown(caption, keyboard)
    }
  } else {
    await ctx.replyWithMarkdown(caption, keyboard)
  }
})

// Кнопка: редактировать автора
bot.action('edit_author', async (ctx) => {
  const userId = ctx.from.id
  const session = userSessions.get(userId)
  if (!session || !session.draft) return ctx.answerCbQuery('Сессия устарела.')

  session.state = 'edit_author'
  userSessions.set(userId, session)

  await ctx.answerCbQuery()
  await ctx.reply('✍️ *Напишите имя и фамилию автора* в ответном сообщении:', { parse_mode: 'Markdown' })
})

// Кнопка: редактировать название
bot.action('edit_title', async (ctx) => {
  const userId = ctx.from.id
  const session = userSessions.get(userId)
  if (!session || !session.draft) return ctx.answerCbQuery('Сессия устарела.')

  session.state = 'edit_title'
  userSessions.set(userId, session)

  await ctx.answerCbQuery()
  await ctx.reply('✍️ *Напишите точное название книги* в ответном сообщении:', { parse_mode: 'Markdown' })
})

// Кнопка: редактировать страницы
bot.action('edit_pages', async (ctx) => {
  const userId = ctx.from.id
  const session = userSessions.get(userId)
  if (!session || !session.draft) return ctx.answerCbQuery('Сессия устарела.')

  session.state = 'edit_pages'
  userSessions.set(userId, session)

  await ctx.answerCbQuery()
  await ctx.reply('📄 *Введите количество страниц* (числом):', { parse_mode: 'Markdown' })
})

// Обработка 4 статусов
bot.action(/^status_(.+)$/, async (ctx) => {
  const newStatus = ctx.match[1]
  const userId = ctx.from.id
  const session = userSessions.get(userId)
  if (!session || !session.draft) return ctx.answerCbQuery('Сессия устарела.')

  session.draft.status = newStatus
  userSessions.set(userId, session)

  const statusNames = {
    want_to_read: 'Хочу прочитать',
    reading: 'В процессе',
    read: 'Прочитано',
    abandoned: 'Брошено'
  }

  await ctx.answerCbQuery(`Выбрано: ${statusNames[newStatus] || newStatus}`)

  try {
    const caption = getDraftCaption(session.draft)
    const keyboard = getDraftKeyboard(session.draft)
    await ctx.editMessageCaption(caption, {
      parse_mode: 'Markdown',
      ...keyboard
    })
  } catch {
    try {
      await ctx.editMessageText(getDraftCaption(session.draft), {
        parse_mode: 'Markdown',
        ...getDraftKeyboard(session.draft)
      })
    } catch {}
  }
})

// Обработка 3 форматов
bot.action(/^format_(.+)$/, async (ctx) => {
  const newFormat = ctx.match[1]
  const userId = ctx.from.id
  const session = userSessions.get(userId)
  if (!session || !session.draft) return ctx.answerCbQuery('Сессия устарела.')

  session.draft.format = newFormat
  userSessions.set(userId, session)

  const formatNames = {
    paper: 'Бумага',
    audio: 'Аудио',
    ebook: 'Электронная'
  }

  await ctx.answerCbQuery(`Формат: ${formatNames[newFormat] || newFormat}`)

  try {
    const caption = getDraftCaption(session.draft)
    const keyboard = getDraftKeyboard(session.draft)
    await ctx.editMessageCaption(caption, {
      parse_mode: 'Markdown',
      ...keyboard
    })
  } catch {
    try {
      await ctx.editMessageText(getDraftCaption(session.draft), {
        parse_mode: 'Markdown',
        ...getDraftKeyboard(session.draft)
      })
    } catch {}
  }
})

// Отмена добавления книги
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

    const now = new Date()
    const readMonth = draft.status === 'read' ? now.getMonth() + 1 : null
    const readYear = draft.status === 'read' ? now.getFullYear() : null

    const { error: insertError } = await supabase.from('books').insert({
      id: bookId,
      title: draft.title,
      author_id: authorId,
      cover_url: draft.coverUrl || null,
      rating: draft.rating,
      status: draft.status,
      format: draft.format,
      pages: draft.pages,
      read_month: readMonth,
      read_year: readYear,
      review: draft.review || null
    })

    if (insertError) throw insertError

    await syncBookTags(bookId, draft.tags)

    userSessions.delete(userId)

    await ctx.replyWithMarkdown(
      `🎉 *Книга «${draft.title}» (${draft.author || 'Без автора'}) успешно добавлена в библиотеку!*\n\n` +
      `📄 Страниц: *${draft.pages}*\n` +
      `🌐 Открыть в трекере:\nhttps://reading-tracker-ten-rho.vercel.app/`
    )
  } catch (err) {
    console.error('Error saving book via Telegram bot:', err)
    ctx.reply('❌ Ошибка при сохранении в базу данных. Попробуйте еще раз.')
  }
})

// Экспорт для запуска
export async function startBot() {
  if (!BOT_TOKEN || BOT_TOKEN === 'dummy_token') {
    console.log('Telegram Bot Token не задан. Бот ожидает токен.')
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
