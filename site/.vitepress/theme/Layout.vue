<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import renderMathInElement from 'katex/contrib/auto-render'
import SidebarLocator from './components/SidebarLocator.vue'
import MermaidLightbox from './components/MermaidLightbox.vue'

const route = useRoute()
const { isDark } = useData()
const page = ref<HTMLElement>()
const lightbox = ref<InstanceType<typeof MermaidLightbox>>()

/* ===== 公式渲染(KaTeX, 浏览器端) ===== */
async function renderMath() {
  const el = page.value?.querySelector('.vp-doc')
  if (!el) return
  try {
    renderMathInElement(el, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false },
      ],
      throwOnError: false,
      strict: 'ignore',
    })
  } catch (err) {
    // 单个公式渲染失败不影响页面
    console.error('[katex]', err)
  }
}

/* ===== Mermaid 渲染(mermaid 体积大, 页面存在脉络图时才动态加载) ===== */
let mermaidInitialized = false
let mermaidModule: typeof import('mermaid') | null = null

async function getMermaid(): Promise<typeof import('mermaid') | null> {
  if (!mermaidModule) {
    try {
      mermaidModule = await import('mermaid')
    } catch {
      return null
    }
  }
  return mermaidModule
}

function initMermaid() {
  if (mermaidInitialized) return
  mermaidInitialized = true
  mermaidModule?.default.initialize({
    startOnLoad: false,
    theme: isDark.value ? 'dark' : 'default',
    securityLevel: 'strict',
  })
}

async function renderOneMermaid(source: string): Promise<HTMLElement | null> {
  const mermaid = await getMermaid()
  if (!mermaid) return null
  const id = 'mmd-' + Math.random().toString(36).slice(2, 10)
  return mermaid.default.render(id, source).then(({ svg }) => {
    const wrap = document.createElement('div')
    wrap.className = 'mermaid'
    // 源码留存, 供深色模式原位重绘
    wrap.dataset.mermaidSrc = source
    wrap.innerHTML = svg
    // 放大查看按钮
    const zoomBtn = document.createElement('button')
    zoomBtn.type = 'button'
    zoomBtn.className = 'mermaid-zoom-btn'
    zoomBtn.title = '放大查看'
    zoomBtn.setAttribute('aria-label', '放大查看脉络图')
    zoomBtn.innerHTML =
      '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M10 2h4v4l-1.5-1.5-3 3L8.5 6.5l3-3L10 2zM6 14H2v-4l1.5 1.5 3-3L7.5 9.5l-3 3L6 14z" fill="currentColor"/></svg>'
    zoomBtn.addEventListener('click', (ev) => {
      ev.stopPropagation()
      const svgEl = wrap.querySelector('svg')
      if (svgEl) lightbox.value?.open(svgEl)
    })
    wrap.appendChild(zoomBtn)
    return wrap
  })
}

async function renderMermaid() {
  const el = page.value
  if (!el) return
  const blocks = el.querySelectorAll<HTMLElement>('div.language-mermaid')
  if (!blocks.length) return
  if (!(await getMermaid())) return
  initMermaid()
  for (const div of blocks) {
    const code = div.querySelector('code')
    if (!code) continue
    const source = (code.textContent || '').trim()
    if (!source || div.dataset.mermaidRendered) continue
    div.dataset.mermaidRendered = '1'
    try {
      const wrap = await renderOneMermaid(source)
      // 渲染期间可能已切换路由, 原节点脱离文档则丢弃结果
      if (wrap && div.isConnected) div.replaceWith(wrap)
    } catch (err) {
      // 渲染失败: 保留原始源码, 仅标记(标记为未渲染, 允许下次路由进入时重试)
      if (!div.isConnected) continue
      div.dataset.mermaidRendered = ''
      const msg = document.createElement('div')
      msg.className = 'mermaid-error'
      msg.textContent = '[Mermaid 渲染失败]'
      div.before(msg)
    }
  }
}

function renderAll() {
  renderMath()
  renderMermaid()
}

/* ===== 生命周期 ===== */
onMounted(() => {
  renderAll()
  // 首次渲染可能在路由就绪前, 再补一次
  setTimeout(renderAll, 0)
  // 预热搜索框 chunk, 打开搜索时秒开
  import('../components/VPLocalSearchBox.vue').catch(() => {})
})

watch(
  () => route.path,
  () => {
    // 等待新页面内容渲染完成后再渲染公式/图表
    requestAnimationFrame(() => requestAnimationFrame(renderAll))
  },
)

// 切换深色模式时原位重绘 Mermaid(异步渲染完成顺序不可靠, 用占位符保证原顺序;
// 连续切换时用代际序号丢弃过期批次的渲染结果)
watch(isDark, async () => {
  mermaidInitialized = false
  const pre = page.value
  if (!pre) return
  const wraps = [...pre.querySelectorAll<HTMLElement>('.mermaid[data-mermaid-src]')]
  if (!wraps.length) return
  if (!(await getMermaid())) return
  initMermaid()
  const generation = ++redrawGeneration
  const jobs = wraps.map((el) => {
    const src = el.dataset.mermaidSrc || ''
    const placeholder = document.createElement('span')
    placeholder.style.display = 'none'
    el.replaceWith(placeholder)
    return renderOneMermaid(src).then((wrap) => {
      if (generation !== redrawGeneration || !placeholder.isConnected) return
      placeholder.replaceWith(wrap)
    })
  })
  await Promise.all(jobs)
})
let redrawGeneration = 0
</script>

<template>
  <div ref="page" class="katex-root">
    <DefaultTheme.Layout>
      <template #sidebar-nav-after>
        <SidebarLocator />
      </template>
    </DefaultTheme.Layout>
  </div>

  <MermaidLightbox ref="lightbox" />
</template>

<style scoped>
/* Mermaid 图容器与放大按钮(动态生成元素, 用 :deep) */
:deep(.mermaid) {
  position: relative;
}

:deep(.mermaid-zoom-btn) {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease;
}

:deep(.mermaid-zoom-btn:hover) {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}
</style>
