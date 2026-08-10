<script lang="ts" setup>
import localSearchIndex from '@localSearchIndex'
import titleIndexData from 'virtual:title-index'
import {
  computedAsync,
  debouncedWatch,
  onKeyStroke,
  useEventListener,
  useLocalStorage,
  useScrollLock,
  useSessionStorage
} from '@vueuse/core'
import { useFocusTrap } from '@vueuse/integrations/useFocusTrap'
import Mark from 'mark.js/src/vanilla.js'
import MiniSearch, { type SearchResult } from 'minisearch'
import { dataSymbol, inBrowser, useData, useRouter } from 'vitepress'
import {
  computed,
  createApp,
  markRaw,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
  watchEffect,
  type Ref
} from 'vue'
import { pathToFile } from 'vitepress/dist/client/app/utils'
import { escapeRegExp } from 'vitepress/dist/client/shared'
import { LRUCache } from 'vitepress/dist/client/theme-default/support/lru'
import { createSearchTranslate } from 'vitepress/dist/client/theme-default/support/translation'

interface ModalTranslations {
  displayDetails?: string
  resetButtonTitle?: string
  backButtonTitle?: string
  noResultsText?: string
  footer?: {
    selectText?: string
    selectKeyAriaLabel?: string
    navigateText?: string
    navigateUpKeyAriaLabel?: string
    navigateDownKeyAriaLabel?: string
    closeText?: string
    closeKeyAriaLabel?: string
  }
}

const emit = defineEmits<{
  (e: 'close'): void
}>()

/* ====== 两档模式 ======
 * quick  : 标题快速搜索 —— 使用随组件打包的轻量标题索引(数 KB), 秒开、免下载大索引
 * full   : 全文精细搜索 —— 懒加载压缩后的 MiniSearch 索引(约 2.5MB, 首次点击该档才下载)
 */
type SearchMode = 'quick' | 'full'
const mode = ref<SearchMode>('quick')
// 分段控件滑动拇指: 全文档时右移一格(弹性缓动由 CSS transition 完成)
const SEG_WIDTH = 68
const segThumbStyle = computed(() => ({
  transform:
    mode.value === 'full' ? `translateX(${SEG_WIDTH}px)` : 'translateX(0px)'
}))

const el = shallowRef<HTMLElement>()
const resultsEl = shallowRef<HTMLElement>()

/* Full search (原文实现) */
const searchIndexData = shallowRef(localSearchIndex)
if (import.meta.hot) {
  import.meta.hot.accept('/@localSearchIndex', (m) => {
    if (m) searchIndexData.value = m.default
  })
}
interface Result {
  title: string
  titles: string[]
  text?: string
}
const vitePressData = useData()
const { activate } = useFocusTrap(el, {
  immediate: true,
  allowOutsideClick: true,
  clickOutsideDeactivates: true,
  escapeDeactivates: true
})
const { localeIndex, theme } = vitePressData
// 全文索引: 显式懒加载(避免 computedAsync 的 .value 无法 await 的问题)
const fullIndex = shallowRef<MiniSearch<Result> | undefined>(undefined)
const fullIndexLoading = ref(false)
const fullIndexFailed = ref(false)
async function loadFullIndex() {
  if (fullIndex.value !== undefined) return
  if (fullIndexLoading.value) return
  fullIndexLoading.value = true
  fullIndexFailed.value = false
  try {
    const data = (await searchIndexData.value[localeIndex.value]?.())?.default
    if (!data) throw new Error('search index empty')
    fullIndex.value = markRaw(
      MiniSearch.loadJSON<Result>(data, {
        fields: ['title', 'titles', 'text'],
        storeFields: ['title', 'titles'],
        searchOptions: {
          fuzzy: 0.2,
          prefix: true,
          boost: { title: 4, text: 2, titles: 1 },
          ...(theme.value.search?.provider === 'local' &&
            theme.value.search.options?.miniSearch?.searchOptions)
        },
        ...(theme.value.search?.provider === 'local' &&
          theme.value.search.options?.miniSearch?.options)
      })
    )
  } catch (e) {
    console.error(e)
    fullIndexFailed.value = true
  } finally {
    fullIndexLoading.value = false
  }
}

const disableQueryPersistence = computed(() => {
  return (
    theme.value.search?.provider === 'local' &&
    theme.value.search.options?.disableQueryPersistence === true
  )
})
const filterText = disableQueryPersistence.value
  ? ref('')
  : useSessionStorage('vitepress:local-search-filter', '')

const showDetailedList = useLocalStorage(
  'vitepress:local-search-detailed-list',
  theme.value.search?.provider === 'local' &&
    theme.value.search.options?.detailedView === true
)
const disableDetailedView = computed(() => {
  return (
    theme.value.search?.provider === 'local' &&
    (theme.value.search.options?.disableDetailedView === true ||
      theme.value.search.options?.detailedView === false)
  )
})
const buttonText = computed(() => {
  const options = theme.value.search?.options ?? theme.value.algolia
  return (
    options?.locales?.[localeIndex.value]?.translations?.button?.buttonText ||
    options?.translations?.button?.buttonText ||
    'Search'
  )
})
watchEffect(() => {
  if (disableDetailedView.value) showDetailedList.value = false
})

const results: Ref<(SearchResult & Result)[]> = shallowRef([])
const enableNoResults = ref(false)
watch(filterText, () => {
  enableNoResults.value = false
})

const mark = computedAsync(async () => {
  if (!resultsEl.value) return
  return markRaw(new Mark(resultsEl.value))
}, null)
const cache = new LRUCache<string, Map<string, string>>(16)

/* 标题索引(快速档) */
interface QuickEntry {
  id: string
  title: string
  titles: string[]
}
const quickIndex = computed<QuickEntry[]>(() => {
  const d = (titleIndexData as unknown) as QuickEntry[]
  return d
})
function quickSearch(q: string): (QuickEntry & { score: number })[] {
  const query = q.trim().toLowerCase()
  if (!query) return []
  const hit = (s: string) => s.toLowerCase().includes(query)
  const entries: (QuickEntry & { score: number })[] = []
  for (const e of quickIndex.value) {
    const titleHit = hit(e.title)
    const pathHit = hit(e.id)
    const parentHit = e.titles.some(hit)
    if (titleHit || pathHit || parentHit) {
      let score = 0
      if (e.title.toLowerCase().startsWith(query)) score = 4
      else if (titleHit) score = 3
      else if (pathHit) score = 2
      else score = 1
      entries.push({ ...e, score })
    }
  }
  return entries.sort((a, b) => b.score - a.score).slice(0, 16)
}

/* 模式切换 */
async function switchMode(m: SearchMode) {
  mode.value = m
  if (m === 'full') {
    await loadFullIndex()
  }
  enableNoResults.value = false
  runSearch()
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
function runSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    if (mode.value === 'quick') {
      const q = filterText.value
      results.value = quickSearch(q) as unknown as (SearchResult & Result)[]
      enableNoResults.value = true
    } else {
      if (!fullIndex.value) return
      results.value = fullIndex.value
        .search(filterText.value)
        .slice(0, 16) as (SearchResult & Result)[]
      enableNoResults.value = true
    }
  }, mode.value === 'quick' ? 0 : 120)
}

watch([mode, filterText], () => {
  enableNoResults.value = false
  runSearch()
})

/* 高亮与摘录(仅全文档需要) */
debouncedWatch(
  () => [fullIndex.value, filterText.value, showDetailedList.value] as const,
  async ([index, filterTextValue, showDetailedListValue], old, onCleanup) => {
    if (mode.value !== 'full') return
    if (old?.[0] !== index) cache.clear()
    let canceled = false
    onCleanup(() => {
      canceled = true
    })
    if (!index) return
    const fullResults = index
      .search(filterTextValue)
      .slice(0, 16) as (SearchResult & Result)[]
    const mods = showDetailedListValue
      ? await Promise.all(fullResults.map((r) => fetchExcerpt(r.id)))
      : []
    if (canceled) return
    for (const { id, mod } of mods) {
      const mapId = id.slice(0, id.indexOf('#'))
      let map = cache.get(mapId)
      if (map) continue
      map = new Map()
      cache.set(mapId, map)
      const comp = mod.default ?? mod
      if (comp?.render || comp?.setup) {
        const app = createApp(comp)
        app.config.warnHandler = () => {}
        app.provide(dataSymbol, vitePressData)
        Object.defineProperties(app.config.globalProperties, {
          $frontmatter: {
            get() {
              return vitePressData.frontmatter.value
            }
          },
          $params: {
            get() {
              return vitePressData.page.value.params
            }
          }
        })
        const div = document.createElement('div')
        app.mount(div)
        let h = div.querySelector('h1, h2, h3, h4, h5, h6') as HTMLElement | null
        while (h) {
          const href = h.querySelector('a')?.getAttribute('href')
          const anchor = href?.startsWith('#') && href.slice(1)
          if (!anchor) break
          let html = ''
          let sib = h.nextElementSibling
          while (sib && !/^h[1-6]$/i.test(sib.tagName)) {
            html += sib.outerHTML
            sib = sib.nextElementSibling
          }
          map.set(anchor, html)
          h = sib
        }
        app.unmount()
      }
      if (canceled) return
    }
    const terms = new Set<string>()
    results.value = fullResults.map((r) => {
      const [id, anchor] = r.id.split('#')
      const text = cache.get(id)?.get(anchor) ?? ''
      for (const term in r.match) terms.add(term)
      return { ...r, text }
    })
    await nextTick()
    if (canceled) return
    await new Promise((r) => {
      mark.value?.unmark({
        done: () => {
          mark.value?.markRegExp(formMarkRegex(terms), { done: r })
        }
      })
    })
    const excerpts = el.value?.querySelectorAll('.result .excerpt') ?? []
    for (const excerpt of excerpts) {
      excerpt
        .querySelector('mark[data-markjs="true"]')
        ?.scrollIntoView({ block: 'center' })
    }
    resultsEl.value?.firstElementChild?.scrollIntoView({ block: 'start' })
  },
  { debounce: 200, immediate: true }
)

async function fetchExcerpt(id: string) {
  const file = pathToFile(id.slice(0, id.indexOf('#')))
  try {
    if (!file) throw new Error(`Cannot find file for id: ${id}`)
    return { id, mod: await import(/*@vite-ignore*/ file) }
  } catch (e) {
    console.error(e)
    return { id, mod: {} }
  }
}

/* 输入聚焦 */
const searchInput = ref<HTMLInputElement>()
const disableReset = computed(() => filterText.value?.length <= 0)
function focusSearchInput(select = true) {
  searchInput.value?.focus()
  select && searchInput.value?.select()
}
onMounted(() => focusSearchInput())
function onSearchBarClick(event: PointerEvent) {
  if (event.pointerType === 'mouse') {
    focusSearchInput()
  }
}

/* 键盘选择 */
const selectedIndex = ref(-1)
const disableMouseOver = ref(true)
watch(results, (r) => {
  selectedIndex.value = r.length ? 0 : -1
  scrollToSelectedResult()
})
function scrollToSelectedResult() {
  nextTick(() => {
    document.querySelector('.result.selected')?.scrollIntoView({ block: 'nearest' })
  })
}
onKeyStroke('ArrowUp', (event) => {
  event.preventDefault()
  selectedIndex.value--
  if (selectedIndex.value < 0) selectedIndex.value = results.value.length - 1
  disableMouseOver.value = true
  scrollToSelectedResult()
})
onKeyStroke('ArrowDown', (event) => {
  event.preventDefault()
  selectedIndex.value++
  if (selectedIndex.value >= results.value.length) selectedIndex.value = 0
  disableMouseOver.value = true
  scrollToSelectedResult()
})
const router = useRouter()
onKeyStroke('Enter', (e) => {
  if (e.isComposing) return
  if (e.target instanceof HTMLButtonElement && e.target.type !== 'submit') return
  const selectedPackage = results.value[selectedIndex.value]
  if (e.target instanceof HTMLInputElement && !selectedPackage) {
    e.preventDefault()
    return
  }
  if (selectedPackage) {
    router.go(selectedPackage.id)
    emit('close')
  }
})
onKeyStroke('Escape', () => emit('close'))

/* 文案 */
const defaultTranslations: { modal: ModalTranslations } = {
  modal: {
    displayDetails: 'Display detailed list',
    resetButtonTitle: 'Reset search',
    backButtonTitle: 'Close search',
    noResultsText: 'No results for',
    footer: {
      selectText: 'to select',
      selectKeyAriaLabel: 'enter',
      navigateText: 'to navigate',
      navigateUpKeyAriaLabel: 'up arrow',
      navigateDownKeyAriaLabel: 'down arrow',
      closeText: 'to close',
      closeKeyAriaLabel: 'escape'
    }
  }
}
const translate = createSearchTranslate(defaultTranslations)

onMounted(() => window.history.pushState(null, '', null))
useEventListener('popstate', (event) => {
  event.preventDefault()
  emit('close')
})
const isLocked = useScrollLock(inBrowser ? document.body : null)
onMounted(() => {
  nextTick(() => {
    isLocked.value = true
    nextTick().then(() => activate())
  })
})
onBeforeUnmount(() => {
  isLocked.value = false
})
function resetSearch() {
  filterText.value = ''
  nextTick().then(() => focusSearchInput(false))
}
function formMarkRegex(terms: Set<string>) {
  return new RegExp(
    [...terms]
      .sort((a, b) => b.length - a.length)
      .map((term) => `(${escapeRegExp(term)})`)
      .join('|'),
    'gi'
  )
}
function onMouseMove(e: MouseEvent) {
  if (!disableMouseOver.value) return
  const el2 = (e.target as HTMLElement)?.closest<HTMLAnchorElement>('.result')
  const index = Number.parseInt(el2?.dataset.index!)
  if (index >= 0 && index !== selectedIndex.value) {
    selectedIndex.value = index
  }
  disableMouseOver.value = false
}
</script>

<template>
  <Teleport to="body">
    <div
      ref="el"
      role="button"
      :aria-owns="results?.length ? 'localsearch-list' : undefined"
      aria-expanded="true"
      aria-haspopup="listbox"
      aria-labelledby="localsearch-label"
      class="VPLocalSearchBox"
    >
      <div class="backdrop" @click="$emit('close')" />

      <div class="shell">
        <form
          class="search-bar"
          @pointerup="onSearchBarClick($event)"
          @submit.prevent=""
        >
          <label
            :title="buttonText"
            id="localsearch-label"
            for="localsearch-input"
          >
            <span aria-hidden="true" class="vpi-search search-icon local-search-icon" />
          </label>
          <div class="search-actions before">
            <button
              class="back-button"
              :title="translate('modal.backButtonTitle')"
              @click="$emit('close')"
            >
              <span class="vpi-arrow-left local-search-icon" />
            </button>
          </div>
          <input
            ref="searchInput"
            v-model="filterText"
            :aria-activedescendant="selectedIndex > -1 ? ('localsearch-item-' + selectedIndex) : undefined"
            aria-autocomplete="both"
            :aria-controls="results?.length ? 'localsearch-list' : undefined"
            aria-labelledby="localsearch-label"
            autocapitalize="off"
            autocomplete="off"
            autocorrect="off"
            class="search-input"
            id="localsearch-input"
            enterkeyhint="go"
            maxlength="64"
            :placeholder="buttonText"
            spellcheck="false"
            type="search"
          />
          <div class="search-actions">
            <button
              v-if="!disableDetailedView"
              class="toggle-layout-button"
              type="button"
              :class="{ 'detailed-list': showDetailedList }"
              :title="translate('modal.displayDetails')"
              @click="selectedIndex > -1 && (showDetailedList = !showDetailedList)"
            >
              <span class="vpi-layout-list local-search-icon" />
            </button>
            <button
              class="clear-button"
              type="reset"
              :disabled="disableReset"
              :title="translate('modal.resetButtonTitle')"
              @click="resetSearch"
            >
              <span class="vpi-delete local-search-icon" />
            </button>
          </div>
        </form>

        <div class="mode-row">
          <div class="segmented" role="tablist" aria-label="搜索范围">
            <div class="seg-thumb" :style="segThumbStyle" />
            <button
              type="button"
              role="tab"
              class="seg-btn"
              :class="{ active: mode === 'quick' }"
              @click="switchMode('quick')"
            >
              标题
            </button>
            <button
              type="button"
              role="tab"
              class="seg-btn"
              :class="{ active: mode === 'full' }"
              @click="switchMode('full')"
            >
              全文
            </button>
          </div>
          <span class="mode-hint">
            {{ mode === 'quick' ? '即时检索标题 · 切"全文"可搜正文' : '全文索引已加载 · 深度检索' }}
          </span>
        </div>

        <div v-if="fullIndexLoading" class="index-loading">
          <span class="spinner" />
          正在加载全文索引…
        </div>
        <div v-else-if="fullIndexFailed" class="index-loading error">
          全文索引加载失败
        </div>

        <ul
          ref="resultsEl"
          :id="results?.length ? 'localsearch-list' : undefined"
          :role="results?.length ? 'listbox' : undefined"
          :aria-labelledby="results?.length ? 'localsearch-label' : undefined"
          class="results"
          @mousemove="onMouseMove"
        >
          <li
            v-for="(p, index) in results"
            :key="p.id"
            :id="'localsearch-item-' + index"
            :aria-selected="selectedIndex === index ? 'true' : 'false'"
            role="option"
          >
            <a
              :href="p.id"
              class="result"
              :class="{ selected: selectedIndex === index }"
              :aria-label="[...p.titles, p.title].join(' > ')"
              @mouseenter="!disableMouseOver && (selectedIndex = index)"
              @focusin="selectedIndex = index"
              @click="$emit('close')"
              :data-index="index"
            >
              <div>
                <div class="titles">
                  <span class="title-icon">#</span>
                  <span
                    v-for="(t, index) in p.titles"
                    :key="index"
                    class="title"
                  >
                    <span class="text" v-html="t" />
                    <span class="vpi-chevron-right local-search-icon" />
                  </span>
                  <span class="title main">
                    <span class="text" v-html="p.title" />
                  </span>
                  <span v-if="mode === 'quick'" class="quick-path">{{ p.id }}</span>
                </div>

                <div v-if="showDetailedList && mode === 'full'" class="excerpt-wrapper">
                  <div v-if="p.text" class="excerpt" inert>
                    <div class="vp-doc" v-html="p.text" />
                  </div>
                  <div class="excerpt-gradient-bottom" />
                  <div class="excerpt-gradient-top" />
                </div>
              </div>
            </a>
          </li>
          <li
            v-if="filterText && !results.length && enableNoResults && !fullIndexLoading"
            class="no-results"
          >
            {{ translate('modal.noResultsText') }} "<strong>{{ filterText }}</strong
            >"
          </li>
        </ul>

        <div class="search-keyboard-shortcuts">
          <span>
            <kbd :aria-label="translate('modal.footer.navigateUpKeyAriaLabel')">
              <span class="vpi-arrow-up navigate-icon" />
            </kbd>
            <kbd :aria-label="translate('modal.footer.navigateDownKeyAriaLabel')">
              <span class="vpi-arrow-down navigate-icon" />
            </kbd>
            {{ translate('modal.footer.navigateText') }}
          </span>
          <span>
            <kbd :aria-label="translate('modal.footer.selectKeyAriaLabel')">
              <span class="vpi-corner-down-left navigate-icon" />
            </kbd>
            {{ translate('modal.footer.selectText') }}
          </span>
          <span>
            <kbd :aria-label="translate('modal.footer.closeKeyAriaLabel')">esc</kbd>
            {{ translate('modal.footer.closeText') }}
          </span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.VPLocalSearchBox {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: flex;
}

.backdrop {
  position: absolute;
  inset: 0;
  background: var(--vp-backdrop-bg-color);
  transition: opacity 0.5s;
}

.shell {
  position: relative;
  padding: 12px;
  margin: 64px auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--vp-local-search-bg);
  width: min(100vw - 60px, 900px);
  height: min-content;
  max-height: min(100vh - 128px, 900px);
  border-radius: 6px;
}

@media (max-width: 767px) {
  .shell {
    margin: 0;
    width: 100vw;
    height: 100vh;
    max-height: none;
    border-radius: 0;
  }
}

.search-bar {
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  cursor: text;
}

@media (max-width: 767px) {
  .search-bar {
    padding: 0 8px;
  }
}

.search-bar:focus-within {
  border-color: var(--vp-c-brand-1);
}

.local-search-icon {
  display: block;
  font-size: 18px;
}

.navigate-icon {
  display: block;
  font-size: 14px;
}

.search-icon {
  margin: 8px;
}

@media (max-width: 767px) {
  .search-icon {
    display: none;
  }
}

.search-input {
  padding: 6px 12px;
  font-size: inherit;
  width: 100%;
}

@media (max-width: 767px) {
  .search-input {
    padding: 6px 4px;
  }
}

.search-actions {
  display: flex;
  gap: 4px;
}

@media (any-pointer: coarse) {
  .search-actions {
    gap: 8px;
  }
}

@media (min-width: 769px) {
  .search-actions.before {
    display: none;
  }
}

.search-actions button {
  padding: 8px;
}

.search-actions button:not([disabled]):hover,
.toggle-layout-button.detailed-list {
  color: var(--vp-c-brand-1);
}

.search-actions button.clear-button:disabled {
  opacity: 0.37;
}

.search-keyboard-shortcuts {
  font-size: 0.8rem;
  opacity: 75%;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  line-height: 14px;
}

.search-keyboard-shortcuts span {
  display: flex;
  align-items: center;
  gap: 4px;
}

@media (max-width: 767px) {
  .search-keyboard-shortcuts {
    display: none;
  }
}

.search-keyboard-shortcuts kbd {
  background: rgba(128, 128, 128, 0.1);
  border-radius: 4px;
  padding: 3px 6px;
  min-width: 24px;
  display: inline-block;
  text-align: center;
  vertical-align: middle;
  border: 1px solid rgba(128, 128, 128, 0.15);
  box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.1);
}

.results {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.result {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 4px;
  transition: none;
  line-height: 1rem;
  border: solid 2px var(--vp-local-search-result-border);
  outline: none;
}

.result > div {
  margin: 12px;
  width: 100%;
  overflow: hidden;
}

@media (max-width: 767px) {
  .result > div {
    margin: 8px;
  }
}

.titles {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  position: relative;
  z-index: 1001;
  padding: 2px 0;
}

.title {
  display: flex;
  align-items: center;
  gap: 4px;
}

.title.main {
  font-weight: 500;
}

.title-icon {
  opacity: 0.5;
  font-weight: 500;
  color: var(--vp-c-brand-1);
}

.title svg {
  opacity: 0.5;
}

.result.selected {
  --vp-local-search-result-bg: var(--vp-local-search-result-selected-bg);
  border-color: var(--vp-local-search-result-selected-border);
}

.excerpt-wrapper {
  position: relative;
}

.excerpt {
  opacity: 50%;
  pointer-events: none;
  max-height: 140px;
  overflow: hidden;
  position: relative;
  margin-top: 4px;
}

.result.selected .excerpt {
  opacity: 1;
}

.excerpt :deep(*) {
  font-size: 0.8rem !important;
  line-height: 130% !important;
}

.titles :deep(mark),
.excerpt :deep(mark) {
  background-color: var(--vp-local-search-highlight-bg);
  color: var(--vp-local-search-highlight-text);
  border-radius: 2px;
  padding: 0 2px;
}

.excerpt :deep(.vp-code-group) .tabs {
  display: none;
}

.excerpt :deep(.vp-code-group) div[class*='language-'] {
  border-radius: 8px !important;
}

.excerpt-gradient-bottom {
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 8px;
  background: linear-gradient(transparent, var(--vp-local-search-result-bg));
  z-index: 1000;
}

.excerpt-gradient-top {
  position: absolute;
  top: -1px;
  left: 0;
  width: 100%;
  height: 8px;
  background: linear-gradient(var(--vp-local-search-result-bg), transparent);
  z-index: 1000;
}

.result.selected .titles,
.result.selected .title-icon {
  color: var(--vp-c-brand-1) !important;
}

.no-results {
  font-size: 0.9rem;
  text-align: center;
  padding: 12px;
}

svg {
  flex: none;
}


/* ===== 两档搜索: 分段控件 / 加载状态 / 快速档路径 ===== */
/* 分段控件: Apple 风格胶囊, 滑动拇指指示器 */
.mode-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 2px;
}

.segmented {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  padding: 3px;
  border-radius: 8px;
  background: var(--vp-c-default-soft);
}

.seg-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 68px;
  height: calc(100% - 6px);
  border-radius: 6px;
  background: var(--vp-c-bg);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  transition: transform 0.28s cubic-bezier(0.22, 0.61, 0.36, 1);
  pointer-events: none;
}

.seg-btn {
  position: relative;
  z-index: 1;
  width: 68px;
  padding: 5px 0;
  border: none;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 0.8rem;
  cursor: pointer;
  transition: color 0.2s ease;
}

.seg-btn:hover {
  color: var(--vp-c-text-1);
}

.seg-btn.active {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.mode-hint {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 弹窗入场: 淡入 + 轻微上移缩放 */
.shell {
  animation: vp-search-in 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes vp-search-in {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* 输入框弹性收缩, 防止操作按钮被挤出搜索栏 */
.search-input {
  flex: 1 1 auto;
  min-width: 0;
  width: auto;
}

.index-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

.index-loading.error {
  color: var(--vp-c-danger-1);
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--vp-c-divider);
  border-top-color: var(--vp-c-brand-1);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.quick-path {
  margin-left: 6px;
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}
</style>