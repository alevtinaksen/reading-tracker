import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = 'https://lyuczttevtovpjlndagt.supabase.co'
const supabaseAnonKey = 'sb_publishable_AleSKAWSvH4Fv9m0X2ly6g_A9elesfQ'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// База данных количества страниц для всех 61 книг библиотеки
const BOOK_PAGES_MAP = {
  "эмоциональный интеллект": 540,
  "7 шагов к стабильной самооценке": 256,
  "хрупкие люди": 352,
  "чернильно-черное сердце": 1024,
  "острые предметы": 320,
  "загадка этажа номер 12": 384,
  "алекс": 384,
  "зов кукушки": 480,
  "каштановый человечек": 640,
  "безмолвный пациент": 352,
  "дом страха": 352,
  "хороших девочек не убивают": 416,
  "тайный дневник верити": 320,
  "иногда я лгу": 384,
  "герой нашего времени": 224,
  "семь смертей эвелины хардкасл": 512,
  "ловушка для золушки": 224,
  "головоломка": 384,
  "смерть с уведомлением": 448,
  "бедные люди": 160,
  "как перестать беспокоиться и начать жить": 384,
  "атлас расправил плечи": 1392,
  "выйти из чата": 480,
  "нож": 544,
  "чемодан (сборник)": 160,
  "чемодан": 160,
  "вторая жизнь уве": 384,
  "the one. единственный": 416,
  "the one": 416,
  "правда о деле гарри квеберта": 704,
  "в её глазах": 384,
  "в ее глазах": 384,
  "квартира на двоих": 448,
  "собака баскервилей": 256,
  "хорошая девочка, дурная кровь": 480,
  "дурная кровь": 960,
  "на службе зла": 608,
  "смертельная белизна": 672,
  "камень, ножницы, бумага": 352,
  "посторонний в доме": 320,
  "супруги по соседству": 352,
  "милая девочка": 384,
  "его и ее": 416,
  "последняя миссис пэрриш": 416,
  "внутренняя опора": 240,
  "зеленый свет": 320,
  "биполярное расстройство: гид по выживанию для тех, кто часто не видит белой полосы": 304,
  "биполярное расстройство: гид по выживанию": 304,
  "идеальная няня": 224,
  "как ты умрешь": 384,
  "сеть смерти": 384,
  "тринадцатая карта": 384,
  "внутри убийцы": 416,
  "глазами жертвы": 416,
  "гибельное влияние": 384,
  "скрытые намерения": 384,
  "пламя одержимости": 384,
  "пятьдесят на пятьдесят": 448,
  "клан": 416,
  "молчание матерей": 384,
  "пурпурная сеть": 416,
  "цыганская невеста": 384,
  "тринадцатая сказка": 464,
  "шелкопряд": 512,
  "малютка": 384
}

async function run() {
  console.log('🔄 Загружаем книги из Supabase...')
  const { data: books, error } = await supabase.from('books').select('id, title, authors(name)')
  if (error) {
    console.error('Ошибка загрузки:', error)
    return
  }

  console.log(`📚 Всего книг: ${books.length}`)
  let updatedCount = 0

  const enrichedBooks = books.map((b) => {
    const key = (b.title || '').trim().toLowerCase()
    let pages = BOOK_PAGES_MAP[key]
    if (!pages) {
      // Ищем неполное совпадение
      for (const [k, p] of Object.entries(BOOK_PAGES_MAP)) {
        if (key.includes(k) || k.includes(key)) {
          pages = p
          break
        }
      }
    }
    if (!pages) pages = 350 // дефолтное значение

    return {
      id: b.id,
      title: b.title,
      author: b.authors?.name || '',
      pages: pages
    }
  })

  console.log('\n📊 Найденные страницы для всех книг:')
  enrichedBooks.forEach((b, i) => {
    console.log(`${i + 1}. «${b.title}» (${b.author}) — ${b.pages} стр.`)
  })

  // Сохраняем в JSON
  const outPath = path.join(process.cwd(), 'backups', 'books-with-pages.json')
  fs.writeFileSync(outPath, JSON.stringify(enrichedBooks, null, 2), 'utf-8')
  console.log(`\n💾 Сохранен обогащенный список в ${outPath}`)

  // Пробуем обновить Supabase (если колонка pages уже добавлена)
  for (const b of enrichedBooks) {
    const { error: updateError } = await supabase.from('books').update({ pages: b.pages }).eq('id', b.id)
    if (!updateError) {
      updatedCount++
    }
  }

  if (updatedCount > 0) {
    console.log(`✅ В Supabase успешно обновлено ${updatedCount} книг!`)
  } else {
    console.log(`ℹ️ Колонка pages в Supabase еще не создана.`)
    console.log(`👉 Чтобы применить эти страницы в Supabase навсегда, выполните в SQL Editor:`)
    console.log(`   ALTER TABLE books ADD COLUMN IF NOT EXISTS pages INTEGER;`)
    console.log(`   После этого запустите: node scripts/populate-pages.js`)
  }
}

run()
