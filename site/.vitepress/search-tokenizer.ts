// search-tokenizer.ts — 中文搜索分词, 构建端(config.mts)与查询端(VPLocalSearchBox)共享的单一来源
// 注意: 本模块会被 config.mts 引用并参与客户端打包, 必须自包含(纯函数, 无模块级依赖)
export interface IntlSegmenterLike {
  segment(text: string): Iterable<{ segment: string }>
}

let segCache: IntlSegmenterLike | null | undefined

function getSegmenter(): IntlSegmenterLike | null {
  if (segCache !== undefined) return segCache
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    segCache = new Intl.Segmenter('zh', { granularity: 'word' }) as IntlSegmenterLike
  } else {
    segCache = null
  }
  return segCache
}

function splitNonCjk(s: string): string[] {
  return s.split(/[^\p{L}\p{N}]+/u).filter(Boolean)
}

// 中文分词: 优先 Intl.Segmenter 词典分词(更接近词语, 误匹配少, 索引更小);
// 不可用时退回 bigram。词典把整串未知词当成一个词时, 退回 bigram 提高召回。
export function tokenizeSearch(text: string): string[] {
  const seg = getSegmenter()
  const tokens: string[] = []
  if (seg) {
    for (const part of seg.segment(text)) {
      const t = part.segment.trim()
      if (!t) continue
      if (/^[\u4e00-\u9fff]+$/u.test(t)) tokens.push(t)
      else tokens.push(...splitNonCjk(t))
    }
    if (tokens.length === 1 && /^[\u4e00-\u9fff]{4,}$/u.test(tokens[0])) {
      const chars = Array.from(tokens[0])
      const bigrams: string[] = []
      for (let i = 0; i < chars.length - 1; i++) bigrams.push(chars[i] + chars[i + 1])
      return bigrams
    }
    return tokens
  }
  const parts = text.split(/([\u4e00-\u9fff]+)/).filter(Boolean)
  for (const part of parts) {
    if (/^[\u4e00-\u9fff]+$/.test(part)) {
      const chars = Array.from(part)
      if (chars.length === 1) tokens.push(chars[0])
      else for (let i = 0; i < chars.length - 1; i++) tokens.push(chars[i] + chars[i + 1])
    } else {
      tokens.push(...splitNonCjk(part))
    }
  }
  return tokens
}

// 高频单字停用词: 过滤后提示"查询词过于宽泛", 避免搜"你"命中一堆正文
const STOP_CHARS =
  '你我他她它们这那哪何谁什之的了在是有和就不人都而及与或等被他从以其对这那也于还中为如但并者且么吧呢个点又再总各只该当要把向被让可要以能会去来上下很更最得地着过些没看说想知见做其已仍'
export const SEARCH_STOP_WORDS = new Set(STOP_CHARS)
