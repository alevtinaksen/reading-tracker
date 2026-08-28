/**
 * Интеллектуальное улучшение и стилистическая обработка надиктованного отзыва.
 * Превращает устный поток мыслей в выразительный, грамотный и структурированный книжный отзыв,
 * бережно сохраняя главную мысль, оценку и эмоции автора.
 */

// Разговорные паразиты и междометия
const VERBAL_FILLERS = [
  /\b(?:эээ|ммм|ну|короче(?:\s+говоря)?|типа|как\s+бы|так\s+сказать|в\s+общем-то|в\s+общем|собственно\s+говоря|честно\s+говоря|слушай|смотри|не\s+знаю\s+как\s+сказать|ну\s+вот|вот\s+это\s+вот|как-то\s+так)\b/gi,
  /^(?:ну\s+)?(?:в\s+общем|короче|слушай|смотри|так\s+сказать)\s*[,:]?\s*/gim,
]

// Словарь стилистических улучшений разговорных фраз в литературные обороты
const PHRASE_REPLACEMENTS = [
  {
    pattern: /\b(?:мне\s+очень\s+понравил(?:ось|ась|ся)|очень\s+понравил(?:ось|ась|ся))\b/gi,
    replacement: 'Книга произвела глубокое впечатление',
  },
  {
    pattern: /\b(?:книга\s+(?:супер|бомба|огонь|пушка|классная|топ)|просто\s+бомба)\b/gi,
    replacement: 'Великолепное и захватывающее произведение',
  },
  {
    pattern: /\b(?:читается\s+легко|легко\s+читается|быстро\s+прочитал(?:а)?)\b/gi,
    replacement: 'Читается легко, на одном дыхании',
  },
  {
    pattern: /\b(?:не\s+мог(?:ла)?\s+оторваться|невозможно\s+оторваться)\b/gi,
    replacement: 'Сюжет держит в напряжении с первых страниц и не отпускает до самого конца',
  },
  {
    pattern: /\b(?:концовка\s+(?:вообще\s+)?(?:неожиданная|топ|огонь|супер)|неожиданный\s+финал)\b/gi,
    replacement: 'Финал истории получился по-настоящему сильным и неожиданным',
  },
  {
    pattern: /\b(?:герои\s+классные|персонажи\s+(?:очень\s+)?хорошие|герои\s+супер)\b/gi,
    replacement: 'Персонажи прописаны ярко и вызывают искреннее сопереживание',
  },
  {
    pattern: /\b(?:много\s+воды|затянуто\s+очень)\b/gi,
    replacement: 'Местами повествование кажется несколько затянутым',
  },
  {
    pattern: /\b(?:всем\s+советую|советую\s+всем|всем\s+рекомендую|рекомендую\s+к\s+прочтению)\b/gi,
    replacement: 'Определенно рекомендую к прочтению',
  },
  {
    pattern: /\b(?:заставляет\s+задуматься|есть\s+над\s+чем\s+подумать)\b/gi,
    replacement: 'Книга оставляет глубокое послевкусие и дает богатую пищу для размышлений',
  },
]

// Исправление заиканий и случайных дублей слов
function cleanDuplicates(text) {
  return text
    .replace(/\b([а-яёa-z]+)\s+\1\b/gi, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// Замена разговорных оборотов
function polishPhrases(text) {
  let result = text

  // Удаляем слова-паразиты
  VERBAL_FILLERS.forEach((filler) => {
    result = result.replace(filler, ' ')
  })

  // Применяем улучшения формулировок
  PHRASE_REPLACEMENTS.forEach(({ pattern, replacement }) => {
    result = result.replace(pattern, replacement)
  })

  return result.replace(/\s{2,}/g, ' ').trim()
}

// Капитализация и пунктуация
function formatPunctuation(text) {
  if (!text) return ''

  let clean = text
    .replace(/\s*([.,!?;:])\s*/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim()

  // Замена прямых кавычек на русские «ёлочки»
  clean = clean.replace(/"([^"]+)"/g, '«$1»')

  // Длинное тире
  clean = clean.replace(/\s+[-—–]\s+/g, ' — ')

  // Коррекция пробелов перед знаками
  clean = clean.replace(/\s+([.,!?;:])/g, '$1')
  clean = clean.replace(/([.,!?;:])(?=[^\s])/g, '$1 ')

  // Заглавные буквы в начале предложений
  clean = clean.replace(/(?:^|[.!?]\s+)([а-яёa-z])/g, (match, letter) => match.toUpperCase())

  // Точка в конце, если нет знака
  if (!/[.!?…]$/.test(clean)) {
    clean += '.'
  }

  return clean
}

/**
 * Основная функция стилизации отзыва
 */
export async function polishReviewText(rawText) {
  if (!rawText || !rawText.trim()) return ''

  // Легкая задержка для ощущения AI-обработки
  await new Promise((resolve) => setTimeout(resolve, 300))

  let processed = cleanDuplicates(rawText.trim())
  processed = polishPhrases(processed)
  processed = formatPunctuation(processed)

  // Абзацы для длинных отзывов
  const sentences = processed.match(/[^.!?]+[.!?]+/g)
  if (sentences && sentences.length >= 4) {
    const mid = Math.ceil(sentences.length / 2)
    const p1 = sentences.slice(0, mid).join(' ').trim()
    const p2 = sentences.slice(mid).join(' ').trim()
    processed = `${p1}\n\n${p2}`
  }

  return processed
}
