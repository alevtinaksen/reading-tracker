/**
 * Умная обработка и улучшение надиктованного или сырого текста отзыва.
 * Превращает «поток мыслей» и устную речь в структурированный, красивый и живой книжный отзыв,
 * сохраняя все мысли, эмоции и оценку автора.
 */

// Список разговорных слов-паразитов и вводных междометий устной речи
const FILLER_PHRASES = [
  /^(?:ну\s+)?(?:в\s+общем|короче(?:\s+говоря)?|слушай|смотри|так\s+сказать|как\s+бы|типа|в\s+принципе|собственно\s+говоря|честно\s+говоря)\s*[,:]?\s*/gim,
  /\b(?:эээ|ммм|ну|короче|типа|как\s+бы|так\s+сказать|в\s+общем-то|в\s+общем)\b/gi,
]

// Исправление типичных устных оговорок и повторов
function removeStuttersAndDuplicates(text) {
  return text
    // Удаляем повторы слов подряд ("я я", "что что", "это это")
    .replace(/\b([а-яёa-z]+)\s+\1\b/gi, '$1')
    // Лишние пробелы и знаки
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// Умная пунктуация и капитализация
function formatSentences(text) {
  if (!text) return ''

  // Разбиваем на базовые предложения по точкам, восклицательным и вопросительным знакам
  let clean = text
    .replace(/\s*([.,!?;:])\s*/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim()

  // Замена кавычек на русские ёлочки
  clean = clean.replace(/"([^"]+)"/g, '«$1»')

  // Замена дефисов между словами на длинное тире
  clean = clean.replace(/\s+[-—–]\s+/g, ' — ')

  // Удаляем слова-паразиты
  FILLER_PHRASES.forEach((pattern) => {
    clean = clean.replace(pattern, (match, offset) => {
      // Оставляем пробел, если в середине предложения
      return offset === 0 ? '' : ' '
    })
  })

  // Нормализуем пробелы перед знаками
  clean = clean.replace(/\s+([.,!?;:])/g, '$1')
  clean = clean.replace(/([.,!?;:])(?=[^\s])/g, '$1 ')

  // Капитализация начала предложений
  clean = clean.replace(/(?:^|[.!?]\s+)([а-яёa-z])/g, (m) => m.toUpperCase())

  // Если в конце нет точки/знака — ставим точку
  if (!/[.!?…]$/.test(clean)) {
    clean += '.'
  }

  return clean
}

// Главная функция улучшения отзыва
export async function polishReviewText(rawText) {
  if (!rawText || !rawText.trim()) return ''

  // Небольшая визуальная задержка для естественного UX (350мс)
  await new Promise((resolve) => setTimeout(resolve, 350))

  let processed = removeStuttersAndDuplicates(rawText.trim())
  processed = formatSentences(processed)

  // Разбиваем длинный сплошной текст на аккуратные абзацы, если предложений много (3+)
  const sentences = processed.match(/[^.!?]+[.!?]+/g)
  if (sentences && sentences.length >= 4) {
    const mid = Math.ceil(sentences.length / 2)
    const p1 = sentences.slice(0, mid).join(' ').trim()
    const p2 = sentences.slice(mid).join(' ').trim()
    processed = `${p1}\n\n${p2}`
  }

  return processed
}
