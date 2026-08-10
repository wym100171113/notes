<script setup lang="ts">
import { onMounted, ref, watch, nextTick } from 'vue'
import { useRoute, useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import renderMathInElement from 'katex/contrib/auto-render'
import mermaid from 'mermaid'
import SidebarLocator from './components/SidebarLocator.vue'

const route = useRoute()
const { isDark } = useData()
const page = ref<HTMLElement>()

/* ===== Mermaid 放大查看(lightbox) ===== */
const lightboxOpen = ref(false)
const stage = ref<HTMLElement>()
let zoom = 1
let panX = 0
let panY = 0
let dragging = false
let dragStart = { x: 0, y: 0, px: 0, py: 0 }

function clampZoom(v: number) {
  return Math.min(8, Math.max(0.4, v))
}

function applyTransform() {
  const svg = stage.value?.querySelector('svg') as SVGElement | null
  if (svg) svg.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`
}

function openLightbox(srcSvg: SVGElement) {
  lightboxOpen.value = true
  zoom = 1
  panX = 0
  panY = 0
  nextTick(() => {
    const box = stage.value
    if (!box) return
    box.innerHTML = ''
    const clone = srcSvg.cloneNode(true) as SVGElement
    clone.style.transformOrigin = '0 0'
    box.appendChild(clone)
    applyTransform()
  })
}

function closeLightbox() {
  lightboxOpen.value = false
  dragging = false
}

function zoomAt(cx: number, cy: number, factor: number) {
  const next = clampZoom(zoom * factor)
  panX = cx - ((cx - panX) * next) / zoom
  panY = cy - ((cy - panY) * next) / zoom
  zoom = next
  applyTransform()
}

function onWheel(e: WheelEvent) {
  const el = stage.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.12 : 0.89)
}

function onPointerDown(e: PointerEvent) {
  dragging = true
  dragStart = { x: e.clientX, y: e.clientY, px: panX, py: panY }
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging) return
  panX = dragStart.px + (e.clientX - dragStart.x)
  panY = dragStart.py + (e.clientY - dragStart.y)
  applyTransform()
}

function endDrag() {
  dragging = false
}

function resetZoom() {
  zoom = 1
  panX = 0
  panY = 0
  applyTransform()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && lightboxOpen.value) closeLightbox()
}

let mermaidInitialized = false
function initMermaid() {
  if (mermaidInitialized) return
  mermaidInitialized = true
  mermaid.initialize({
    startOnLoad: false,
    theme: isDark.value ? 'dark' : 'default',
    securityLevel: 'strict',
  })
}

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

// 渲染单张 mermaid 图(源码留存在 wrap.dataset.mermaidSrc, 供深色模式重绘)
function renderOneMermaid(source: string) {
  const id = 'mmd-' + Math.random().toString(36).slice(2, 10)
  return mermaid.render(id, source).then(({ svg }) => {
    const wrap = document.createElement('div')
    wrap.className = 'mermaid'
    wrap.dataset.mermaidSrc = source
    wrap.innerHTML = svg
    // 放大查看按钮
    const zoomBtn = document.createElement('button')
    zoomBtn.type = 'button'
    zoomBtn.className = 'mermaid-zoom-btn'
    zoomBtn.title = '放大查看'
    zoomBtn.setAttribute('aria-label', '放大查看脉络图')
    zoomBtn.innerHTML = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M10 2h4v4l-1.5-1.5-3 3L8.5 6.5l3-3L10 2zM6 14H2v-4l1.5 1.5 3-3L7.5 9.5l-3 3L6 14z" fill="currentColor"/></svg>'
    zoomBtn.addEventListener('click', (ev) => {
      ev.stopPropagation()
      const svgEl = wrap.querySelector('svg')
      if (svgEl) openLightbox(svgEl)
    })
    wrap.appendChild(zoomBtn)
    return wrap
  })
}

async function renderMermaid() {
  const el = page.value
  if (!el) return
  initMermaid()
  const blocks = el.querySelectorAll<HTMLElement>('div.language-mermaid')
  for (const div of blocks) {
    const code = div.querySelector('code')
    if (!code) continue
    const source = (code.textContent || '').trim()
    if (!source || div.dataset.mermaidRendered) continue
    div.dataset.mermaidRendered = '1'
    try {
      const wrap = await renderOneMermaid(source)
      div.replaceWith(wrap)
    } catch (err) {
      // 渲染失败: 保留原始源码, 仅标记
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

onMounted(() => {
  renderAll()
  // 首次渲染可能在路由就绪前, 再补一次
  setTimeout(renderAll, 0)
  window.addEventListener('keydown', onKeydown)
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

// 切换深色模式时重绘 Mermaid(用留存的源码, 图与放大按钮都会重建)
watch(isDark, () => {
  mermaidInitialized = false
  const pre = page.value
  if (pre) {
    const sources: string[] = []
    pre.querySelectorAll<HTMLElement>('.mermaid[data-mermaid-src]').forEach((el) => {
      sources.push(el.dataset.mermaidSrc || '')
      el.remove()
    })
    if (sources.length) {
      initMermaid()
      sources.forEach((src) => {
        if (src) renderOneMermaid(src).then((wrap) => pre.appendChild(wrap))
      })
    }
  }
})
</script>

<template>
  <div ref="page" class="katex-root">
    <DefaultTheme.Layout>
      <template #sidebar-nav-after>
        <SidebarLocator />
      </template>
    </DefaultTheme.Layout>
  </div>

  <Teleport to="body">
    <div
      v-if="lightboxOpen"
      class="mermaid-lightbox"
      @wheel.prevent="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="endDrag"
      @pointercancel="endDrag"
      @pointerleave="endDrag"
      @click.self="closeLightbox"
    >
      <div class="lightbox-toolbar" @pointerdown.stop @click.stop>
        <span class="lightbox-title">脉络图</span>
        <button type="button" title="放大" @click="zoomAt(200, 150, 1.25)">＋</button>
        <button type="button" title="缩小" @click="zoomAt(200, 150, 0.8)">－</button>
        <button type="button" title="重置" @click="resetZoom">重置</button>
        <button type="button" class="lightbox-close" title="关闭 (Esc)" @click="closeLightbox">✕</button>
      </div>
      <div class="lightbox-hint">滚轮缩放 · 拖拽平移 · Esc 关闭</div>
      <div ref="stage" class="lightbox-stage" />
    </div>
  </Teleport>
</template>

<style scoped>
/* Mermaid 放大按钮(动态生成元素, 用 :deep) */
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
  opacity: 0;
  transition: opacity 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

:deep(.mermaid:hover) :deep(.mermaid-zoom-btn),
:deep(.mermaid-zoom-btn:focus-visible) {
  opacity: 1;
}

:deep(.mermaid-zoom-btn:hover) {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

/* Lightbox 浮层 */
.mermaid-lightbox {
  position: fixed;
  z-index: 200;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(2px);
  cursor: grab;
  user-select: none;
}

.mermaid-lightbox:active {
  cursor: grabbing;
}

.lightbox-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--vp-c-bg);
  box-shadow: var(--vp-shadow-3);
  margin-bottom: 10px;
}

.lightbox-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-right: 8px;
}

.lightbox-toolbar button {
  min-width: 30px;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-1);
  font-size: 0.85rem;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.lightbox-toolbar button:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.lightbox-close {
  margin-left: 6px;
}

.lightbox-hint {
  margin-bottom: 10px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.75);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.lightbox-stage {
  width: min(92vw, 1400px);
  height: min(80vh, 900px);
  overflow: hidden;
  border-radius: 10px;
  background: var(--vp-c-bg);
  box-shadow: var(--vp-shadow-3);
}

.lightbox-stage svg {
  max-width: none;
  width: auto;
  height: auto;
  transform-origin: 0 0;
  cursor: grab;
}

.lightbox-stage svg:active {
  cursor: grabbing;
}
</style>
