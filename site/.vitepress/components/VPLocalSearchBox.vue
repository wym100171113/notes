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
const searchIndex = computedAsync(async () =>
  markRaw(
    MiniSearch.loadJSON<Result>(
      (await searchIndexData.value[localeIndex.value]?.())?.default,
      {
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
      }
    )
  )
)
const fullIndexLoading = ref(false)
const fullIndexFailed = ref(false)

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
  if (m === 'full' && searchIndex.value === undefined && !fullIndexLoading.value) {
    fullIndexLoading.value = true
    try {
      await searchIndex.value // 触发 computedAsync 的懒加载
    } catch {
      fullIndexFailed.value = true
    } finally {
      fullIndexLoading.value = false
    }
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
      if (!searchIndex.value) return
      results.value = searchIndex.value
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
  () => [searchIndex.value, filterText.value, showDetailedList.value] as const,
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
          h = h.nextElementSibling as HTMLElement | null
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
            <div class="mode-switch" role="tablist" aria-label="搜索范围">
              <button
                type="button"
                role="tab"
                class="mode-btn"
                :class="{ active: mode === 'quick' }"
                @click="switchMode('quick')"
              >
                标题
              </button>
              <button
                type="button"
                role="tab"
                class="mode-btn"
                :class="{ active: mode === 'full' }"
                @click="switchMode('full')"
              >
                全文
              </button>
            </div>
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
          <span v-if="mode === 'quick'" class="mode-hint">标题档 · 即时检索; 切"全文"档可搜索正文</span>
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
  gap: 12px;
  background: var(--vp-c-bg);
  max-height: min(70vh, 600px);
  width: min(560px, 100% - 24px);
  border-radius: 12px;
  box-shadow: var(--vp-shadow-3);
  overflow: hidden;
}

.search-bar {
  display: flex;
  gap: 8px;
  align-items: center;
}

.search-bar label {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 36px;
  height: 40px;
  border-radius: 8px;
  background: var(--vp-c-default-soft);
  cursor: pointer;
}

.search-bar .search-icon {
  font-size: 18px;
}

.search-bar .back-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 40px;
  border-radius: 8px;
  background: var(--vp-c-default-soft);
  cursor: pointer;
}

.search-bar .back-button:hover {
  background: var(--vp-c-default-soft-mute);
}

.search-bar .search-actions.before {
  display: flex;
  gap: 4px;
  align-items: center;
}

.search-bar .search-actions {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-left: auto;
}

.search-bar .search-actions .clear-button,
.search-bar .search-actions .toggle-layout-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 40px;
  border-radius: 8px;
  background: var(--vp-c-default-soft);
  cursor: pointer;
}

.search-bar .search-actions .clear-button:hover,
.search-bar .search-actions .toggle-layout-button:hover {
  background: var(--vp-c-default-soft-mute);
}

.search-bar .search-actions .clear-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.search-bar .search-input {
  flex: 1;
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  font-size: 14px;
  outline: none;
}

.search-bar .search-input:focus {
  border-color: var(--vp-c-brand);
}

.mode-switch {
  display: flex;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  background: var(--vp-c-default-soft);
  flex-shrink: 0;
}

.mode-btn {
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-btn.active {
  background: var(--vp-c-bg);
  color: var(--vp-c-brand);
  box-shadow: var(--vp-shadow-1);
  font-weight: 600;
}

.index-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.index-loading.error {
  color: var(--vp-c-danger-1);
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--vp-c-divider);
  border-top-color: var(--vp-c-brand);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.results {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow: auto;
}

.result {
  display: block;
  padding: 8px 12px;
  border-radius: 8px;
  text-decoration: none;
  color: var(--vp-c-text-1);
}

.result.selected {
  background: var(--vp-c-default-soft);
}

.titles {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  font-size: 14px;
}

.title-icon {
  color: var(--vp-c-brand);
  font-weight: 600;
}

.title {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--vp-c-text-2);
}

.title.main {
  color: var(--vp-c-text-1);
  font-weight: 600;
}

.quick-path {
  margin-left: 6px;
  font-size: 11px;
  color: var(--vp-c-text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 260px;
}

.excerpt-wrapper {
  position: relative;
  margin-top: 4px;
}

.excerpt {
  max-height: 160px;
  overflow: hidden;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.excerpt-gradient-bottom,
.excerpt-gradient-top {
  position: absolute;
  left: 0;
  right: 0;
  height: 24px;
  pointer-events: none;
}

.excerpt-gradient-bottom {
  bottom: 0;
  background: linear-gradient(transparent, var(--vp-c-bg));
}

.excerpt-gradient-top {
  top: 0;
  background: linear-gradient(var(--vp-c-bg), transparent);
}

.no-results {
  padding: 12px;
  color: var(--vp-c-text-2);
  font-size: 14px;
}

.search-keyboard-shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  font-size: 12px;
}

.search-keyboard-shortcuts kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 4px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg-alt);
  font-family: inherit;
  font-size: 11px;
}

.mode-hint {
  margin-left: auto;
  color: var(--vp-c-text-3);
  font-size: 11px;
}
</style>
