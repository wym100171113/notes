/// <reference lib="webworker" />
// search-worker.ts — 全文索引的解析与搜索都在此线程执行:
// 主线程只负责取数据(gzip base64 字符串)并收发消息,
// 解压 + JSON.parse + MiniSearch 建树(数百 ms 级)不再阻塞输入。
import MiniSearch from 'minisearch'
import { gunzipSync } from 'fflate'
import { tokenizeSearch, SEARCH_STOP_WORDS } from './search-tokenizer'

interface LoadMessage {
  type: 'load'
  data: string
}
interface SearchMessage {
  type: 'search'
  requestId: number
  query: string
  fuzzy: boolean
}

const ctx = self as unknown as DedicatedWorkerGlobalScope
let index: MiniSearch | null = null

ctx.onmessage = (e: MessageEvent<LoadMessage | SearchMessage>) => {
  const msg = e.data
  if (msg.type === 'load') {
    try {
      const bin = Uint8Array.from(atob(msg.data), (c) => c.charCodeAt(0))
      const json = new TextDecoder().decode(gunzipSync(bin))
      index = MiniSearch.loadJSON(json, {
        fields: ['title', 'titles', 'text'],
        storeFields: ['title', 'titles'],
        // 与索引端(config.mts)共用同一分词器, 保证查询/索引分词一致
        tokenize: tokenizeSearch,
        searchOptions: {
          combineWith: 'AND',
          fuzzy: false,
          prefix: true,
          boost: { title: 4, text: 2, titles: 1 },
        },
      })
      ctx.postMessage({ type: 'ready' })
    } catch (err) {
      ctx.postMessage({ type: 'error', message: String(err) })
    }
    return
  }

  if (msg.type === 'search') {
    if (!index) {
      ctx.postMessage({ type: 'result', requestId: msg.requestId, tooBroad: false, fallback: false, results: [] })
      return
    }
    // 过滤单字停用词: 避免搜"你"命中一堆正文
    const tokens = tokenizeSearch(msg.query).filter((t) => !(t.length === 1 && SEARCH_STOP_WORDS.has(t)))
    if (!tokens.length) {
      ctx.postMessage({ type: 'result', requestId: msg.requestId, tooBroad: true, fallback: false, results: [] })
      return
    }
    const fuzzyOpt = msg.fuzzy ? 0.2 : false
    const queryStr = tokens.join(' ')
    let hits = index.search(queryStr, { fuzzy: fuzzyOpt, prefix: true })
    // AND 全词匹配 0 结果时自动降级为 OR(任一命中), 避免多词查询整体落空
    let fallback = false
    if (!hits.length) {
      hits = index.search(queryStr, { fuzzy: fuzzyOpt, prefix: true, combineWith: 'OR' })
      fallback = hits.length > 0
    }
    ctx.postMessage({
      type: 'result',
      requestId: msg.requestId,
      tooBroad: false,
      fallback,
      results: hits.slice(0, 16).map((r) => ({ id: r.id, title: r.title, titles: r.titles || [] })),
    })
  }
}
