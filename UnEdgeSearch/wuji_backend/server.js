const express = require('express')
const Database = require('better-sqlite3')
const cors = require('cors')
const bodyParser = require('body-parser')
const axios = require('axios')
const cheerio = require('cheerio')
const cron = require('node-cron')
const { JSDOM } = require('jsdom')
const { Readability } = require('@mozilla/readability')

const app = express()
const PORT = 3000
const db = new Database('./wuji.db')
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'
const APP_NAME = '无极'
const DEVICE_STATUS_CONNECTED = 'connected'
const DEVICE_STATUS_DISCONNECTED = 'disconnected'

const HTTP_HEADERS = {
  'User-Agent': 'Mozilla/5.0'
}

const NEWS_SOURCES = [
  { name: 'news-cn-home', type: 'now', url: 'https://www.news.cn/' },
  { name: 'news-cn-politics', type: 'now', url: 'https://www.news.cn/politics/' },
  { name: 'news-cn-world', type: 'now', url: 'https://www.news.cn/world/' },
  { name: 'news-cn-local', type: 'now', url: 'https://www.news.cn/local/' },
  { name: 'news-cn-fortune', type: 'now', url: 'https://www.news.cn/fortune/' },
  { name: 'news-cn-tech', type: 'now', url: 'https://www.news.cn/tech/' }
]

const VIDEO_SOURCES = [
  { name: 'xinhua-video', type: '推荐', source: '新华视频', url: 'https://www.news.cn/video/index.html' },
  { name: 'people-video', type: '推荐', source: '人民视频', url: 'https://tv.people.com.cn/' },
  { name: 'cctv-pingan365', type: '健康', source: '央视视频', url: 'https://tv.cctv.com/lm/pingan365/' },
  { name: 'cctv-jiankangzhilu', type: '健康', source: '央视视频', url: 'https://tv.cctv.com/lm/jkzl/' },
  { name: 'cctv-shenghuoquan', type: '生活', source: '央视视频', url: 'https://tv.cctv.com/lm/shq/jingqie/index.shtml' },
  { name: 'cctv-meirinongjing', type: '三农', source: '央视视频', url: 'https://tv.cctv.com/lm/mrnj/' },
  { name: 'cctv-kejiyuan', type: '三农', source: '央视视频', url: 'https://tv.cctv.com/lm/kjy/' },
  { name: 'cctv-xiangtu', type: '三农', source: '央视视频', url: 'https://tv.cctv.com/lm/xtzg/videoset/index.shtml' },
  {
    name: 'bilibili-health-senior',
    type: '健康',
    source: '哔哩哔哩',
    url: 'https://search.bilibili.com/all?keyword=%E4%B8%AD%E8%80%81%E5%B9%B4%20%E5%81%A5%E5%BA%B7%E5%85%BB%E7%94%9F'
  },
  {
    name: 'bilibili-life-senior',
    type: '生活',
    source: '哔哩哔哩',
    url: 'https://search.bilibili.com/all?keyword=%E4%B8%AD%E8%80%81%E5%B9%B4%20%E7%94%9F%E6%B4%BB%E5%A6%99%E6%8B%9B'
  },
  {
    name: 'bilibili-farming',
    type: '三农',
    source: '哔哩哔哩',
    url: 'https://search.bilibili.com/all?keyword=%E5%86%9C%E4%B8%9A%E6%8A%80%E6%9C%AF%20%E4%B8%89%E5%86%9C'
  },
  {
    name: 'bilibili-audio-book',
    type: '小说',
    source: '哔哩哔哩',
    url: 'https://search.bilibili.com/all?keyword=%E6%9C%89%E5%A3%B0%E4%B9%A6%E6%9C%89%E5%A3%B0%E5%B0%8F%E8%AF%B4'
  },
  {
    name: 'bilibili-shuangwen',
    type: '小说',
    source: '哔哩哔哩',
    url: 'https://search.bilibili.com/all?keyword=%E7%88%BD%E6%96%87%20%E5%90%AC%E4%B9%A6'
  },
  {
    name: 'bilibili-pingshu',
    type: '小说',
    source: '哔哩哔哩',
    url: 'https://search.bilibili.com/all?keyword=%E8%AF%84%E4%B9%A6'
  },
  {
    name: 'bilibili-audio-drama',
    type: '小说',
    source: '哔哩哔哩',
    url: 'https://search.bilibili.com/all?keyword=%E6%9C%89%E5%A3%B0%E5%89%A7'
  },
  {
    name: 'bilibili-audio-story',
    type: '小说',
    source: '哔哩哔哩',
    url: 'https://search.bilibili.com/all?keyword=%E6%9C%89%E5%A3%B0%E5%B0%8F%E8%AF%B4%E6%9C%89%E5%A3%B0%E6%95%85%E4%BA%8B'
  },
  {
    name: 'bilibili-finished-novel',
    type: '小说',
    source: '哔哩哔哩',
    url: 'https://search.bilibili.com/all?keyword=%E6%9C%89%E5%A3%B0%E5%B0%8F%E8%AF%B4%E6%8E%92%E8%A1%8C%E6%A6%9C%E5%AE%8C%E6%9C%AC'
  },
  {
    name: 'bilibili-short-story',
    type: '小说',
    source: '哔哩哔哩',
    url: 'https://search.bilibili.com/all?keyword=%E7%9F%AD%E7%AF%87%E7%88%BD%E6%96%87%20%E5%90%AC%E4%B9%A6'
  },
  {
    name: 'bilibili-rebirth-novel',
    type: '小说',
    source: '哔哩哔哩',
    url: 'https://search.bilibili.com/all?keyword=%E9%87%8D%E7%94%9F%E9%80%86%E8%A2%AD%20%E6%9C%89%E5%A3%B0%E5%B0%8F%E8%AF%B4'
  }
]

const NOVEL_VIDEO_FALLBACK = [
  {
    type: '小说',
    source: '哔哩哔哩',
    title: '有声书《老衲要还俗》爆笑都市多人小说剧',
    play_url: 'https://www.bilibili.com/video/BV1afttz9EqU/',
    url: 'https://www.bilibili.com/video/BV1afttz9EqU/',
    time: '2025-08-10 14:00:00',
    desc: '轻松搞笑的长篇有声小说，适合慢慢听。'
  },
  {
    type: '小说',
    source: '哔哩哔哩',
    title: '有声书《太古神王》穿越玄幻爽文',
    play_url: 'https://www.bilibili.com/video/BV1hANRzqEod/',
    url: 'https://www.bilibili.com/video/BV1hANRzqEod/',
    time: '2025-06-22 18:44:08',
    desc: '玄幻爽文向的多人有声剧，节奏较快。'
  },
  {
    type: '小说',
    source: '哔哩哔哩',
    title: '小说剧《穿越修仙爽文》多人有声剧',
    play_url: 'https://www.bilibili.com/video/BV1RkK6zqENn/',
    url: 'https://www.bilibili.com/video/BV1RkK6zqENn/',
    time: '2025-06-27 19:41:29',
    desc: '偏轻松、偏爽文的修仙题材，适合喜欢长篇听书的老人。'
  }
]

const NOVEL_ARTICLE_SOURCES = [
  {
    name: 'fanqie-short-super',
    source: '番茄小说',
    url: 'https://fanqienovel.com/page/7530513739590667288'
  },
  {
    name: 'fanqie-short-stories',
    source: '番茄小说',
    url: 'https://fanqienovel.com/page/7529409701541317656'
  },
  {
    name: 'fanqie-short-collection',
    source: '番茄小说',
    url: 'https://fanqienovel.com/page/7542933715781962777'
  },
  {
    name: 'fanqie-short-finished',
    source: '番茄小说',
    url: 'https://fanqienovel.com/page/7383947887270431769'
  },
  {
    name: 'fanqie-short-story-list',
    source: '番茄小说',
    url: 'https://fanqienovel.com/page/7503099161063984153'
  },
  {
    name: 'fanqie-short-story',
    source: '番茄小说',
    url: 'https://fanqienovel.com/page/7419337135225834520'
  },
  {
    name: 'fanqie-rebirth-short',
    source: '番茄小说',
    url: 'https://fanqienovel.com/page/7286054310906069523'
  },
  {
    name: 'fanqie-rebirth-short-finished',
    source: '番茄小说',
    url: 'https://fanqienovel.com/page/7459444571701789208'
  },
  {
    name: 'fanqie-rural-rise',
    source: '番茄小说',
    url: 'https://fanqienovel.com/page/7386973572427680830'
  },
  {
    name: 'fanqie-short-story-extra',
    source: '番茄小说',
    url: 'https://fanqienovel.com/page/7419337135225834520'
  },
  {
    name: 'fanqie-rebirth-rise',
    source: '番茄小说',
    url: 'https://fanqienovel.com/page/7311842884360077886'
  }
]

const MIN_VIDEO_DATE = '2024-01-01'
const MAX_NOVEL_CONTENT_LENGTH = 120000
const FANQIE_GLYPH_START = 58344
const FANQIE_GLYPH_MAP = [
  'D', '在', '主', '特', '家', '军', '然', '表', '场', '4', '要', '只', 'v', '和', '?', '6', '别', '还', 'g',
  '现', '儿', '岁', '?', '?', '此', '象', '月', '3', '出', '战', '工', '相', 'o', '男', '首', '失', '世', 'F',
  '都', '平', '文', '什', 'V', 'O', '将', '真', 'T', '那', '当', '?', '会', '立', '些', 'u', '是', '十', '张',
  '学', '气', '大', '爱', '两', '命', '全', '后', '东', '性', '通', '被', '1', '它', '乐', '接', '而', '感',
  '车', '山', '公', '了', '常', '以', '何', '可', '话', '先', 'p', 'i', '叫', '轻', 'M', '士', 'w', '着', '变',
  '尔', '快', 'l', '个', '说', '少', '色', '里', '安', '花', '远', '7', '难', '师', '放', 't', '报', '认',
  '面', '道', 'S', '?', '克', '地', '度', 'I', '好', '机', 'U', '民', '写', '把', '万', '同', '水', '新', '没',
  '书', '电', '吃', '像', '斯', '5', '为', 'y', '白', '几', '日', '教', '看', '但', '第', '加', '候', '作',
  '上', '拉', '住', '有', '法', 'r', '事', '应', '位', '利', '你', '声', '身', '国', '问', '马', '女', '他',
  'Y', '比', '父', 'x', 'A', 'H', 'N', 's', 'X', '边', '美', '对', '所', '金', '活', '回', '意', '到', 'z',
  '从', 'j', '知', '又', '内', '因', '点', 'Q', '三', '定', '8', 'R', 'b', '正', '或', '夫', '向', '德', '听',
  '更', '?', '得', '告', '并', '本', 'q', '过', '记', 'L', '让', '打', 'f', '人', '就', '者', '去', '原', '满',
  '体', '做', '经', 'K', '走', '如', '孩', 'c', 'G', '给', '使', '物', '?', '最', '笑', '部', '?', '员', '等',
  '受', 'k', '行', '一', '条', '果', '动', '光', '门', '头', '见', '往', '自', '解', '成', '处', '天', '能',
  '于', '名', '其', '发', '总', '母', '的', '死', '手', '入', '路', '进', '心', '来', 'h', '时', '力', '多',
  '开', '己', '许', 'd', '至', '由', '很', '界', 'n', '小', '与', 'Z', '想', '代', '么', '分', '生', '口',
  '再', '妈', '望', '次', '西', '风', '种', '带', 'J', '?', '实', '情', '才', '这', '?', 'E', '我', '神', '格',
  '长', '觉', '间', '年', '眼', '无', '不', '亲', '关', '结', '0', '友', '信', '下', '却', '重', '己', '老',
  '2', '音', '字', 'm', '呢', '明', '之', '前', '高', 'P', 'B', '目', '太', 'e', '9', '起', '稜', '她', '也',
  'W', '用', '方', '子', '英', '每', '理', '便', '西', '数', '期', '中', 'C', '外', '样', 'a', '海', '们',
  '任'
]

let isSyncingNews = false
let lastSyncSummary = {
  startedAt: null,
  finishedAt: null,
  inserted: 0,
  skipped: 0,
  failed: 0,
  running: false
}

let isSyncingNovels = false
let lastNovelSyncSummary = {
  startedAt: null,
  finishedAt: null,
  inserted: 0,
  failed: 0,
  running: false
}

app.use(cors())
app.use(bodyParser.json())
app.use(express.static(__dirname))

db.exec(`
  CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    title TEXT,
    desc TEXT,
    time TEXT,
    url TEXT,
    image TEXT,
    images TEXT,
    blocks TEXT
  );

  CREATE TABLE IF NOT EXISTS search_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT,
    summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    title TEXT,
    desc TEXT,
    url TEXT,
    time TEXT,
    cover TEXT,
    source TEXT
  );

  CREATE TABLE IF NOT EXISTS novels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    desc TEXT,
    content TEXT,
    url TEXT,
    chapter_url TEXT,
    chapter_title TEXT,
    time TEXT,
    source TEXT,
    cover TEXT
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT UNIQUE,
    device_name TEXT,
    server_url TEXT,
    status TEXT DEFAULT 'connected',
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

try {
  db.exec(`ALTER TABLE news ADD COLUMN url TEXT`)
} catch (error) {
  // ignore when the column already exists
}

try {
  db.exec(`ALTER TABLE news ADD COLUMN image TEXT`)
} catch (error) {
  // ignore when the column already exists
}

try {
  db.exec(`ALTER TABLE news ADD COLUMN images TEXT`)
} catch (error) {
  // ignore when the column already exists
}

try {
  db.exec(`ALTER TABLE news ADD COLUMN blocks TEXT`)
} catch (error) {
  // ignore when the column already exists
}

try {
  db.exec(`ALTER TABLE videos ADD COLUMN cover TEXT`)
} catch (error) {
  // ignore when the column already exists
}

try {
  db.exec(`ALTER TABLE videos ADD COLUMN source TEXT`)
} catch (error) {
  // ignore when the column already exists
}

db.prepare(`
  INSERT INTO app_settings(key, value)
  VALUES (?, ?)
  ON CONFLICT(key) DO NOTHING
`).run('ai_summary_enabled', '1')

function getSetting(key, fallback = '') {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key)
  return row ? row.value : fallback
}

function getBooleanSetting(key, fallback = true) {
  const raw = getSetting(key, fallback ? '1' : '0')
  return raw === '1' || raw === 'true'
}

function setSetting(key, value) {
  return db
    .prepare(`
      INSERT INTO app_settings(key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `)
    .run(key, String(value))
}

function normalizeServerUrl(serverUrl) {
  return String(serverUrl || '').trim().replace(/\/+$/, '')
}

function upsertDevice({ deviceId, deviceName, serverUrl, status = DEVICE_STATUS_CONNECTED }) {
  const normalizedServerUrl = normalizeServerUrl(serverUrl)

  db.prepare(`
    INSERT INTO devices(device_id, device_name, server_url, status, last_seen_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(device_id) DO UPDATE SET
      device_name = excluded.device_name,
      server_url = excluded.server_url,
      status = excluded.status,
      last_seen_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  `).run(deviceId, deviceName || '未命名设备', normalizedServerUrl, status)

  return db.prepare('SELECT * FROM devices WHERE device_id = ?').get(deviceId)
}

function touchDevice(deviceId) {
  db.prepare(`
    UPDATE devices
    SET last_seen_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE device_id = ?
  `).run(deviceId)
  return db.prepare('SELECT * FROM devices WHERE device_id = ?').get(deviceId)
}

function disconnectDevice(deviceId) {
  return db.prepare(`
    UPDATE devices
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE device_id = ?
  `).run(DEVICE_STATUS_DISCONNECTED, deviceId)
}

function connectDevice(deviceId) {
  return db.prepare(`
    UPDATE devices
    SET status = ?, last_seen_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE device_id = ?
  `).run(DEVICE_STATUS_CONNECTED, deviceId)
}

function getPublicConfig() {
  return {
    appName: APP_NAME,
    aiSummaryEnabled: getBooleanSetting('ai_summary_enabled', true)
  }
}

function getDeviceById(deviceId) {
  return db.prepare('SELECT * FROM devices WHERE device_id = ?').get(deviceId)
}

function normalizeWhitespace(text) {
  return String(text || '')
    .replace(/\r/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

function cleanContent(text) {
  return normalizeWhitespace(text)
    .replace(/责任编辑[:：]?\s*.*$/g, '')
    .replace(/编辑[:：]?\s*.*$/g, '')
    .replace(/来源[:：]?\s*/g, '')
    .replace(/新华社消息[:：]?\s*/g, '')
    .replace(/字体[:：]?(小|中|大)/g, '')
    .replace(/\[纠错\]/g, '')
    .replace(/【纠错】/g, '')
    .replace(/\[责任编辑.*?\]/g, '')
    .replace(/【责任编辑.*?】/g, '')
    .replace(/返回首页.*$/g, '')
    .replace(/扫一扫.*$/g, '')
    .replace(/分享[:：]?\s*.*$/g, '')
    .replace(/版权所有.*$/g, '')
    .replace(/京ICP.*$/g, '')
    .trim()
}

function isJunkContent(text) {
  if (!text) return true

  const junkPatterns = [
    /隐私保护/,
    /版权所有/,
    /违法和不良信息/,
    /京ICP/,
    /扫一扫/,
    /返回首页/,
    /字体[:：]?(小|中|大)/,
    /责任编辑/,
    /\[纠错\]/,
    /【纠错】/,
    /xinwenxiansuo@staff\.cntv\.cn/,
    /正在阅读[:：]?/
  ]

  return junkPatterns.some((pattern) => pattern.test(text))
}

function isValidArticleImage(url, altText = '') {
  if (!url) return false

  const text = `${url} ${altText}`
  return !/logo|icon|ewm|qr|qrcode|weixin|wx\.png|share|avatar|allmedia|xinhuamm|涓撻|涓撴爮|娴锋姤|浜岀淮鐮亅banner/i.test(text)
}

async function fetchHtml(url) {
  const response = await axios.get(url, {
    timeout: 20000,
    headers: HTTP_HEADERS,
    family: 4
  })

  return response.data
}

function absoluteUrl(href, baseUrl) {
  if (!href) return ''
  if (href.startsWith('http')) return href

  try {
    return new URL(href, baseUrl).toString()
  } catch (error) {
    return ''
  }
}

function isNewsCnArticleUrl(url) {
  return (
    url.includes('www.news.cn/') &&
    url.endsWith('/c.html') &&
    /\/20\d{6}\//.test(url)
  )
}

function extractCandidatesFromList(html, source) {
  const $ = cheerio.load(html)
  const result = []
  const seenLinks = new Set()

  $('a').each((_, el) => {
    const href = absoluteUrl($(el).attr('href'), source.url)
    const title = cleanContent($(el).text())

    if (!isNewsCnArticleUrl(href)) return
    if (title.length < 8) return
    if (seenLinks.has(href)) return

    seenLinks.add(href)
    result.push({
      title,
      link: href,
      type: source.type
    })
  })

  return result.slice(0, 24)
}

function pickMetaContent($) {
  const candidates = [
    $('meta[property="og:description"]').attr('content'),
    $('meta[name="description"]').attr('content'),
    $('meta[name="Description"]').attr('content')
  ]

  for (const candidate of candidates) {
    const cleaned = cleanContent(candidate)
    if (cleaned.length >= 40 && !isJunkContent(cleaned)) {
      return cleaned
    }
  }

  return ''
}

function pickArticleImages($, articleUrl) {
  const metaCandidates = [
    $('meta[property="og:image"]').attr('content'),
    $('meta[name="og:image"]').attr('content'),
    $('meta[name="twitter:image"]').attr('content')
  ]

  const images = []
  const seen = new Set()

  const selectors = [
    '#detail img',
    '.detail img',
    '.article img',
    '.article-content img',
    '.content img',
    '.main-article img',
    '.pages_content img',
    '.article-main img',
    'article img',
  ]

  for (const selector of selectors) {
    $(selector).each((_, el) => {
      const src =
        $(el).attr('src') ||
        $(el).attr('data-src') ||
        $(el).attr('data-original') ||
        $(el).attr('data-url')
      const alt = $(el).attr('alt') || ''
      const parentText = $(el).parent().text() || ''

      const fullUrl = absoluteUrl(src, articleUrl)
      if (
        fullUrl &&
        !seen.has(fullUrl) &&
        isValidArticleImage(fullUrl, `${alt} ${parentText}`)
      ) {
        seen.add(fullUrl)
        images.push(fullUrl)
      }
    })

    if (images.length) {
      return images
    }
  }

  for (const candidate of metaCandidates) {
    const fullUrl = absoluteUrl(candidate, articleUrl)
    if (fullUrl && !seen.has(fullUrl) && isValidArticleImage(fullUrl)) {
      seen.add(fullUrl)
      images.push(fullUrl)
    }
  }

  return images
}

function pickArticleImage($, articleUrl) {
  return pickArticleImages($, articleUrl)[0] || ''
}

function extractOrderedBlocks($, articleUrl, rootSelector) {
  const root = $(rootSelector).first()
  if (!root.length) return []

  const blocks = []
  const seenImages = new Set()

  function walk(node) {
    if (!node) return
    const el = $(node)
    const tag = (node.tagName || '').toLowerCase()

    if (tag === 'p') {
      const text = cleanContent(el.text())
      if (text.length >= 20 && !isJunkContent(text)) {
        blocks.push({ type: 'text', content: text })
      }
      return
    }

    if (tag === 'img') {
      const src =
        el.attr('src') ||
        el.attr('data-src') ||
        el.attr('data-original') ||
        el.attr('data-url')
      const alt = el.attr('alt') || ''
      const fullUrl = absoluteUrl(src, articleUrl)

      if (fullUrl && !seenImages.has(fullUrl) && isValidArticleImage(fullUrl, alt)) {
        seenImages.add(fullUrl)
        blocks.push({ type: 'image', content: fullUrl })
      }
      return
    }

    el.contents().each((_, child) => walk(child))
  }

  root.contents().each((_, child) => walk(child))
  return blocks
}

function pickArticleBlocks($, articleUrl) {
  const roots = [
    '#detail',
    '.detail',
    '.article',
    '.article-content',
    '.content',
    '.main-article',
    'article'
  ]

  for (const rootSelector of roots) {
    const blocks = extractOrderedBlocks($, articleUrl, rootSelector)
    if (blocks.filter((item) => item.type === 'text').length >= 3) {
      return blocks
    }
  }

  return []
}

function extractWithReadability(html, url) {
  try {
    const dom = new JSDOM(html, { url })
    const reader = new Readability(dom.window.document)
    const article = reader.parse()

    if (!article || !article.content) return ''

    const $ = cheerio.load(article.content)
    const paragraphs = []

    $('p').each((_, el) => {
      const line = cleanContent($(el).text())
      if (line.length >= 20 && !isJunkContent(line)) {
        paragraphs.push(line)
      }
    })

    if (paragraphs.length >= 2) {
      return paragraphs.join('\n\n')
    }

    const fallback = cleanContent(article.textContent || '')
    return fallback.length >= 80 && !isJunkContent(fallback) ? fallback : ''
  } catch (error) {
    return ''
  }
}

function pickArticleParagraphs($) {
  const selectors = [
    '#detail p',
    '.detail p',
    '.article p',
    '.article-content p',
    '.content p',
    '.main-article p',
    'article p',
    'p'
  ]

  for (const selector of selectors) {
    const paragraphs = []

    $(selector).each((_, el) => {
      const line = cleanContent($(el).text())
      if (line.length >= 20 && !isJunkContent(line)) {
        paragraphs.push(line)
      }
    })

    if (paragraphs.length >= 3) {
      return paragraphs.join('\n\n')
    }
  }

  return ''
}

function pickPublishTime($) {
  const candidates = [
    cleanContent($('meta[property="article:published_time"]').attr('content')),
    cleanContent($('meta[name="publishdate"]').attr('content')),
    cleanContent($('meta[name="PubDate"]').attr('content')),
    cleanContent($('meta[name="pubdate"]').attr('content')),
    cleanContent($('.header-time').first().text()),
    cleanContent($('.info').first().text()),
    cleanContent($('body').text().match(/\d{4}年\d{2}月\d{2}日\s*\d{2}:\d{2}:\d{2}/)?.[0]),
    cleanContent($('body').text().match(/\d{4}-\d{2}-\d{2}\s*\d{2}:\d{2}/)?.[0])
  ]

  for (const candidate of candidates) {
    if (candidate && candidate.length >= 10) {
      return candidate
    }
  }

  return new Date().toLocaleString('zh-CN')
}

function extractDateOnly(value) {
  if (!value) return ''

  const normalized = String(value)
  const cnMatch = normalized.match(/(\d{4})年(\d{2})月(\d{2})日/)
  if (cnMatch) {
    return `${cnMatch[1]}-${cnMatch[2]}-${cnMatch[3]}`
  }

  const isoMatch = normalized.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
  }

  const parsed = new Date(normalized)
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(
      parsed.getDate()
    ).padStart(2, '0')}`
  }

  return ''
}

function resolveNewsType(publishTime) {
  const today = new Date()
  const todayText = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`

  return extractDateOnly(publishTime) === todayText ? 'now' : 'history'
}

function parseNewsDate(value) {
  if (!value) return null

  const dateOnly = extractDateOnly(value)
  if (dateOnly) {
    const parsed = new Date(`${dateOnly}T00:00:00`)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getNewsExpiryDate() {
  const cutoff = new Date()
  cutoff.setHours(0, 0, 0, 0)
  cutoff.setDate(cutoff.getDate() - 30)
  return cutoff
}

async function fetchArticleDetail(item) {
  try {
    const html = await fetchHtml(item.link)
    const $ = cheerio.load(html)
    const directBody = pickArticleParagraphs($)
    const readabilityBody = extractWithReadability(html, item.link)
    const metaSummary = pickMetaContent($)
    const images = pickArticleImages($, item.link)
    const blocks = pickArticleBlocks($, item.link)

    const desc = [directBody, readabilityBody, metaSummary]
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)[0]

    if (!desc || desc.length < 80 || isJunkContent(desc)) {
      return { status: 'skipped' }
    }

    const publishTime = pickPublishTime($)

    return {
      status: 'ok',
      detail: {
        title: item.title,
        desc,
        type: resolveNewsType(publishTime),
        time: publishTime,
        url: item.link,
        image: images[0] || '',
        images: JSON.stringify(images),
        blocks: JSON.stringify(blocks)
      }
    }
  } catch (error) {
    console.log('article fetch failed:', item.link, error.message)
    return { status: 'failed' }
  }
}

async function collectLatestNews() {
  const collected = []
  const seenTitles = new Set()
  let failed = 0
  let skipped = 0

  for (const source of NEWS_SOURCES) {
    try {
      const listHtml = await fetchHtml(source.url)
      const candidates = extractCandidatesFromList(listHtml, source)

      for (const candidate of candidates) {
        if (seenTitles.has(candidate.title)) continue

        const result = await fetchArticleDetail(candidate)
        if (result.status === 'failed') {
          failed += 1
          continue
        }
        if (result.status === 'skipped') {
          skipped += 1
          continue
        }

        const detail = result.detail

        seenTitles.add(detail.title)
        collected.push(detail)

        if (collected.length >= 20) {
          return { items: collected, failed, skipped }
        }
      }
    } catch (error) {
      failed += 1
      console.log(`source fetch failed [${source.name}]:`, error.message)
    }
  }

  return { items: collected, failed, skipped }
}

function refreshNewsTypesAndPurge() {
  const rows = db.prepare('SELECT id, time FROM news').all()
  const updateType = db.prepare('UPDATE news SET type = ? WHERE id = ?')
  const deleteById = db.prepare('DELETE FROM news WHERE id = ?')
  const cutoff = getNewsExpiryDate()

  const transaction = db.transaction((records) => {
    for (const record of records) {
      const parsed = parseNewsDate(record.time)

      if (parsed && parsed < cutoff) {
        deleteById.run(record.id)
        continue
      }

      updateType.run(resolveNewsType(record.time), record.id)
    }
  })

  transaction(rows)
}

function mergeLatestNews(items) {
  const insertNews = db.prepare(
    'INSERT INTO news (title, desc, type, time, url, image, images, blocks) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )
  const updateNewsById = db.prepare(
    'UPDATE news SET title = ?, desc = ?, type = ?, time = ?, url = ?, image = ?, images = ?, blocks = ? WHERE id = ?'
  )
  const findByUrl = db.prepare('SELECT id FROM news WHERE url = ? LIMIT 1')
  const findByTitleAndDate = db.prepare(
    'SELECT id FROM news WHERE title = ? AND time = ? LIMIT 1'
  )

  const transaction = db.transaction((records) => {
    for (const record of records) {
      const normalizedType = resolveNewsType(record.time)
      const existing =
        (record.url ? findByUrl.get(record.url) : null) ||
        findByTitleAndDate.get(record.title, record.time)

      if (existing) {
        updateNewsById.run(
          record.title,
          record.desc,
          normalizedType,
          record.time,
          record.url || '',
          record.image || '',
          record.images || '[]',
          record.blocks || '[]',
          existing.id
        )
      } else {
        insertNews.run(
          record.title,
          record.desc,
          normalizedType,
          record.time,
          record.url || '',
          record.image || '',
          record.images || '[]',
          record.blocks || '[]'
        )
      }
    }

    refreshNewsTypesAndPurge()
  })

  transaction(items)
}

function clearNewsByType(type) {
  if (type) {
    return db.prepare('DELETE FROM news WHERE type = ?').run(type)
  }

  return db.prepare('DELETE FROM news').run()
}

function isTvCctvVideoUrl(url) {
  return url.includes('tv.cctv.com/') && url.endsWith('.shtml')
}

function isBilibiliVideoUrl(url) {
  return /bilibili\.com\/video\//.test(url)
}

function isPeopleVideoUrl(url) {
  return /v\.people\.cn\//.test(url) || /tv\.people\.com\.cn\//.test(url)
}

function isXinhuaVideoUrl(url) {
  return (
    (url.includes('news.cn/video/') || url.includes('fms.news.cn') || url.includes('fms.xinhuanet.com')) &&
    !url.includes('index.html')
  )
}

function cleanVideoTitle(text) {
  return normalizeWhitespace(text).replace(/\s*预告片\s*/g, '').trim()
}

function isNovelVideoCandidate(title, desc = '') {
  const text = `${title} ${desc}`.toLowerCase()
  const includePattern = /小说|有声书|有声小说|听书|评书|爽文|多人有声|多人小说剧|长篇|有声剧|完结|全集|连续播讲/
  const excludePattern = /游戏|直播|鬼畜|音乐|舞蹈|动漫|电影解说|影视剪辑|mad|mmd|教程|剪辑/
  return includePattern.test(text) && !excludePattern.test(text)
}

function isFreshVideoTime(value) {
  const dateOnly = extractDateOnly(value)
  if (!dateOnly) return false
  return dateOnly >= MIN_VIDEO_DATE
}

function isVideoLandingPage($, html, url) {
  if (isTvCctvVideoUrl(url) || isBilibiliVideoUrl(url) || isPeopleVideoUrl(url)) {
    return true
  }

  const metaSignals = [
    $('meta[property="og:video"]').attr('content'),
    $('meta[property="og:video:url"]').attr('content'),
    $('meta[name="twitter:player"]').attr('content')
  ].filter(Boolean)

  if (metaSignals.length) {
    return true
  }

  if ($('video').length || $('iframe').length) {
    return true
  }

  return /(player|videoCenterId|vodfile|mp4|m3u8|视频简介)/i.test(html)
}

function pickNearbyImage($, el, pageUrl) {
  const lookups = [
    $(el).find('img').first(),
    $(el).prevAll('img').first(),
    $(el).parent().find('img').first(),
    $(el).closest('li').find('img').first(),
    $(el).closest('div').find('img').first()
  ]

  for (const node of lookups) {
    if (!node || !node.length) continue

    const src =
      node.attr('src') ||
      node.attr('data-src') ||
      node.attr('data-original') ||
      node.attr('data-url')

    const fullUrl = absoluteUrl(src, pageUrl)
    if (fullUrl && isValidArticleImage(fullUrl)) {
      return fullUrl
    }
  }

  return ''
}

function extractVideoCandidatesFromPage(html, source) {
  const $ = cheerio.load(html)
  const result = []
  const seen = new Set()

  if (source.source === '哔哩哔哩') {
    const stateScript = $('script')
      .map((_, el) => $(el).html() || '')
      .get()
      .find((item) => item.includes('__INITIAL_STATE__'))

    if (stateScript) {
      const stateMatch = stateScript.match(/__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})\s*;\s*\(function/)

      if (stateMatch?.[1]) {
        try {
          const state = JSON.parse(stateMatch[1])
          const candidates = [
            ...(state?.allData?.video || []),
            ...(state?.showResults?.video || []),
            ...(state?.showResults?.result || [])
          ]

          for (const item of candidates) {
            const href = absoluteUrl(item.arcurl || item.url || item.goto_url, source.url)
            const title = cleanVideoTitle(cleanContent(String(item.title || '').replace(/<[^>]+>/g, '')))
            const desc = cleanContent(item.description || item.desc || '')
            const cover = absoluteUrl(item.pic || item.cover, source.url)
            const time = item.pubdate
              ? new Date(item.pubdate * 1000).toLocaleString('zh-CN')
              : cleanContent(item.pub_time || '')

            if (!isBilibiliVideoUrl(href)) continue
            if (title.length < 6) continue
            if (source.type === '小说' && !isNovelVideoCandidate(title, desc)) continue
            if (seen.has(href)) continue

            seen.add(href)
            result.push({
              type: source.type,
              source: source.source,
              title,
              play_url: href,
              cover,
              desc: desc.slice(0, 90),
              time,
              url: href
            })
          }
        } catch (error) {
          // fallback to anchor parsing
        }
      }
    }
  }

  $('a').each((_, el) => {
    const href = absoluteUrl($(el).attr('href'), source.url)
    const title = cleanVideoTitle($(el).attr('title') || $(el).text())
    const desc = cleanContent(
      $(el).attr('data-title') ||
        $(el).parent().text() ||
        $(el).closest('div').text()
    )

    const isValidLink = isTvCctvVideoUrl(href) || isXinhuaVideoUrl(href) || isPeopleVideoUrl(href)
    const isNovelLink = source.type === '小说' && isBilibiliVideoUrl(href)
    if (!isValidLink && !isNovelLink) return
    if (title.length < 6) return
    if (source.type === '小说' && !isNovelVideoCandidate(title, desc)) return
    if (seen.has(href)) return

    seen.add(href)
    result.push({
      type: source.type,
      source: source.source,
      title,
      play_url: href,
      cover: pickNearbyImage($, el, source.url),
      desc: source.type === '小说' ? desc.slice(0, 90) : '',
      time: '',
      url: href
    })
  })

  return result.slice(0, 24)
}

async function enrichVideoDetail(item) {
  try {
    const html = await fetchHtml(item.play_url)
    const $ = cheerio.load(html)

    if (!isVideoLandingPage($, html, item.play_url)) {
      return null
    }

    const descCandidates = [
      $('meta[property="og:description"]').attr('content'),
      $('meta[name="description"]').attr('content'),
      $('meta[name="Description"]').attr('content'),
      $('.text').first().text(),
      $('.video-info').first().text(),
      $('.cnt_bd').first().text(),
      $('.content').first().text()
    ]

    let desc = ''
    for (const candidate of descCandidates) {
      const cleaned = cleanContent(candidate)
      if (cleaned.length >= 20 && !isJunkContent(cleaned)) {
        desc = cleaned.slice(0, 90)
        break
      }
    }

    const timeCandidates = [
      cleanContent($('meta[property="article:published_time"]').attr('content')),
      cleanContent($('meta[name="publishdate"]').attr('content')),
      cleanContent($('meta[name="pubdate"]').attr('content')),
      cleanContent($('.info').first().text()),
      cleanContent($('body').text().match(/\d{4}年\d{2}月\d{2}日\s*\d{2}:\d{2}/)?.[0]),
      cleanContent($('body').text().match(/\d{4}-\d{2}-\d{2}\s*\d{2}:\d{2}/)?.[0])
    ]

    let time = item.time
    for (const candidate of timeCandidates) {
      if (candidate && candidate.length >= 10) {
        time = candidate
        break
      }
    }

    if (!isFreshVideoTime(time || item.time)) {
      return null
    }

    const cover = item.cover || pickNearbyImage($, $('body'), item.play_url)

    return {
      ...item,
      desc: desc || '点击查看原视频内容。',
      time: time || new Date().toLocaleString('zh-CN'),
      cover
    }
  } catch (error) {
    return isFreshVideoTime(item.time)
      ? {
          ...item,
          desc: item.desc || '点击查看原视频内容。',
          time: item.time || new Date().toLocaleString('zh-CN')
        }
      : null
  }
}

async function collectLatestVideos() {
  const collected = []
  const seenLinks = new Set()
  let failed = 0
  let hasNovelVideos = false

  for (const source of VIDEO_SOURCES) {
    try {
      const listHtml = await fetchHtml(source.url)
      const candidates = extractVideoCandidatesFromPage(listHtml, source)

      for (const candidate of candidates) {
        if (seenLinks.has(candidate.play_url)) continue

        const detail = await enrichVideoDetail(candidate)
        if (!detail) continue

        seenLinks.add(detail.play_url || detail.url || '')
        collected.push(detail)
        if (detail.type === '小说') {
          hasNovelVideos = true
        }

        if (collected.length >= 48) {
          return { items: collected, failed }
        }
      }
    } catch (error) {
      failed += 1
      console.log(`video source fetch failed [${source.name}]:`, error.message)
    }
  }

  if (!hasNovelVideos) {
    for (const candidate of NOVEL_VIDEO_FALLBACK) {
      if (seenLinks.has(candidate.play_url)) continue

      const detail = await enrichVideoDetail(candidate)
      if (!detail) continue

      seenLinks.add(detail.play_url || detail.url || '')
      collected.push(detail)

      if (collected.length >= 48) {
        break
      }
    }
  }

  return { items: collected, failed }
}

function dedupeVideoItems(items) {
  const unique = []
  const seen = new Set()

  for (const item of items || []) {
    const key = item.play_url || item.url || `${item.title}|${item.time}`
    if (!key || seen.has(key)) continue
    seen.add(key)
    unique.push(item)
  }

  return unique
}

function replaceLatestVideos(items) {
  const clearVideos = db.prepare('DELETE FROM videos')
  const insertVideo = db.prepare(
    'INSERT INTO videos (type, title, desc, url, time, cover, source) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )

  const transaction = db.transaction((records) => {
    clearVideos.run()

    for (const record of records) {
      insertVideo.run(
        record.type,
        record.title,
        record.desc,
        record.play_url || record.url || '',
        record.time || '',
        record.cover || '',
        record.source || ''
      )
    }
  })

  transaction(items)
}

async function fetchAllVideos() {
  console.log('video sync started')

  const { items, failed } = await collectLatestVideos()
  const dedupedItems = dedupeVideoItems(items)
  if (dedupedItems.length > 0) {
    replaceLatestVideos(dedupedItems)
  }

  console.log('video sync finished:', { inserted: dedupedItems.length, failed })
  return { inserted: dedupedItems.length, failed }
}

function cleanNovelContent(text) {
  return normalizeNovelPunctuation(
    decodeFanqieText(String(text || ''))
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[\ue000-\uf8ff]/g, '')
    .replace(/番茄小说提供.*?在线免费阅读[，,。]?/g, '')
    .replace(/精彩小说尽在番茄小说网[，,。]?/g, '')
    .replace(/新作品出炉.*$/gm, '')
    .replace(/欢迎大家前往番茄小说阅读我的作品.*$/gm, '')
    .replace(/希望大家能够喜欢.*$/gm, '')
    .replace(/你们的关注是我写书的动力.*$/gm, '')
    .replace(/我会努力讲好每个故事.*$/gm, '')
    .replace(/你需要开通会员.*$/gm, '')
    .replace(/继续阅读请下载.*$/gm, '')
    .replace(/打开番茄小说.*$/gm, '')
    .replace(/喜欢.*请大家收藏.*$/gm, '')
    .replace(/请收藏.*?本站.*?/g, '')
    .replace(/最新网址.*?$/gm, '')
    .replace(/手机用户请浏览.*?$/gm, '')
    .replace(/天才一秒记住.*?$/gm, '')
    .replace(/笔趣阁.*?免费阅读.*?$/gm, '')
    .replace(/上一章.*?下一章.*?$/gm, '')
    .replace(/加入书签.*?$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  )
}

function decodeFanqieText(text) {
  return Array.from(String(text || ''), (char) => {
    const code = char.charCodeAt(0)
    const mapped = FANQIE_GLYPH_MAP[code - FANQIE_GLYPH_START]
    return mapped && mapped !== '?' ? mapped : char
  }).join('')
}

function isShortNovelCandidate(title = '', desc = '', chapterTitle = '') {
  const text = `${title} ${desc} ${chapterTitle}`
  return /短篇|短篇小说|微小说|小小说|故事会|睡前故事|情感故事|民间故事|寓言故事|爽文|逆袭|重生|打脸|甜文|完结/.test(text)
}

function isGenericNovelTitle(title = '') {
  const normalized = cleanContent(title)
  return (
    !normalized ||
    /第[0-9一二三四五六七八九十百千万两零]+本书$/.test(normalized) ||
    /^.{1,12}的第[0-9一二三四五六七八九十百千万两零]+本书$/.test(normalized) ||
    /^作品合集$/.test(normalized) ||
    /^短篇小说短篇故事$/.test(normalized) ||
    /合集$/.test(normalized) ||
    /短篇故事$/.test(normalized)
  )
}

function extractStoryTitleFromText(text = '') {
  const normalized = cleanNovelContent(text)
  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  for (const line of lines.slice(0, 8)) {
    const quotedMatch = line.match(/^第.{1,20}[章节回集]\s*[《“「]?([^》”」\n]{2,40})[》”」]?$/)
    if (quotedMatch?.[1]) return cleanContent(quotedMatch[1])

    const compactMatch = line.match(/^[《“「]([^》”」\n]{2,40})[》”」]$/)
    if (compactMatch?.[1]) return cleanContent(compactMatch[1])
  }

  return ''
}

function normalizeNovelTitle(pageTitle = '', firstChapterTitle = '', content = '') {
  const cleanedPageTitle = cleanContent(pageTitle)
  const cleanedChapterTitle = cleanContent(firstChapterTitle).replace(/^第.{1,20}[章节回集]\s*/, '')
  const contentTitle = extractStoryTitleFromText(content)

  if (contentTitle) {
    return contentTitle.slice(0, 40)
  }

  if (isGenericNovelTitle(cleanedPageTitle) && cleanedChapterTitle) {
    return cleanedChapterTitle.slice(0, 40)
  }

  return cleanedPageTitle
}

function extractShortNovelPageDetail(html, source) {
  const $ = cheerio.load(html)
  const rawTitle = cleanContent(
    $('h1').first().text() ||
      $('title').text().split('-')[0] ||
      $('meta[property="og:title"]').attr('content')
  )

  const desc = cleanContent(
    $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      $('body').text()
  )

  const bodyText = $('body').text()
  const wordCountMatch = bodyText.match(/(\d+(?:\.\d+)?)万字|(\d+)字/)
  const chapterEntries = $('a')
    .map((_, el) => {
      const href = absoluteUrl($(el).attr('href'), source.url)
      const text = cleanContent($(el).text())
      return { href, text }
    })
    .get()
    .filter((item) => /fanqienovel\.com\/reader\//.test(item.href) && /^第.{1,20}[章节回集]/.test(item.text))
    .slice(0, 18)

  const chapterTitles = chapterEntries.map((item) => item.text)

  let wordCount = 0
  if (wordCountMatch) {
    if (wordCountMatch[1]) {
      wordCount = Math.round(Number.parseFloat(wordCountMatch[1]) * 10000)
    } else if (wordCountMatch[2]) {
      wordCount = Number.parseInt(wordCountMatch[2], 10)
    }
  }

  const chapterOutline = chapterTitles.length
    ? `章节梗概：\n${chapterTitles.map((item, index) => `${index + 1}. ${item}`).join('\n')}`
    : ''

  const content = cleanNovelContent(`${desc}\n\n${chapterOutline}`)
  const title = normalizeNovelTitle(rawTitle, chapterTitles[0] || '', content)
  const cover = absoluteUrl(
    $('meta[property="og:image"]').attr('content') || $('img').first().attr('src'),
    source.url
  )

  if (!title) return null
  if (!isShortNovelCandidate(title, desc, chapterTitles.join(' '))) return null
  if (chapterTitles.length > 18) return null
  if (wordCount && wordCount > 120000) return null
  if (content.length < 80 || content.length > MAX_NOVEL_CONTENT_LENGTH) return null

  return {
    title,
    desc: desc.slice(0, 90) || '短篇爽文，支持语音朗读。',
    content,
    url: source.url,
    chapter_url: chapterEntries[0]?.href || source.url,
    chapter_title: chapterTitles[0] || '',
    time: new Date().toLocaleString('zh-CN'),
    source: source.source,
    cover,
    chapter_links: chapterEntries
  }
}

function extractReadableParagraphsFromChapterHtml(html) {
  const $ = cheerio.load(html)
  const selectorRoots = [
    $('.muye-reader-content').first(),
    $('[class*="reader"]').first(),
    $('[class*="content"]').first(),
    $('article').first(),
    $('main').first()
  ]

  for (const root of selectorRoots) {
    const blockTexts = root
      .find('h1, h2, h3, h4, p, div, li')
      .map((_, el) => cleanNovelContent($(el).text()))
      .get()
      .filter((item, index, array) => item && item.length >= 2 && array.indexOf(item) === index)

    const cleaned = cleanNovelContent(blockTexts.join('\n\n') || root.text())
    if (cleaned.length >= 180) {
      return cleaned
    }
  }

  const bodyText = cleanNovelContent($('body').text())
  return bodyText.length >= 180 ? bodyText : ''
}

async function hydrateShortNovelContent(detail) {
  const chapterLinks = Array.isArray(detail.chapter_links) ? detail.chapter_links : []
  if (!chapterLinks.length) return null

  const contentParts = []
  const limit = Math.min(chapterLinks.length, 18)

  for (let index = 0; index < limit; index += 1) {
    try {
      const chapter = chapterLinks[index]
      const html = await fetchHtml(chapter.href)
      const chapterText = extractReadableParagraphsFromChapterHtml(html)

      if (chapterText) {
        contentParts.push(`${chapter.text}\n${chapterText}`)
      }
    } catch (error) {
      // continue with next chapter
    }
  }

  const mergedContent = cleanNovelContent(contentParts.join('\n\n'))
  if (mergedContent.length >= 180) {
    const normalizedTitle = normalizeNovelTitle(
      detail.title,
      chapterLinks[0]?.text || detail.chapter_title || '',
      mergedContent
    )
    return {
      ...detail,
      title: normalizedTitle,
      content: mergedContent
    }
  }

  return null
}

function normalizeNovelPunctuation(text) {
  return String(text || '')
    .replace(/[ \t]+/g, ' ')
    .replace(/([一-龥]),/g, '$1，')
    .replace(/([一-龥])!/g, '$1！')
    .replace(/([一-龥])\?/g, '$1？')
    .replace(/([一-龥]);/g, '$1；')
    .replace(/([一-龥]):/g, '$1：')
    .replace(/([。！？；：，、])\1+/g, '$1')
    .replace(/[ ]+([，。！？；：、])/g, '$1')
    .replace(/([“‘「『])\s+/g, '$1')
    .replace(/\s+([”’」』])/g, '$1')
    .replace(/([。！？])(?=[^\n”’」』])/g, '$1\n\n')
    .replace(/(第.{1,20}[章节回集])/g, '\n\n$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function collectLatestNovelArticles() {
  const collected = []

  for (const source of NOVEL_ARTICLE_SOURCES) {
    try {
      const html = await fetchHtml(source.url)
      const summaryDetail = extractShortNovelPageDetail(html, source)
      const detail = summaryDetail ? await hydrateShortNovelContent(summaryDetail) : null
      if (detail) {
        collected.push(detail)
      }
    } catch (error) {
      console.log(`novel source fetch failed [${source.name}]:`, error.message)
    }
  }

  return collected
}

function dedupeNovelItems(items) {
  const unique = []
  const seen = new Set()

  for (const item of items || []) {
    const key = item.chapter_url || item.url || `${item.title}|${item.chapter_title || ''}`
    if (!key || seen.has(key)) continue
    seen.add(key)
    unique.push(item)
  }

  return unique
}

function replaceLatestNovels(items) {
  const clearNovels = db.prepare('DELETE FROM novels')
  const insertNovel = db.prepare(
    'INSERT INTO novels (title, desc, content, url, chapter_url, chapter_title, time, source, cover) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  )

  const transaction = db.transaction((records) => {
    clearNovels.run()

    for (const record of records) {
      insertNovel.run(
        record.title,
        record.desc,
        record.content,
        record.url || '',
        record.chapter_url || '',
        record.chapter_title || '',
        record.time || '',
        record.source || '',
        record.cover || ''
      )
    }
  })

  transaction(items)
}

async function fetchAllNovels() {
  if (isSyncingNovels) {
    return {
      ...lastNovelSyncSummary,
      running: true,
      message: 'novel sync is already running'
    }
  }

  isSyncingNovels = true
  lastNovelSyncSummary = {
    startedAt: new Date().toISOString(),
    finishedAt: null,
    inserted: 0,
    failed: 0,
    running: true
  }

  console.log('novel sync started')

  try {
    const items = await collectLatestNovelArticles()
    const dedupedItems = dedupeNovelItems(items)
    if (dedupedItems.length > 0) {
      replaceLatestNovels(dedupedItems)
      lastNovelSyncSummary.inserted = dedupedItems.length
    }

    return lastNovelSyncSummary
  } catch (error) {
    lastNovelSyncSummary.failed += 1
    throw error
  } finally {
    lastNovelSyncSummary.finishedAt = new Date().toISOString()
    lastNovelSyncSummary.running = false
    isSyncingNovels = false
    console.log('novel sync finished:', lastNovelSyncSummary)
  }
}

function clearNovels() {
  return db.prepare('DELETE FROM novels').run()
}

function detectSearchIntent(keyword = '') {
  const text = String(keyword || '').toLowerCase()

  if (/小说|听书|爽文|评书|故事/.test(text)) return 'novel'
  if (/视频|看看|播放|节目|养生|广场舞/.test(text)) return 'video'
  if (/新闻|时事|资讯|热点|最新/.test(text)) return 'news'

  return 'all'
}

function normalizeSearchRows(rows, kind) {
  return (rows || []).map((item) => ({
    ...item,
    kind
  }))
}

function searchByKeyword(table, fields, keyword, limit = 6, extraWhere = '') {
  const patterns = Array.isArray(keyword)
    ? keyword.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 6)
    : String(keyword || '')
        .trim()
        .split(/[\s，。！？、,.]+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 6)

  if (!patterns.length) return []

  const whereClause = patterns
    .map(() => `(${fields.map((field) => `${field} LIKE ?`).join(' OR ')})`)
    .join(' OR ')

  const sql =
    `SELECT * FROM ${table} WHERE (${whereClause}) ${extraWhere} ORDER BY id DESC LIMIT ?`
  const params = []

  for (const pattern of patterns) {
    for (const field of fields) {
      params.push(`%${pattern}%`)
    }
  }

  params.push(limit)
  return db.prepare(sql).all(...params)
}

function dedupeSearchRows(rows) {
  const seen = new Set()
  return (rows || []).filter((item) => {
    const key = item.url || item.play_url || `${item.title || ''}-${item.time || ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function getLatestRows(table, limit = 4, whereClause = '', ...params) {
  const sql =
    `SELECT * FROM ${table} ${whereClause ? `WHERE ${whereClause}` : ''} ORDER BY id DESC LIMIT ?`
  return db.prepare(sql).all(...params, limit)
}

function buildSearchPlan(keyword = '', intent = 'all') {
  const raw = String(keyword || '').trim()
  const lowered = raw.toLowerCase()
  const stripped = raw
    .replace(/今天|今日|现在|最近|最新|帮我|给我|我想|想看|想听|搜一下|搜索一下|搜一搜|搜索|找点|找个|来点|看看|播放|内容|结果/g, ' ')
    .replace(/新闻|时事|资讯|热点|视频|节目|小说|听书|评书|故事/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const baseTerms = stripped
    ? stripped.split(/[\s，。！？、,.]+/).map((item) => item.trim()).filter(Boolean).slice(0, 4)
    : []

  const plan = {
    newsTerms: [...baseTerms],
    videoTerms: [...baseTerms],
    novelTerms: [...baseTerms],
    fallbackLatestNews: false,
    fallbackLatestVideos: false,
    fallbackLatestNovels: false
  }

  if (/今天|今日|最新|时事|新闻|资讯|热点/.test(lowered)) {
    plan.fallbackLatestNews = true
  }

  if (/养生|健康/.test(lowered)) {
    plan.videoTerms.push('养生', '健康')
    plan.fallbackLatestVideos = true
  }

  if (/三农|农业|乡村|种植|养殖/.test(lowered)) {
    plan.videoTerms.push('三农', '农业', '乡村')
    plan.fallbackLatestVideos = true
  }

  if (/广场舞|健身|锻炼/.test(lowered)) {
    plan.videoTerms.push('广场舞', '健身')
    plan.fallbackLatestVideos = true
  }

  if (/视频|节目|播放|看看/.test(lowered)) {
    plan.fallbackLatestVideos = true
  }

  if (/爽文/.test(lowered)) {
    plan.novelTerms.push('爽文', '逆袭', '重生', '完结')
  }

  if (/听书|评书/.test(lowered)) {
    plan.novelTerms.push('听书', '评书', '故事')
  }

  if (/小说|故事|评书|爽文|听书/.test(lowered)) {
    plan.fallbackLatestNovels = true
  }

  plan.newsTerms = [...new Set(plan.newsTerms)].filter(Boolean)
  plan.videoTerms = [...new Set(plan.videoTerms)].filter(Boolean)
  plan.novelTerms = [...new Set(plan.novelTerms)].filter(Boolean)

  if (intent === 'news' && !plan.newsTerms.length) {
    plan.fallbackLatestNews = true
  }

  if (intent === 'video' && !plan.videoTerms.length) {
    plan.fallbackLatestVideos = true
  }

  if (intent === 'novel' && !plan.novelTerms.length) {
    plan.fallbackLatestNovels = true
  }

  if (intent === 'all' && !plan.newsTerms.length && !plan.videoTerms.length && !plan.novelTerms.length) {
    plan.fallbackLatestNews = true
    plan.fallbackLatestVideos = true
    plan.fallbackLatestNovels = true
  }

  return plan
}

function extractHostname(value = '') {
  try {
    return new URL(value).hostname.replace(/^www\./, '')
  } catch (error) {
    return ''
  }
}

function isObviousAdWebResult(item = {}) {
  const title = String(item.title || '').toLowerCase()
  const desc = String(item.desc || '').toLowerCase()
  const url = String(item.url || '').toLowerCase()
  const host = extractHostname(url)
  const text = `${title} ${desc} ${host}`

  const blockedDomains = [
    'taobao.com',
    'tmall.com',
    'jd.com',
    '3.cn',
    'pinduoduo.com',
    'yangkeduo.com',
    'smzdm.com',
    'amazon.',
    'suning.com',
    '1688.com'
  ]

  const blockedKeywords = [
    '广告',
    '推广',
    '赞助',
    '营销',
    '带货',
    '优惠券',
    '领券',
    '购买',
    '报价',
    '多少钱',
    '加盟',
    '代理',
    '开户',
    '下载',
    '安装',
    '手机版官网',
    'app下载',
    '官方软件下载'
  ]

  if (blockedDomains.some((domain) => host.includes(domain))) {
    return true
  }

  return blockedKeywords.some((keyword) => text.includes(keyword))
}

function hasEnoughChinese(text = '') {
  const matches = String(text || '').match(/[\u4e00-\u9fa5]/g) || []
  return matches.length >= 4
}

function isMostlyEnglishResult(item = {}) {
  const title = String(item.title || '')
  const desc = String(item.desc || '')
  const combined = `${title} ${desc}`
  const english = combined.match(/[A-Za-z]/g) || []
  const chinese = combined.match(/[\u4e00-\u9fa5]/g) || []

  return english.length > 24 && chinese.length < 4
}

function dedupeWebRows(rows) {
  const seen = new Set()
  return (rows || []).filter((item) => {
    const key = item.url || item.title
    if (!key || seen.has(key)) return false
    if (isMostlyEnglishResult(item)) return false
    seen.add(key)
    return true
  })
}

function normalizeWebKeyword(keyword = '') {
  const raw = String(keyword || '').trim()
  const cleaned = raw
    .replace(/ai|AI|提示词|prompt|prompts/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (/老年人|中老年|养生|健康/.test(cleaned)) {
    return `${cleaned} 中文`
  }

  if (/新闻|时事|资讯|热点/.test(cleaned)) {
    return `${cleaned} 中文`
  }

  return hasEnoughChinese(cleaned) ? `${cleaned} 中文` : cleaned
}

function buildTrustedWebRows(keyword = '') {
  const text = String(keyword || '')
  const rows = []

  if (/老年人|中老年|养生|健康|保健|慢病|血压|血糖|睡眠|饮食/.test(text)) {
    rows.push(
      {
        id: 'trusted-health-1',
        title: '人民网健康频道',
        desc: '提供老年健康、慢病管理、饮食养生等中文内容，适合继续查看详细网页。',
        time: '',
        url: 'http://health.people.com.cn/',
        source: '人民网健康'
      },
      {
        id: 'trusted-health-2',
        title: '新华网健康',
        desc: '提供权威健康资讯、养生知识和医疗科普，适合老人阅读。',
        time: '',
        url: 'http://www.news.cn/health/',
        source: '新华健康'
      },
      {
        id: 'trusted-health-3',
        title: '国家卫生健康委员会',
        desc: '可查看官方健康政策、科普信息和老年健康相关内容。',
        time: '',
        url: 'http://www.nhc.gov.cn/',
        source: '国家卫健委'
      },
      {
        id: 'trusted-health-4',
        title: '央视《健康之路》',
        desc: '央视健康栏目网页入口，适合找中老年养生和疾病防护内容。',
        time: '',
        url: 'https://tv.cctv.com/lm/jkzl/',
        source: '央视健康之路'
      }
    )
  }

  if (/新闻|时事|热点|资讯|今日|今天|最新/.test(text)) {
    rows.push(
      {
        id: 'trusted-news-1',
        title: '新华网',
        desc: '权威中文新闻网页入口，可继续查看当天新闻和时事报道。',
        time: '',
        url: 'http://www.news.cn/',
        source: '新华网'
      },
      {
        id: 'trusted-news-2',
        title: '人民网',
        desc: '人民网新闻网页入口，适合查看国内时事和政策新闻。',
        time: '',
        url: 'http://www.people.com.cn/',
        source: '人民网'
      }
    )
  }

  if (/社保|医保|公积金|养老保险|失业保险|工伤保险|生育保险|灵活就业|社保缴纳|社保查询|社保卡/.test(text)) {
    rows.push(
      {
        id: 'trusted-social-1',
        title: '国家社会保险公共服务平台',
        desc: '可查看社保查询、参保信息、待遇资格等官方服务入口。',
        time: '',
        url: 'http://si.12333.gov.cn/',
        source: '国家社保平台'
      },
      {
        id: 'trusted-social-2',
        title: '人力资源和社会保障部',
        desc: '官方政策发布入口，适合查看社保缴纳、退休、待遇等政策说明。',
        time: '',
        url: 'http://www.mohrss.gov.cn/',
        source: '人社部'
      },
      {
        id: 'trusted-social-3',
        title: '国家医保服务平台',
        desc: '官方医保查询与政策入口，适合查医保缴费、报销和参保信息。',
        time: '',
        url: 'https://fuwu.nhsa.gov.cn/',
        source: '国家医保平台'
      },
      {
        id: 'trusted-social-4',
        title: '全国住房公积金服务',
        desc: '适合查公积金缴纳、提取、贷款等官方信息。',
        time: '',
        url: 'https://www.gov.cn/fuwu/zt/wsgjj/index.htm',
        source: '公积金服务'
      },
      {
        id: 'trusted-social-5',
        title: '中国政府网政务服务',
        desc: '可继续查社保缴纳、医保、公积金等政务服务入口。',
        time: '',
        url: 'https://www.gov.cn/fuwu/',
        source: '中国政府网'
      }
    )
  }

  if (/高铁|火车|铁路|车票|列车|地铁|公交|出行|交通|航班/.test(text)) {
    rows.push(
      {
        id: 'trusted-travel-1',
        title: '12306 中国铁路',
        desc: '官方铁路服务入口，适合查高铁、火车时刻、购票和乘车信息。',
        time: '',
        url: 'https://www.12306.cn/',
        source: '12306'
      },
      {
        id: 'trusted-travel-2',
        title: '中国政府网出行服务',
        desc: '适合查看官方出行、交通和便民服务入口。',
        time: '',
        url: 'https://www.gov.cn/fuwu/',
        source: '中国政府网'
      }
    )
  }

  return dedupeWebRows(rows).slice(0, 6)
}

function parseWebResultsFromBaidu(html, searchUrl) {
  const $ = cheerio.load(html)
  const rows = []

  $('.result, .result-op, .c-container').each((index, el) => {
    const link = $(el).find('h3 a').first()
    const url = absoluteUrl(link.attr('href') || '', searchUrl)
    const title = cleanContent(link.text())
    const desc = cleanContent(
      $(el).find('.c-abstract, .content-right_8Zs40, .c-span-last').first().text()
    )

    if (!url || !title) return

    const item = {
      id: `web-baidu-${index + 1}`,
      title,
      desc: desc || extractHostname(url) || '点击查看网页详情',
      time: '',
      url,
      source: extractHostname(url) || '网页'
    }

    if (!isObviousAdWebResult(item)) {
      rows.push(item)
    }
  })

  return dedupeWebRows(rows).slice(0, 6)
}

function parseWebResultsFromBing(html, searchUrl) {
  const $ = cheerio.load(html)
  const rows = []

  $('.b_algo').each((index, el) => {
    const link = $(el).find('h2 a').first()
    const url = absoluteUrl(link.attr('href') || '', searchUrl)
    const title = cleanContent(link.text())
    const desc = cleanContent($(el).find('.b_caption p').first().text())

    if (!url || !title) return

    const item = {
      id: `web-bing-${index + 1}`,
      title,
      desc: desc || extractHostname(url) || '点击查看网页详情',
      time: '',
      url,
      source: extractHostname(url) || '网页'
    }

    if (!isObviousAdWebResult(item)) {
      rows.push(item)
    }
  })

  return dedupeWebRows(rows).slice(0, 6)
}

function parseWebResultsFromDuckDuckGo(html, searchUrl) {
  const $ = cheerio.load(html)
  const rows = []

  $('.result').each((index, el) => {
    const link = $(el).find('.result__title a').first()
    const url = absoluteUrl(link.attr('href') || '', searchUrl)
    const title = cleanContent(link.text())
    const desc = cleanContent($(el).find('.result__snippet').first().text())

    if (!url || !title) return

    const item = {
      id: `web-ddg-${index + 1}`,
      title,
      desc: desc || extractHostname(url) || '点击查看网页详情',
      time: '',
      url,
      source: extractHostname(url) || '网页'
    }

    if (!isObviousAdWebResult(item)) {
      rows.push(item)
    }
  })

  return dedupeWebRows(rows).slice(0, 6)
}

async function fetchWebResults(keyword) {
  const normalizedKeyword = normalizeWebKeyword(keyword)
  const trustedRows = buildTrustedWebRows(normalizedKeyword)

  if (trustedRows.length) {
    return trustedRows
  }

  const sources = [
    {
      name: 'baidu',
      url: `https://www.baidu.com/s?wd=${encodeURIComponent(normalizedKeyword)}&ie=utf-8`,
      parse: parseWebResultsFromBaidu
    },
    {
      name: 'bing',
      url: `https://cn.bing.com/search?q=${encodeURIComponent(normalizedKeyword)}&setlang=zh-Hans`,
      parse: parseWebResultsFromBing
    },
    {
      name: 'duckduckgo',
      url: `https://html.duckduckgo.com/html/?q=${encodeURIComponent(normalizedKeyword)}`,
      parse: parseWebResultsFromDuckDuckGo
    }
  ]

  for (const source of sources) {
    try {
      const html = await fetchHtml(source.url)
      const rows = source.parse(html, source.url)
      if (rows.length) {
        return rows
      }
    } catch (error) {
      console.log(`web source failed [${source.name}]:`, error.message)
    }
  }

  return []
}

async function summarizeWithDeepSeek(keyword, localSections = [], webRows = []) {
  if (!DEEPSEEK_API_KEY) {
    return null
  }

  const condensedLocal = (localSections || [])
    .flatMap((section) =>
      (section.items || []).slice(0, 2).map((item) => ({
        category: section.label,
        title: item.title || '',
        desc: item.desc || item.chapter_title || ''
      }))
    )
    .slice(0, 6)

  const condensedWeb = (webRows || []).slice(0, 5).map((item) => ({
    source: item.source || '',
    title: item.title || '',
    desc: item.desc || '',
    url: item.url || ''
  }))

  const response = await axios.post(
    'https://api.deepseek.com/chat/completions',
    {
      model: DEEPSEEK_MODEL,
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content:
            '你是无极搜的搜索整理助手。请只使用简体中文，用适合老年用户阅读的表达，把结果总结成2到4句。优先提炼最有用的信息，忽略广告、下载站、带货、软文、推广页，不要编造，没有把握就直说。'
        },
        {
          role: 'user',
          content: `用户搜索：${keyword}\n\n本地内容池结果：${JSON.stringify(condensedLocal)}\n\n真实网页结果：${JSON.stringify(condensedWeb)}\n\n请输出一段适合老人看的简短总结，不要分点。`
        }
      ]
    },
    {
      timeout: 45000,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`
      }
    }
  )

  const data = response.data || {}
  return {
    summary: data?.choices?.[0]?.message?.content || ''
  }
}

function buildSearchSummary(keyword, intent, newsRows, videoRows, novelRows, webRows = [], aiSummary = '') {
  if (aiSummary) {
    return aiSummary
  }

  const total = newsRows.length + videoRows.length + novelRows.length + webRows.length

  if (!total) {
    return `没有找到和“${keyword}”直接相关的内容，可以试试换个更简单的说法，比如“今天新闻”“养生视频”或“听小说”。`
  }

  const sections = [
    newsRows.length ? `新闻 ${newsRows.length} 条` : '',
    videoRows.length ? `视频 ${videoRows.length} 条` : '',
    novelRows.length ? `小说 ${novelRows.length} 条` : '',
    webRows.length ? `网页 ${webRows.length} 条` : ''
  ].filter(Boolean)

  const intentText = {
    news: '更偏向新闻资讯',
    video: '更偏向视频内容',
    novel: '更偏向听小说内容',
    all: '为你整理了综合结果'
  }[intent]

  return `围绕“${keyword}”，${intentText}，一共找到 ${total} 条结果，其中包含${sections.join('、')}。`
}

async function fetchAllNews() {
  if (isSyncingNews) {
    return {
      ...lastSyncSummary,
      running: true,
      message: 'news sync is already running'
    }
  }

  isSyncingNews = true
  lastSyncSummary = {
    startedAt: new Date().toISOString(),
    finishedAt: null,
    inserted: 0,
    skipped: 0,
    failed: 0,
    running: true
  }

  console.log('news sync started')

  try {
    const { items, failed, skipped } = await collectLatestNews()
    lastSyncSummary.failed = failed
    lastSyncSummary.skipped = skipped

    if (items.length > 0) {
      mergeLatestNews(items)
      lastSyncSummary.inserted = items.length
    }

    return lastSyncSummary
  } finally {
    lastSyncSummary.finishedAt = new Date().toISOString()
    lastSyncSummary.running = false
    isSyncingNews = false
    console.log('news sync finished:', lastSyncSummary)
  }
}

app.get('/api/news', (req, res) => {
  try {
    refreshNewsTypesAndPurge()

    const type = req.query.type
    const limit = Number.parseInt(req.query.limit, 10)
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 50) : null

    let sql = 'SELECT * FROM news'
    const params = []

    if (type) {
      sql += ' WHERE type = ?'
      params.push(type)
    }

    sql += ' ORDER BY id DESC'

    if (safeLimit) {
      sql += ' LIMIT ?'
      params.push(safeLimit)
    }

    const rows = db.prepare(sql).all(...params)
    res.json(rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/news/:id', (req, res) => {
  try {
    refreshNewsTypesAndPurge()
    const row = db.prepare('SELECT * FROM news WHERE id = ?').get(req.params.id)

    if (!row) {
      return res.status(404).json({ error: 'news not found' })
    }

    res.json(row)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/news/sync-status', (req, res) => {
  res.json({
    ...lastSyncSummary,
    running: isSyncingNews
  })
})

app.delete('/api/news', (req, res) => {
  try {
    const result = clearNewsByType(req.query.type)
    res.json({ deleted: result.changes })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/news/sync', async (req, res) => {
  try {
    const summary = await fetchAllNews()
    res.json(summary)
  } catch (error) {
    isSyncingNews = false
    lastSyncSummary.running = false
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/news', (req, res) => {
  try {
    const { title, desc, type, time } = req.body

    if (!title || !desc) {
      return res.status(400).json({ error: 'title and desc are required' })
    }

    const publishTime = time || new Date().toLocaleString('zh-CN')
    const result = db
      .prepare('INSERT INTO news(title, desc, type, time, url, image, images, blocks) VALUES(?,?,?,?,?,?,?,?)')
      .run(title, desc, type || resolveNewsType(publishTime), publishTime, '', '', '[]', '[]')

    refreshNewsTypesAndPurge()

    res.json({ id: result.lastInsertRowid, message: 'news created' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/news/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM news WHERE id = ?').run(req.params.id)
    res.json({ deleted: result.changes })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/config', (req, res) => {
  res.json(getPublicConfig())
})

app.post('/api/client/handshake', (req, res) => {
  try {
    const { deviceId, deviceName, serverUrl } = req.body || {}

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' })
    }

    const device = upsertDevice({
      deviceId,
      deviceName: deviceName || '无极设备',
      serverUrl: serverUrl || '',
      status: DEVICE_STATUS_CONNECTED
    })

    res.json({
      ok: true,
      deviceId: device.device_id,
      deviceName: device.device_name,
      status: device.status,
      config: getPublicConfig(),
      serverTime: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/client/heartbeat', (req, res) => {
  try {
    const { deviceId } = req.body || {}

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' })
    }

    const device = getDeviceById(deviceId)

    if (!device) {
      return res.status(404).json({ error: 'device not found', code: 'DEVICE_NOT_FOUND' })
    }

    if (device.status === DEVICE_STATUS_DISCONNECTED) {
      return res.status(409).json({ error: 'device disconnected by server', code: 'DEVICE_DISCONNECTED' })
    }

    const updated = touchDevice(deviceId)
    res.json({
      ok: true,
      deviceId: updated.device_id,
      status: updated.status,
      config: getPublicConfig()
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/client/status', (req, res) => {
  try {
    const deviceId = String(req.query.deviceId || '').trim()

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' })
    }

    const device = getDeviceById(deviceId)

    if (!device) {
      return res.status(404).json({ error: 'device not found', code: 'DEVICE_NOT_FOUND' })
    }

    res.json({
      ok: true,
      deviceId: device.device_id,
      connected: device.status === DEVICE_STATUS_CONNECTED,
      status: device.status,
      config: getPublicConfig(),
      lastSeenAt: device.last_seen_at
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/admin/settings', (req, res) => {
  try {
    res.json(getPublicConfig())
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/admin/settings', (req, res) => {
  try {
    const { aiSummaryEnabled } = req.body || {}
    setSetting('ai_summary_enabled', aiSummaryEnabled ? '1' : '0')
    res.json(getPublicConfig())
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/admin/devices', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM devices ORDER BY updated_at DESC, id DESC').all()
    res.json(rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/admin/devices/:deviceId/disconnect', (req, res) => {
  try {
    const result = disconnectDevice(req.params.deviceId)
    res.json({ disconnected: result.changes > 0 })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/search', async (req, res) => {
  try {
    const keyword = String(req.query.q || '').trim()

    if (!keyword) {
      return res.status(400).json({ error: 'keyword is required' })
    }

    refreshNewsTypesAndPurge()
    const aiSummaryEnabled = getBooleanSetting('ai_summary_enabled', true)

    const intent = detectSearchIntent(keyword)
    const plan = buildSearchPlan(keyword, intent)

    let newsRows = searchByKeyword('news', ['title', 'desc'], plan.newsTerms, intent === 'news' ? 8 : 4)
    let videoRows = searchByKeyword(
      'videos',
      ['title', 'desc', 'type', 'source'],
      plan.videoTerms,
      intent === 'video' ? 8 : 4
    )
    let novelRows = searchByKeyword(
      'novels',
      ['title', 'desc', 'content', 'source'],
      plan.novelTerms,
      intent === 'novel' ? 8 : 4
    )

    if (!newsRows.length && plan.fallbackLatestNews) {
      newsRows = getLatestRows('news', intent === 'news' ? 8 : 4, 'type = ?', 'now')
    }

    if (!videoRows.length && plan.fallbackLatestVideos) {
      if (/老年人|中老年|养生|健康/.test(keyword)) {
        videoRows = getLatestRows('videos', intent === 'video' ? 8 : 4, 'type = ?', '健康')
      } else if (/三农|农业|乡村|种植|养殖/.test(keyword)) {
        videoRows = getLatestRows('videos', intent === 'video' ? 8 : 4, 'type = ?', '三农')
      } else if (/广场舞|健身|锻炼/.test(keyword)) {
        videoRows = getLatestRows('videos', intent === 'video' ? 8 : 4, 'type = ?', '生活')
      } else {
        videoRows = getLatestRows('videos', intent === 'video' ? 8 : 4)
      }
    }

    if (!novelRows.length && plan.fallbackLatestNovels) {
      novelRows = getLatestRows('novels', intent === 'novel' ? 8 : 4)
    }

    newsRows = normalizeSearchRows(dedupeSearchRows(newsRows), 'news')
    videoRows = normalizeSearchRows(dedupeSearchRows(videoRows), 'video')
    novelRows = normalizeSearchRows(dedupeSearchRows(novelRows), 'novel')
    let webRows = []
    let aiSummary = ''

    if (!webRows.length) {
      try {
        webRows = normalizeSearchRows(await fetchWebResults(keyword), 'web')
      } catch (error) {
        console.log('web search fallback failed:', error.message)
      }
    }

    const previewSections = [
      { label: '新闻', items: newsRows },
      { label: '视频', items: videoRows },
      { label: '小说', items: novelRows }
    ]

    if (aiSummaryEnabled && DEEPSEEK_API_KEY) {
      try {
        const summaryResult = await summarizeWithDeepSeek(keyword, previewSections, webRows)
        aiSummary = summaryResult?.summary || ''
      } catch (error) {
        console.log('deepseek summarize failed:', error.message)
      }
    }

    const order =
      intent === 'news'
        ? ['news', 'web', 'video', 'novel']
        : intent === 'video'
          ? ['video', 'web', 'news', 'novel']
          : intent === 'novel'
            ? ['novel', 'web', 'video', 'news']
            : ['news', 'web', 'video', 'novel']

    const sectionMap = {
      news: { key: 'news', label: '新闻', items: newsRows },
      video: { key: 'video', label: '视频', items: videoRows },
      novel: { key: 'novel', label: '小说', items: novelRows },
      web: { key: 'web', label: '网页', items: webRows }
    }

    const sections = order
      .map((key) => sectionMap[key])
      .filter((section) => section.items.length)

    res.json({
      keyword,
      intent,
      summary: buildSearchSummary(keyword, intent, newsRows, videoRows, novelRows, webRows, aiSummary),
      total: newsRows.length + videoRows.length + novelRows.length + webRows.length,
      sections,
      webEnabled: webRows.length > 0,
      aiEnabled: aiSummaryEnabled && Boolean(aiSummary),
      aiSummaryEnabled
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/search/history', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM search_history ORDER BY id DESC').all()
    res.json(rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/search/history', (req, res) => {
  try {
    const { keyword, summary } = req.body

    if (!keyword || !summary) {
      return res.status(400).json({ error: 'keyword and summary are required' })
    }

    const result = db
      .prepare('INSERT INTO search_history(keyword, summary) VALUES(?,?)')
      .run(keyword, summary)

    res.json({ id: result.lastInsertRowid, message: 'history created' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/search/history/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM search_history WHERE id = ?').run(req.params.id)
    res.json({ deleted: result.changes })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/videos', (req, res) => {
  try {
    const type = req.query.type
    let rows

    if (type) {
      rows = db.prepare('SELECT * FROM videos WHERE type = ? ORDER BY id DESC').all(type)
    } else {
      rows = db.prepare('SELECT * FROM videos ORDER BY id DESC').all()
    }

    res.json(rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/videos/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id)

    if (!row) {
      return res.status(404).json({ error: 'video not found' })
    }

    res.json(row)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/videos/sync', async (req, res) => {
  try {
    const summary = await fetchAllVideos()
    res.json(summary)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/videos', (req, res) => {
  try {
    const { title, desc, type, url, time } = req.body

    if (!title || !desc) {
      return res.status(400).json({ error: 'title and desc are required' })
    }

    const result = db
      .prepare('INSERT INTO videos(title, desc, type, url, time) VALUES(?,?,?,?,?)')
      .run(title, desc, type || '推荐', url || '', time || new Date().toLocaleString('zh-CN'))

    res.json({ id: result.lastInsertRowid, message: 'video created' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/videos/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM videos WHERE id = ?').run(req.params.id)
    res.json({ deleted: result.changes })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/novels', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM novels ORDER BY id DESC').all()
    res.json(rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/novels/sync-status', (req, res) => {
  res.json({
    ...lastNovelSyncSummary,
    running: isSyncingNovels
  })
})

app.post('/api/novels/sync', async (req, res) => {
  try {
    const summary = await fetchAllNovels()
    res.json(summary)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/novels', (req, res) => {
  try {
    const { title, desc, content, source, time, cover, url, chapter_url, chapter_title } = req.body

    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required' })
    }

    const result = db
      .prepare(
        'INSERT INTO novels(title, desc, content, url, chapter_url, chapter_title, time, source, cover) VALUES(?,?,?,?,?,?,?,?,?)'
      )
      .run(
        title,
        desc || '',
        content,
        url || '',
        chapter_url || '',
        chapter_title || '',
        time || new Date().toLocaleString('zh-CN'),
        source || '手动发布',
        cover || ''
      )

    res.json({ id: result.lastInsertRowid, message: 'novel created' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/novels', (req, res) => {
  try {
    const result = clearNovels()
    res.json({ deleted: result.changes })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/novels/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM novels WHERE id = ?').get(req.params.id)

    if (!row) {
      return res.status(404).json({ error: 'novel not found' })
    }

    res.json(row)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/novels/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM novels WHERE id = ?').run(req.params.id)
    res.json({ deleted: result.changes })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/test', (req, res) => {
  res.json({ msg: 'wuji backend is running' })
})

app.get('/', (req, res) => {
  res.sendFile('admin.html', { root: __dirname })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`server listening at http://0.0.0.0:${PORT}`)
  fetchAllNews().catch((error) => {
    isSyncingNews = false
    lastSyncSummary.running = false
    console.log('startup news sync failed:', error.message)
  })
  fetchAllVideos().catch((error) => {
    console.log('startup video sync failed:', error.message)
  })
  fetchAllNovels().catch((error) => {
    isSyncingNovels = false
    lastNovelSyncSummary.running = false
    console.log('startup novel sync failed:', error.message)
  })
})

cron.schedule('*/10 * * * *', () => {
  fetchAllNews().catch((error) => {
    isSyncingNews = false
    lastSyncSummary.running = false
    console.log('scheduled news sync failed:', error.message)
  })
})

cron.schedule('*/30 * * * *', () => {
  fetchAllVideos().catch((error) => {
    console.log('scheduled video sync failed:', error.message)
  })
})

cron.schedule('0 * * * *', () => {
  fetchAllNovels().catch((error) => {
    isSyncingNovels = false
    lastNovelSyncSummary.running = false
    console.log('scheduled novel sync failed:', error.message)
  })
})

