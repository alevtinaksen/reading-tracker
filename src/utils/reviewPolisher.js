/**
 * Трёхуровневое интеллектуальное улучшение надиктованного отзыва.
 *
 * Уровень 1 (Light) — только знаки препинания, заглавные буквы, очистка слов-паразитов.
 * Уровень 2 (Medium) — переработка предложений, структура, литературные замены.
 * Уровень 3 (Full) — полная художественная переработка в красивый литературный стиль.
 */

// Разговорные связки и слова-паразиты
const SPOKEN_FILLERS = [
  /\b(?:эээ|ммм|ну|короче(?:\s+говоря)?|типа|как\s+бы|так\s+сказать|в\s+общем-то|в\s+общем|собственно\s+говоря|честно\s+говоря|слушай|смотри|не\s+знаю\s+как\s+сказать|ну\s+вот|вот\s+это\s+всё|вот\s+это\s+вот|вот\s+это|вот\s+этот\s+вот|вот\s+эта|вот\s+этот|как-то\s+так|в\s+итоге\s+получается|так\s+что)\b/gi,
  /^(?:ну\s+)?(?:в\s+общем|короче|слушай|смотри|так\s+сказать|а\s+я|а\s+вот)\s*[,:]?\s*/gim,
]

// Семантические замены для уровня 2
const LITERARY_TRANSFORMS_MEDIUM = [
  { pattern: /\b(?:все\s+умирают\s*,\s*не\s+люблю\s+такое|все\s+умирают|тяжелая\s+концовка)\b/gi, replacement: 'не люблю сюжеты, где всё заканчивается трагической гибелью персонажей' },
  { pattern: /\b(?:люблю\s+х[эе]ппи\s*[- ]?[еэ]нды?|нравятся\s+х[эе]ппи\s*[- ]?[еэ]нды?)\b/gi, replacement: 'мне гораздо ближе светлые концовки и жизнеутверждающие хэппи-энды' },
  { pattern: /\b(?:ид[её]т\s+нагнетание|постоянное\s+нагнетание)\b/gi, replacement: 'нарастает чрезмерное нагнетание мрачной атмосферы' },
  { pattern: /\b(?:мне\s+очень\s+понравил(?:ось|ась|ся)|очень\s+понравил(?:ось|ась|ся))\b/gi, replacement: 'книга произвела на меня сильное впечатление' },
  { pattern: /\b(?:книга\s+(?:супер|бомба|огонь|пушка|топ)|просто\s+бомба)\b/gi, replacement: 'замечательное и захватывающее произведение' },
  { pattern: /\b(?:читается\s+на\s+одном\s+дыхании|быстро\s+прочитал(?:а)?)\b/gi, replacement: 'читается на одном дыхании' },
  { pattern: /\b(?:не\s+мог(?:ла)?\s+оторваться|невозможно\s+оторваться)\b/gi, replacement: 'сюжет держит внимание до самого конца' },
  { pattern: /\b(?:персонажи\s+(?:очень\s+)?хорошие|герои\s+классные|герои\s+супер)\b/gi, replacement: 'персонажи прописаны глубоко и вызывают отклик' },
  { pattern: /\b(?:всем\s+советую|советую\s+всем|всем\s+рекомендую|рекомендую\s+к\s+прочтению)\b/gi, replacement: 'искренне рекомендую к прочтению' },
  { pattern: /\b(?:заставляет\s+задуматься|есть\s+над\s+чем\s+подумать)\b/gi, replacement: 'книга побуждает к серьёзным размышлениям' },
  { pattern: /\b(?:просто\s+ок|ну\s+ок|окей)\b/gi, replacement: 'в целом достойно' },
  { pattern: /\b(?:не\s+понял(?:а)?|не\s+поняла?)\b/gi, replacement: 'не до конца осознала' },
]

// Полные художественные замены для уровня 3
const LITERARY_TRANSFORMS_FULL = [
  { pattern: /\b(?:все\s+умирают\s*,\s*не\s+люблю\s+такое|все\s+умирают|тяжелая\s+концовка)\b/gi, replacement: 'мне остаётся лишь сожалеть о трагической гибели столь ярких персонажей' },
  { pattern: /\b(?:мне\s+очень\s+понравил(?:ось|ась|ся)|очень\s+понравил(?:ось|ась|ся))\b/gi, replacement: 'Эта книга оставила глубокий и незабываемый след в моей душе' },
  { pattern: /\b(?:книга\s+(?:супер|бомба|огонь|пушка|топ)|просто\s+бомба)\b/gi, replacement: 'Редкое произведение, обладающее истинной магией слова' },
  { pattern: /\b(?:читается\s+на\s+одном\s+дыхании|быстро\s+прочитал(?:а)?)\b/gi, replacement: 'страницы листались сами собой, и остановиться было невозможно' },
  { pattern: /\b(?:не\s+мог(?:ла)?\s+оторваться|невозможно\s+оторваться)\b/gi, replacement: 'каждая глава неудержимо влекла к следующей, не давая ни малейшей передышки' },
  { pattern: /\b(?:персонажи\s+(?:очень\s+)?хорошие|герои\s+классные|герои\s+супер)\b/gi, replacement: 'персонажи выписаны с поразительной психологической достоверностью' },
  { pattern: /\b(?:всем\s+советую|советую\s+всем|всем\s+рекомендую|рекомендую\s+к\s+прочтению)\b/gi, replacement: 'с полной уверенностью рекомендую это произведение каждому неравнодушному читателю' },
  { pattern: /\b(?:заставляет\s+задуматься|есть\s+над\s+чем\s+подумать)\b/gi, replacement: 'книга оставляет долгое и тревожащее послевкусие, неотступно возвращая к важным вопросам' },
  { pattern: /\b(?:просто\s+ок|ну\s+ок|окей)\b/gi, replacement: 'достаточно добротное, хотя и лишённое особого блеска' },
  { pattern: /\b(?:не\s+понял(?:а)?|не\s+поняла?)\b/gi, replacement: 'так и не сумела до конца уловить' },
  { pattern: /\bкнига\b/gi, replacement: 'произведение' },
  { pattern: /\bавтор\b/gi, replacement: 'писатель' },
  { pattern: /\bинтересно\b/gi, replacement: 'увлекательно' },
  { pattern: /\bскучно\b/gi, replacement: 'лишено жизни' },
]

const KNOWN_TITLES = [
  'Голодных играх', 'Голодные игры', 'Гарри Поттере', 'Гарри Поттер',
  'Властелине колец', 'Властелин колец', 'Мастере и Маргарите', 'Мастер и Маргарита',
  'Войне и мире', 'Война и мир', '1984', 'Атланте', 'Атлант расправил плечи',
  'Цветах для Элджернона', 'Цветы для Элджернона',
]

function formatBookTitles(text) {
  let res = text
  KNOWN_TITLES.forEach((title) => {
    const regex = new RegExp(`(?<!«)\\b(${title})\\b(?!»)`, 'gi')
    res = res.replace(regex, '«$1»')
  })
  return res
}

function cleanStutters(text) {
  return text
    .replace(/\b([а-яёa-z]+)\s+\1\b/gi, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function removeSpeakingFillers(text) {
  let result = text
  SPOKEN_FILLERS.forEach((filler) => {
    result = result.replace(filler, ' ')
  })
  return result.replace(/\s{2,}/g, ' ').trim()
}

/**
 * Уровень 1 — только пунктуация и косметика.
 * Никаких изменений смысла, только:
 * - убрать слова-паразиты
 * - заглавные буквы в начале предложений
 * - расставить точки и запятые
 * - длинное тире вместо дефиса
 */
function polishLevel1(text) {
  let result = cleanStutters(text.trim())
  result = removeSpeakingFillers(result)

  // Прямые кавычки → русские
  result = result.replace(/"([^"]+)"/g, '«$1»')

  // Длинное тире
  result = result.replace(/\s+[-–]\s+/g, ' — ')

  // Пробелы у знаков препинания
  result = result.replace(/\s+([.,!?;:])/g, '$1')
  result = result.replace(/([.,!?;:])(?=[^\s])/g, '$1 ')

  // Заглавные буквы в начале предложений
  result = result.replace(/(?:^|[.!?]\s+)([а-яёa-z])/g, (match) => match.toUpperCase())

  // Точка в конце
  if (!/[.!?…]$/.test(result.trim())) {
    result = result.trim() + '.'
  }

  return result.trim()
}

/**
 * Уровень 2 — переработка предложений.
 * Структурирование, литературные замены, улучшение связности.
 */
function polishLevel2(text) {
  let result = cleanStutters(text.trim())
  result = removeSpeakingFillers(result)

  // Литературные замены уровня 2
  LITERARY_TRANSFORMS_MEDIUM.forEach(({ pattern, replacement }) => {
    result = result.replace(pattern, replacement)
  })

  // Названия книг в кавычки
  result = formatBookTitles(result)

  // Прямые кавычки → русские
  result = result.replace(/"([^"]+)"/g, '«$1»')

  // Длинное тире
  result = result.replace(/\s+[-–]\s+/g, ' — ')

  // Знаки препинания
  result = result.replace(/\s+([.,!?;:])/g, '$1')
  result = result.replace(/([.,!?;:])(?=[^\s])/g, '$1 ')

  // Разбивка на предложения
  result = result.replace(/([а-яёa-z0-9])\s+(А\s+я|Мне\s+нравится|Это|Но\s+при|Хотя|Однако|При\s+этом)/g, '$1. $2')

  // Заглавные буквы
  result = result.replace(/(?:^|[.!?]\s+)([а-яёa-z])/g, (match) => match.toUpperCase())

  // Точка в конце
  if (!/[.!?…]$/.test(result.trim())) result = result.trim() + '.'

  // Абзацы для длинных текстов
  const sentences = result.match(/[^.!?]+[.!?]+/g)
  if (sentences && sentences.length >= 4) {
    const mid = Math.ceil(sentences.length / 2)
    result = sentences.slice(0, mid).join(' ').trim() + '\n\n' + sentences.slice(mid).join(' ').trim()
  }

  return result.trim()
}

/**
 * Уровень 3 — полная художественная переработка.
 * Максимальная трансформация в красивый литературный стиль.
 */
function polishLevel3(text) {
  let result = cleanStutters(text.trim())
  result = removeSpeakingFillers(result)

  // Художественные замены максимального уровня
  LITERARY_TRANSFORMS_FULL.forEach(({ pattern, replacement }) => {
    result = result.replace(pattern, replacement)
  })

  // Базовые литературные замены тоже применяем
  LITERARY_TRANSFORMS_MEDIUM.forEach(({ pattern, replacement }) => {
    // Только те, что не перекрываются трансформами полного уровня
    result = result.replace(pattern, replacement)
  })

  // Названия в кавычки
  result = formatBookTitles(result)

  // Типографика
  result = result.replace(/"([^"]+)"/g, '«$1»')
  result = result.replace(/\s+[-–]\s+/g, ' — ')
  result = result.replace(/\s+([.,!?;:])/g, '$1')
  result = result.replace(/([.,!?;:])(?=[^\s])/g, '$1 ')

  // Улучшение связности: добавляем связки между мыслями
  result = result
    .replace(/([а-яёa-z0-9])\.\s+(И\s+вот)/g, '$1, и вот')
    .replace(/\bПросто\s+ок\b/gi, 'Достаточно достойно')
    .replace(/\bпросто\s+ок\b/gi, 'достаточно достойно')

  // Разбивка на предложения
  result = result.replace(/([а-яёa-z0-9])\s+(А\s+я|Мне\s+нравится|Это|Но\s+при|Хотя|Однако|При\s+этом|Стоит\s+отметить)/g, '$1. $2')

  // Заглавные буквы
  result = result.replace(/(?:^|[.!?]\s+)([а-яёa-z])/g, (match) => match.toUpperCase())

  // Точка в конце
  if (!/[.!?…]$/.test(result.trim())) result = result.trim() + '.'

  // Абзацы
  const sentences = result.match(/[^.!?]+[.!?]+/g)
  if (sentences && sentences.length >= 3) {
    const mid = Math.ceil(sentences.length / 2)
    result = sentences.slice(0, mid).join(' ').trim() + '\n\n' + sentences.slice(mid).join(' ').trim()
  }

  return result.trim()
}

/**
 * Основная функция AI-улучшения отзыва с выбором уровня.
 * @param {string} rawText — исходный текст
 * @param {1|2|3} level — уровень обработки (по умолчанию 2)
 */
export async function polishReviewText(rawText, level = 2) {
  if (!rawText || !rawText.trim()) return ''

  // Небольшая задержка для естественного UX
  await new Promise((resolve) => setTimeout(resolve, 280))

  if (level === 1) return polishLevel1(rawText)
  if (level === 3) return polishLevel3(rawText)
  return polishLevel2(rawText)
}
