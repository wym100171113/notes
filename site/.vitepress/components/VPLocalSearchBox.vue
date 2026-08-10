<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter, useData } from 'vitepress'
import MiniSearch from 'minisearch'
import localSearchIndex from '@localSearchIndex'

const emit = defineEmits<{ (e: 'close'): void }>()
const router = useRouter()
const { localeIndex, theme } = useData()

/* ============ 数据层: 模块级缓存, 组件重挂载不重复加载 ============ */
const BASE = import.meta.env.BASE_URL as string
let titleCache: { id: string; title: string; titles: string[] }[] | null = null
let excerptsCache: Record<string, { t: string; x: string }[]> | null = null
let fullIndexCache: MiniSearch | null = null
let fullIndexPromise: Promise<MiniSearch> | null = null

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
async function loadFullIndex(): Promise<MiniSearch> {
  if (fullIndexCache) return fullIndexCache
  if (fullIndexPromise) return fullIndexPromise
  fullIndexPromise = (async () => {
    const data = (await localSearchIndex[localeIndex.value]?.())?.default as string
    const opts = theme.value.search?.provider === 'local' ? theme.value.search.options : undefined
    return MiniSearch.loadJSON(data, {
      fields: ['title', 'titles', 'text'],
      storeFields: ['title', 'titles'],
      searchOptions: {
        combineWith: 'AND',
        fuzzy: false,
        prefix: true,
        boost: { title: 4, text: 2, titles: 1 },
        ...(opts?.miniSearch?.searchOptions || {}),
      },
      ...(opts?.miniSearch?.options || {}),
    })
  })()
  fullIndexCache = await fullIndexPromise
  return fullIndexCache
}

/* ============ 状态 ============ */
type Mode = 'quick' | 'full'
const mode = ref<Mode>('quick')
const query = ref('')
const results = ref<any[]>([])
const selectedIndex = ref(-1)
const enableNoResults = ref(false)
const expanded = ref(false)
const useFuzzy = ref(false)
const fullLoading = ref(false)
const fullFailed = ref(false)
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
  const out: any[] = []
  for (const e of titleCache || []) {
    const titleHit = hit(e.title)
    const pathHit = hit(e.id)
    if (titleHit || pathHit) {
      let score = 0
      if (e.title.toLowerCase().startsWith(q)) score = 4
      else if (titleHit) score = 3
      else score = 2
      out.push({ id: e.id, title: e.title, titles: e.titles || [], score })
    }
  }
  results.value = out.sort((a, b) => b.score - a.score).slice(0, 16)
}
function fullSearch() {
  enableNoResults.value = true
  if (!fullIndexCache) { results.value = []; return }
  const fuzzyOpt = useFuzzy.value ? 0.2 : false
  results.value = (fullIndexCache.search(query.value, { fuzzy: fuzzyOpt, prefix: true }) as any[])
    .slice(0, 16)
    .map((r) => ({ id: r.id, title: r.title, titles: r.titles || [] }))
}

/* ============ 展开详情(摘录来自静态 excerpts.json) ============ */
async function toggleExpand() {
  if (mode.value === 'quick') {
    expanded.value = true
    await switchMode('full')
    return
  }
  expanded.value = !expanded.value
}
function excerptFor(id: string): { t: string; x: string } | null {
  const base = BASE.replace(/\/$/, '')
  const path = id.split('#')[0]
  const key = path.startsWith(base) ? path.slice(base.length) : path
  const secs = excerptsCache?.[key]
  if (!secs?.length) return null
  const q = query.value.trim()
  if (q) {
    for (const s of secs) if ((s.t + s.x).includes(q)) return s
  }
  return secs[0]
}

/* ============ 模式切换 ============ */
async function switchMode(m: Mode) {
  mode.value = m
  if (m === 'full' && !fullIndexCache && !fullLoading.value) {
    fullLoading.value = true
    fullFailed.value = false
    try {
      await loadFullIndex()
    } catch (e) {
      console.error('[search]', e)
      fullFailed.value = true
    } finally {
      fullLoading.value = false
    }
  }
  runSearch()
}
watch([mode, query, useFuzzy], () => {
  enableNoResults.value = false
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
  // 打开即预取轻量数据(标题/摘录), 全文索引懒加载
  loadTitles().catch(() => {})
  loadExcerpts().catch(() => {})
})
onBeforeUnmount(() => clearTimeout(searchTimer))

/* ============ 高亮(安全转义后自实现) ============ */
function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function highlight(s: string, q: string) {
  const t = esc(s)
  const k = esc(q).trim()
  if (!k) return t
  const re = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
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
            <button type="button" role="tab" class="seg-btn" :class="{ active: mode === 'quick' }" @click="switchMode('quick')">标题</button>
            <button type="button" role="tab" class="seg-btn" :class="{ active: mode === 'full' }" @click="switchMode('full')">全文</button>
          </div>
          <span v-if="hint" class="mode-hint">{{ hint }}</span>
          <button type="button" class="detail-btn" :class="{ on: expanded }" title="显示/隐藏正文片段" @click="toggleExpand">详情</button>
          <label v-if="mode === 'full'" class="fuzzy-toggle" :class="{ on: useFuzzy }" title="近似匹配: 容忍错字/形近词">
            <input v-model="useFuzzy" type="checkbox" />
            <span class="fuzzy-track"><span class="fuzzy-knob" /></span>
            <span class="fuzzy-label">模糊</span>
          </label>
        </div>

        <div v-if="fullLoading" class="state-row"><span class="spinner" />正在加载全文索引…</div>
        <div v-else-if="fullFailed" class="state-row error">全文索引加载失败, 请刷新重试</div>

        <ul v-if="results.length" ref="listEl" class="results">
          <li
            v-for="(p, i) in results"
            :key="p.id"
            class="result-item"
            :class="{ selected: i === selectedIndex }"
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
        <div v-else-if="query && enableNoResults && !fullLoading" class="no-results">
          未找到与 "<strong>{{ query }}</strong>" 相关的结果
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
.mode-hint { font-size: 0.75rem; color: var(--vp-c-text-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

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
