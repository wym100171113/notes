<script lang="ts">
import localSearchIndex from '@localSearchIndex'
import { tokenizeSearch, SEARCH_STOP_WORDS } from '../search-tokenizer'

/* ============ 模块级: 缓存与加载器(组件重挂载/切出再打开不重置) ============ */
const BASE = import.meta.env.BASE_URL as string
let titleCache: TitleEntry[] | null = null
let excerptsCache: Record<string, { t: string; x: string }[]> | null = null
let buildVersion = ''
let currentLocale = 'root'

/* 全文检索走 Web Worker(search-worker.ts): 索引的 gunzip+parse+建树
 * 全部在 worker 线程, 主线程只收发消息, 刷新后打开搜索不再卡输入。
 * 消息结果经 searchListener 回调到当前挂载的弹窗实例(setup 块注册)。 */
let searchWorker: Worker | null = null
let workerReady = false
let workerLoading = false
let searchRequestId = 0
interface WorkerResult {
  tooBroad: boolean
  fallback: boolean
  results: SearchResult[]
}
let searchListener: {
  onResult: (r: WorkerResult) => void
  onReady: () => void
  onFailed: () => void
} | null = null

export function setSearchEnv(locale: string) {
  currentLocale = locale
}
export function setSearchListener(l: typeof searchListener) {
  searchListener = l
}
export function warmFullIndex() {
  ensureFullIndexWorker()
}

// 创建全文检索 worker 并启动后台加载(索引数据: IDB 缓存优先, 否则导入构建 chunk)
// 数据本身只是 gzip base64 字符串, 解压与解析都在 worker 内进行
function ensureFullIndexWorker() {
  if (searchWorker || workerLoading) return
  if (typeof Worker === 'undefined') return
  workerLoading = true
  const worker = new Worker(new URL('../search-worker.ts', import.meta.url), { type: 'module' })
  searchWorker = worker
  worker.onmessage = (e) => {
    const msg = e.data
    if (msg.type === 'ready') {
      workerReady = true
      workerLoading = false
      searchListener?.onReady()
    } else if (msg.type === 'result') {
      // 只接受最新一次请求的结果
      if (msg.requestId !== searchRequestId) return
      searchListener?.onResult(msg)
    } else if (msg.type === 'error') {
      console.error('[search]', msg.message)
      failWorker()
    }
  }
  worker.onerror = () => failWorker()
  ;(async () => {
    let data = ''
    try {
      const v = await getBuildVersion()
      data = (await idbGet('search-index-' + v)) || ''
    } catch {
      data = ''
    }
    if (!data) {
      try {
        data = (await localSearchIndex[currentLocale]?.())?.default as string
        const v = await getBuildVersion()
        await idbSet('search-index-' + v, data)
        idbCleanOld('search-index-' + v)
      } catch {
        /* 忽略 */
      }
    }
    if (searchWorker) searchWorker.postMessage({ type: 'load', data })
  })()
}

// worker 失败: 标记失败并销毁, 下次切换全文时重建重试
function failWorker() {
  workerReady = false
  workerLoading = false
  searchWorker?.terminate()
  searchWorker = null
  searchListener?.onFailed()
}

async function loadTitles() {
  if (titleCache) return titleCache
  const res = await fetch(`${BASE}search-data/title.json`)
  titleCache = await res.json()
  return titleCache
}
async function loadExcerpts() {
  if (excerptsCache) return excerptsCache
  const res = await fetch(`${BASE}search-data/excerpts.json`)
  excerptsCache = await res.json()
  return excerptsCache
}
async function getBuildVersion() {
  if (buildVersion) return buildVersion
  try {
    const r = await fetch(`${BASE}search-data/version.json`)
    buildVersion = ((await r.json()) as { v: string }).v
  } catch {
    buildVersion = 'local'
  }
  return buildVersion
}
function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('notes-search', 1)
    req.onupgradeneeded = () => req.result.createObjectStore('kv')
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
async function idbGet(key: string): Promise<string | null> {
  try {
    const db = await idbOpen()
    return await new Promise((resolve) => {
      const req = db.transaction('kv', 'readonly').objectStore('kv').get(key)
      req.onsuccess = () => resolve((req.result as string) ?? null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}
async function idbSet(key: string, val: string): Promise<void> {
  try {
    const db = await idbOpen()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('kv', 'readwrite')
      tx.objectStore('kv').put(val, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    /* 忽略 */
  }
}
// 清理非当前版本的全文索引缓存, 避免旧版本条目永久累积
async function idbCleanOld(keepKey: string): Promise<void> {
  try {
    const db = await idbOpen()
    await new Promise<void>((resolve) => {
      const tx = db.transaction('kv', 'readwrite')
      const store = tx.objectStore('kv')
      const req = store.getAllKeys()
      req.onsuccess = () => {
        for (const k of (req.result as IDBValidKey[])) {
          if (String(k).startsWith('search-index-') && String(k) !== keepKey) store.delete(k)
        }
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  } catch {
    /* 忽略 */
  }
}
</script>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter, useData } from 'vitepress'

const emit = defineEmits<{ (e: 'close'): void }>()
const router = useRouter()
const { localeIndex } = useData()
setSearchEnv(localeIndex.value)

/* ============ 状态 ============ */
type Mode = 'quick' | 'full'
interface TitleEntry {
  id: string
  title: string
  titles: string[]
}
interface SearchResult {
  id: string
  title: string
  titles: string[]
  score?: number
}
const mode = ref<Mode>('quick')
const query = ref('')
const results = ref<SearchResult[]>([])
const selectedIndex = ref(-1)
const enableNoResults = ref(false)
const expanded = ref(false)
const useFuzzy = ref(false)
const fullLoading = ref(false)
const fullFailed = ref(false)
const queryTooBroad = ref(false)
const hint = computed(() => {
  if (mode.value === 'quick') return '即时检索标题 · 切"全文"可搜正文'
  if (fullLoading.value || fullFailed.value) return ''
  return '全文索引已缓存 · 深度检索'
})
const SEG_W = 76
const segThumb = computed(() => ({
  transform: mode.value === 'full' ? `translateX(${SEG_W}px)` : 'translateX(0)',
}))
const inputEl = ref<HTMLInputElement>()
const listEl = ref<HTMLElement>()
function focusInput(select = true) {
  inputEl.value?.focus()
  if (select) inputEl.value?.select()
}

/* ============ 搜索 ============ */
let searchTimer: ReturnType<typeof setTimeout> | undefined
function runSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    if (mode.value === 'quick') quickSearch()
    else fullSearch()
  }, mode.value === 'quick' ? 0 : 120)
}
function quickSearch() {
  const q = query.value.trim().toLowerCase()
  enableNoResults.value = true
  if (!q) { results.value = []; return }
  const hit = (s: string) => s.toLowerCase().includes(q)
  const hitStart = (s: string) => s.toLowerCase().startsWith(q)
  const out: SearchResult[] = []
  for (const e of titleCache ?? []) {
    const titleHit = hit(e.title)
    const pathHit = hit(e.id)
    const subHit = (e.titles ?? []).some(hit)
    const subHitStart = (e.titles ?? []).some(hitStart)
    if (titleHit || pathHit || subHit) {
      let score = 0
      if (hitStart(e.title)) score = 5
      else if (titleHit) score = 4
      else if (subHitStart) score = 3
      else if (subHit) score = 2
      else score = 1
      out.push({ id: e.id, title: e.title, titles: e.titles || [], score })
    }
  }
  results.value = out.sort((a, b) => b.score - a.score).slice(0, 16)
}
const orFallbackUsed = ref(false)
function fullSearch() {
  enableNoResults.value = true
  if (!query.value.trim()) {
    // 空查询不提示"过于宽泛"(打开弹窗/切到全文但尚未输入)
    results.value = []
    queryTooBroad.value = false
    return
  }
  if (!workerReady) {
    // 索引未就绪: 启动 worker 后台加载, 显示 loading, ready 后自动补搜
    fullLoading.value = true
    fullFailed.value = false
    ensureFullIndexWorker()
    results.value = []
    return
  }
  fullLoading.value = false
  searchWorker?.postMessage({
    type: 'search',
    requestId: ++searchRequestId,
    query: query.value,
    fuzzy: useFuzzy.value,
  })
}

/* ============ 查询分词与停用词过滤(共享 .vitepress/search-tokenizer.ts) ============ */

/* ============ 展开详情 ============ */
function excerptFor(id: string): { t: string; x: string } | null {
  const base = BASE.replace(/\/$/, '')
  const path = id.split('#')[0]
  const key = path.startsWith(base) ? path.slice(base.length) : path
  const secs = excerptsCache?.[key]
  if (!secs?.length) return null
  const q = query.value.trim()
  if (q) {
    // 分词级匹配: 整串命中优先, 否则选命中 token 最多的节
    const tokens = tokenizeSearch(q).filter((t2) => t2.length > 1)
    let best: { s: (typeof secs)[number]; n: number } | null = null
    for (const s of secs) {
      const hay = (s.t + s.x).toLowerCase()
      if (hay.includes(q.toLowerCase())) return s
      const n = tokens.filter((tk) => hay.includes(tk)).length
      if (n > 0 && (!best || n > best.n)) best = { s, n }
    }
    if (best) return best.s
  }
  return secs[0]
}

/* ============ 模式切换(搜索触发由下方 watch 统一处理) ============ */
function switchMode(m: Mode) {
  mode.value = m
}
watch([mode, query, useFuzzy], () => {
  enableNoResults.value = false
  queryTooBroad.value = false
  runSearch()
})

/* ============ 键盘与焦点 ============ */
function scrollSelected() {
  nextTick(() => {
    listEl.value?.querySelector('.result.selected')?.scrollIntoView({ block: 'nearest' })
  })
}
watch(results, (r) => {
  selectedIndex.value = r.length ? 0 : -1
  scrollSelected()
})
function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = Math.min(results.value.length - 1, selectedIndex.value + 1)
    scrollSelected()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = Math.max(0, selectedIndex.value - 1)
    scrollSelected()
  } else if (e.key === 'Enter') {
    if (e.isComposing) return
    const r = results.value[selectedIndex.value]
    if (r) { router.go(r.id); emit('close') }
  } else if (e.key === 'Escape') {
    emit('close')
  }
}
onMounted(() => {
  focusInput()
  // 注册 worker 消息回调(组件卸载时注销, worker 常驻供下次打开复用)
  setSearchListener({
    onResult: ({ tooBroad, fallback, results: r }) => {
      queryTooBroad.value = tooBroad
      orFallbackUsed.value = fallback
      results.value = r
      fullLoading.value = false
    },
    onReady: () => {
      fullLoading.value = false
      if (query.value.trim() && mode.value === 'full') fullSearch()
    },
    onFailed: () => {
      fullFailed.value = true
      fullLoading.value = false
    },
  })
  // 打开即预取: 标题/摘录/全文索引。索引解压与解析全在 worker 线程,
  // 空闲时段启动即可, 不阻塞输入
  loadTitles().then(() => {
    if (query.value.trim()) runSearch()
  }).catch(() => {})
  loadExcerpts().catch(() => {})
  const scheduleIdle: typeof requestIdleCallback | ((cb: () => void, opts?: { timeout?: number }) => number) =
    window.requestIdleCallback ??
    ((cb: () => void, opts?: { timeout?: number }) => setTimeout(cb, opts?.timeout ?? 2000) as unknown as number)
  scheduleIdle(() => warmFullIndex(), { timeout: 2000 })
})
onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  setSearchListener(null)
})

/* ============ 高亮(安全转义) ============ */
function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function highlight(s: string, q: string) {
  const t = esc(s)
  if (!q.trim()) return t
  // 分词级高亮: 查询整串(尤其中文分词/模糊匹配)可能不连续出现, 逐个 token 高亮
  const tokens = tokenizeSearch(q).filter((tk) => tk.length > 1 && !(tk.length === 1 && SEARCH_STOP_WORDS.has(tk)))
  tokens.push(q.trim())
  tokens.sort((a, b) => b.length - a.length)
  const unique = [...new Set(tokens)]
  if (!unique.length) return t
  const re = new RegExp(unique.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi')
  return t.replace(re, (m) => `<mark>${m}</mark>`)
}
function isBodyHit(r: any) {
  const q = query.value.trim()
  if (!q) return false
  const hay = (r.title || '') + ' ' + ((r.titles || []) as string[]).join(' ')
  return !hay.includes(q)
}
</script>

<template>
  <Teleport to="body">
    <div class="search-modal" role="dialog" aria-modal="true" aria-label="搜索" @pointerdown.self="emit('close')">
      <div class="search-shell" @keydown="onKey">
        <div class="search-bar">
          <span class="vpi-search search-icon" aria-hidden="true" />
          <input
            ref="inputEl"
            v-model="query"
            class="search-input"
            type="search"
            placeholder="搜索笔记…"
            maxlength="64"
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
            enterkeyhint="go"
          />
          <button class="clear-btn" type="button" :disabled="!query" title="清空" @click="query = ''; focusInput(false)">
            <span class="vpi-delete" aria-hidden="true" />
          </button>
        </div>

        <div class="mode-row">
          <div class="segmented" role="tablist" aria-label="搜索范围">
            <div class="seg-thumb" :style="segThumb" />
            <button type="button" role="tab" class="seg-btn" :class="{ active: mode === 'quick' }" :aria-selected="mode === 'quick' ? 'true' : 'false'" @click="switchMode('quick')">标题</button>
            <button type="button" role="tab" class="seg-btn" :class="{ active: mode === 'full' }" :aria-selected="mode === 'full' ? 'true' : 'false'" @click="switchMode('full')">全文</button>
          </div>
          <span v-if="hint" class="mode-hint">{{ hint }}</span>
          <button v-if="mode === 'full'" type="button" class="detail-btn" :class="{ on: expanded }" title="显示/隐藏正文片段" @click="expanded = !expanded">详情</button>
          <label v-if="mode === 'full'" class="fuzzy-toggle" :class="{ on: useFuzzy }" title="近似匹配: 容忍错字/形近词">
            <input v-model="useFuzzy" type="checkbox" />
            <span class="fuzzy-track"><span class="fuzzy-knob" /></span>
            <span class="fuzzy-label">模糊</span>
          </label>
        </div>

        <div v-if="fullLoading" class="state-row"><span class="spinner" />正在加载全文索引…</div>
        <div v-else-if="fullFailed" class="state-row error">全文索引加载失败, 请刷新重试</div>

        <div v-if="orFallbackUsed" class="fallback-row">未找到同时包含全部关键词的结果, 已放宽为任一关键词匹配</div>

        <ul v-if="results.length" ref="listEl" class="results" role="listbox" aria-label="搜索结果">
          <li
            v-for="(p, i) in results"
            :key="p.id"
            class="result-item"
            :class="{ selected: i === selectedIndex }"
            role="option"
            :aria-selected="i === selectedIndex ? 'true' : 'false'"
            @mousemove="selectedIndex = i"
          >
            <a :href="p.id" class="result" :aria-label="p.title" @click.prevent="router.go(p.id); emit('close')">
              <div class="result-head">
                <span class="title" v-html="highlight(p.title, query)" />
                <span v-if="mode === 'quick'" class="quick-path">{{ p.id }}</span>
                <span v-else-if="isBodyHit(p)" class="body-hit">正文命中</span>
              </div>
              <div v-if="expanded && mode === 'full'" class="excerpt">
                <template v-if="excerptFor(p.id)">
                  <div class="excerpt-title" v-html="highlight(excerptFor(p.id)!.t, query)" />
                  <div class="excerpt-text" v-html="highlight(excerptFor(p.id)!.x, query)" />
                </template>
                <div v-else class="excerpt-text muted">(该页无正文片段)</div>
              </div>
            </a>
          </li>
        </ul>
        <div v-else-if="queryTooBroad" class="no-results">
          查询词过于宽泛, 请输入更具体的词(如"楞次定律")
        </div>
        <div v-else-if="query && enableNoResults && !fullLoading" class="no-results">
          未找到与 "<strong>{{ query }}</strong>" 相关的结果<template v-if="mode === 'full' && !useFuzzy"><br /><span class="hint-dim">试试右上角开启"模糊"匹配(容忍错字/形近词)</span></template>
        </div>

        <div class="footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
          <span><kbd>Enter</kbd> 打开</span>
          <span><kbd>Esc</kbd> 关闭</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.search-modal {
  position: fixed;
  z-index: 200;
  inset: 0;
  display: flex;
  justify-content: center;
  padding-top: 12vh;
  background: var(--vp-backdrop-bg-color);
  animation: fade-in 0.2s ease;
}
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

.search-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(100vw - 48px, 760px);
  max-height: min(80vh, 700px);
  padding: 14px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  box-shadow: var(--vp-shadow-3);
  animation: pop-in 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes pop-in { from { opacity: 0; transform: translateY(-10px) scale(0.98); } to { opacity: 1; transform: none; } }

.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}
.search-bar:focus-within { border-color: var(--vp-c-brand-1); }
.search-icon { font-size: 17px; color: var(--vp-c-text-2); flex-shrink: 0; }
.search-input {
  flex: 1;
  min-width: 0;
  padding: 10px 4px;
  border: none;
  background: transparent;
  color: var(--vp-c-text-1);
  font-size: 15px;
  outline: none;
}
.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-text-3);
  cursor: pointer;
  flex-shrink: 0;
}
.clear-btn:hover:not(:disabled) { color: var(--vp-c-brand-1); background: var(--vp-c-default-soft); }
.clear-btn:disabled { opacity: 0.35; cursor: default; }

.mode-row { display: flex; align-items: center; gap: 12px; min-height: 26px; }
.segmented { position: relative; display: inline-flex; flex-shrink: 0; padding: 3px; border-radius: 8px; background: var(--vp-c-default-soft); }
.seg-thumb {
  position: absolute; top: 3px; left: 3px; width: 76px; height: calc(100% - 6px);
  border-radius: 6px; background: var(--vp-c-bg); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  transition: transform 0.26s cubic-bezier(0.22, 0.61, 0.36, 1); pointer-events: none;
}
.seg-btn { position: relative; z-index: 1; width: 76px; padding: 5px 0; border: none; background: transparent; color: var(--vp-c-text-2); font-size: 0.82rem; cursor: pointer; transition: color 0.2s ease; }
.seg-btn:hover { color: var(--vp-c-text-1); }
.seg-btn.active { color: var(--vp-c-brand-1); font-weight: 600; }
.mode-hint { font-size: 0.75rem; color: var(--vp-c-text-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.detail-btn {
  flex-shrink: 0;
  padding: 4px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-2);
  font-size: 0.75rem;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease;
}
.detail-btn:hover { color: var(--vp-c-brand-1); border-color: var(--vp-c-brand-1); }
.detail-btn.on { color: var(--vp-c-brand-1); border-color: var(--vp-c-brand-1); font-weight: 600; }

.fuzzy-toggle { display: inline-flex; align-items: center; gap: 6px; margin-left: auto; flex-shrink: 0; cursor: pointer; user-select: none; }
.fuzzy-toggle input { position: absolute; opacity: 0; pointer-events: none; }
.fuzzy-track { position: relative; width: 28px; height: 16px; border-radius: 999px; background: var(--vp-c-divider); transition: background 0.2s ease; }
.fuzzy-knob { position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; border-radius: 50%; background: var(--vp-c-bg); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); transition: transform 0.2s cubic-bezier(0.22, 0.61, 0.36, 1); }
.fuzzy-toggle.on .fuzzy-track { background: var(--vp-c-brand-1); }
.fuzzy-toggle.on .fuzzy-knob { transform: translateX(12px); }
.fuzzy-label { font-size: 0.75rem; color: var(--vp-c-text-2); }
.fuzzy-toggle.on .fuzzy-label { color: var(--vp-c-brand-1); font-weight: 600; }

.state-row { display: flex; align-items: center; gap: 8px; padding: 6px 10px; font-size: 0.85rem; color: var(--vp-c-text-2); }
.state-row.error { color: var(--vp-c-danger-1); }
.spinner { width: 14px; height: 14px; border: 2px solid var(--vp-c-divider); border-top-color: var(--vp-c-brand-1); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.results { list-style: none; margin: 0; padding: 0; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; gap: 4px; }
.fallback-row { padding: 4px 12px; font-size: 0.75rem; color: var(--vp-c-warning-2); }
.hint-dim { color: var(--vp-c-text-3); font-size: 0.8rem; }
.result-item { border-radius: 8px; }
.result-item.selected { background: var(--vp-c-default-soft); }
.result { display: block; padding: 8px 12px; border-radius: 8px; text-decoration: none; color: var(--vp-c-text-1); }
.result-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.title { font-size: 0.92rem; font-weight: 600; }
.title :deep(mark), .excerpt-title :deep(mark), .excerpt-text :deep(mark) {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-radius: 2px;
  padding: 0 2px;
}
.quick-path { font-size: 0.72rem; color: var(--vp-c-text-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 280px; }
.body-hit { margin-left: auto; padding: 1px 6px; border-radius: 4px; background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); font-size: 0.7rem; font-weight: 500; }
.excerpt { margin-top: 6px; padding: 6px 10px; border-left: 2px solid var(--vp-c-brand-soft); background: var(--vp-c-bg-soft); border-radius: 0 6px 6px 0; }
.excerpt-title { font-size: 0.82rem; font-weight: 600; color: var(--vp-c-text-1); margin-bottom: 3px; }
.excerpt-text { font-size: 0.8rem; line-height: 1.55; color: var(--vp-c-text-2); }
.excerpt-text.muted { color: var(--vp-c-text-3); }
.no-results { padding: 18px; text-align: center; font-size: 0.88rem; color: var(--vp-c-text-2); }
.footer { display: flex; gap: 16px; padding-top: 8px; border-top: 1px solid var(--vp-c-divider); font-size: 0.72rem; color: var(--vp-c-text-3); }
.footer kbd { display: inline-block; min-width: 18px; padding: 1px 4px; margin-right: 2px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg-alt); font-family: inherit; font-size: 0.7rem; text-align: center; }
</style>
