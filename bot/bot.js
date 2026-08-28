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

// Временное хранилище драфтов для сессий пользователей
const userDrafts = new Map()

// Убираем отчество у авторов
function stripPatronymic(author) {
  if (!author) return ''
  const parts = author.trim().split(/\s+/)
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
  return author.trim()
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

// Парсинг метаданных по URL
async function fetchByUrl(urlStr) {
  try {
    const res = await fetch(urlStr, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    })
    const html = await res.text()
    const $ = cheerio.load(html)

    let title = $('meta[property="og:title"]').attr('content') || $('title').text()
    let author = $('meta[name="author"]').attr('content') || $('[itemprop="author"]').text() || ''
    let coverUrl = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || ''
    let description = $('meta[property="og:description"]').attr('content') || ''
    let pages = 350

    // Чистка заголовка (например, " — книга на Литрес")
    title = title.replace(/\s*—\s*(?:книга на|купить на|читать на|скачать).*$/i, '').trim()
    title = title.replace(/\s*\|\s*Литрес.*$/i, '').trim()

    // Поиск страниц в тексте
    const pagesMatch = html.match(/(?:Объем|Количество страниц|страниц|стр\.)\s*[:—]?\s*(\d{2,4})/i)
    if (pagesMatch) {
      pages = parseInt(pagesMatch[1], 10)
    }

    return {
      title: title || 'Без названия',
      author: author.trim(),
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

// Команда /start
bot.start((ctx) => {
  ctx.replyWithMarkdown(
    `👋 *Привет! Я твой персональный книжный бот-ассистент.* 📚\n\n` +
    `Сюда ты можешь быстро отправлять книги со смартфона:\n` +
    `1. 🔗 *Ссылку на книгу* (с ЛитРес, LiveLib, Читай-Города или Лабиринта)\n` +
    `2. ✍️ *Название книги и автора* (например: \`Ю Несбё Снеговик\`)\n\n` +
    `Я сам найду обложку, страницы и автора, и добавлю книгу сразу в твой трекер!\n\n` +
    `🌐 *Твой трекер онлайн:* https://reading-tracker-ten-rho.vercel.app/`
  )
})

// Функция генерации клавиатуры для драфта
function getDraftKeyboard(draft) {
  const isWant = draft.status === 'want_to_read'
  const isReading = draft.status === 'reading'
  const isRead = draft.status === 'read'

  const isPaper = draft.format === 'paper'
  const isAudio = draft.format === 'audio'
  const isEbook = draft.format === 'ebook'

  return Markup.inlineKeyboard([
    [
      Markup.button.callback(isWant ? '💜 [Хочу прочитать]' : 'Хочу прочитать', 'status_want_to_read'),
      Markup.button.callback(isReading ? '💙 [В процессе]' : 'В процессе', 'status_reading'),
      Markup.button.callback(isRead ? '💚 [Прочитано]' : 'Прочитано', 'status_read'),
    ],
    [
      Markup.button.callback(isPaper ? '📖 [Бумага]' : '📖 Бумага', 'format_paper'),
      Markup.button.callback(isAudio ? '🎧 [Аудио]' : '🎧 Аудио', 'format_audio'),
      Markup.button.callback(isEbook ? '📱 [Электронная]' : '📱 Электронная', 'format_ebook'),
    ],
    [
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
    `📦 Формат: *${formatLabels[draft.format] || draft.format}*`
  )
}

// Обработка текстовых сообщений (ссылки или названия)
bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim()
  const userId = ctx.from.id

  await ctx.sendChatAction('typing')

  let bookData = null

  if (text.startsWith('http://') || text.startsWith('https://')) {
    ctx.reply('🔎 Загружаю данные по ссылке...')
    bookData = await fetchByUrl(text)
  } else {
    ctx.reply(`🔎 Ищу книгу: «${text}»...`)
    bookData = await searchBook(text)
  }

  if (!bookData || !bookData.title) {
    return ctx.reply('😔 Не удалось найти информацию о книге. Попробуйте написать «Автор - Название» точнее.')
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

  userDrafts.set(userId, draft)

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

// Обработка кнопок смены статуса
bot.action(/^status_(.+)$/, async (ctx) => {
  const newStatus = ctx.match[1]
  const userId = ctx.from.id
  const draft = userDrafts.get(userId)
  if (!draft) return ctx.answerCbQuery('Сессия устарела. Отправьте книгу заново.')

  draft.status = newStatus
  userDrafts.set(userId, draft)

  const statusNames = {
    want_to_read: 'Хочу прочитать',
    reading: 'В процессе',
    read: 'Прочитано',
    abandoned: 'Брошено'
  }

  await ctx.answerCbQuery(`Выбрано: ${statusNames[newStatus] || newStatus}`)

  try {
    const caption = getDraftCaption(draft)
    const keyboard = getDraftKeyboard(draft)
    await ctx.editMessageCaption(caption, {
      parse_mode: 'Markdown',
      ...keyboard
    })
  } catch {
    // В случае текстового сообщения без фото
    try {
      await ctx.editMessageText(getDraftCaption(draft), {
        parse_mode: 'Markdown',
        ...getDraftKeyboard(draft)
      })
    } catch {}
  }
})

// Обработка кнопок смены формата
bot.action(/^format_(.+)$/, async (ctx) => {
  const newFormat = ctx.match[1]
  const userId = ctx.from.id
  const draft = userDrafts.get(userId)
  if (!draft) return ctx.answerCbQuery('Сессия устарела. Отправьте книгу заново.')

  draft.format = newFormat
  userDrafts.set(userId, draft)

  const formatNames = {
    paper: 'Бумага',
    audio: 'Аудио',
    ebook: 'Электронная'
  }

  await ctx.answerCbQuery(`Выбран формат: ${formatNames[newFormat] || newFormat}`)

  try {
    const caption = getDraftCaption(draft)
    const keyboard = getDraftKeyboard(draft)
    await ctx.editMessageCaption(caption, {
      parse_mode: 'Markdown',
      ...keyboard
    })
  } catch {
    try {
      await ctx.editMessageText(getDraftCaption(draft), {
        parse_mode: 'Markdown',
        ...getDraftKeyboard(draft)
      })
    } catch {}
  }
})

// Сохранение книги в Supabase
bot.action('save_book', async (ctx) => {
  const userId = ctx.from.id
  const draft = userDrafts.get(userId)
  if (!draft) return ctx.answerCbQuery('Сессия устарела.')

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

    userDrafts.delete(userId)

    await ctx.replyWithMarkdown(
      `🎉 *Книга «${draft.title}» (${draft.author || 'Без автора'}) успешно добавлена в библиотеку!*\n\n` +
      `📄 Страниц: ${draft.pages}\n` +
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
