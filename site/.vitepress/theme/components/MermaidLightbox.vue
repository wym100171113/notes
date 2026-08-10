<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

// Mermaid 脉络图放大查看(lightbox):
// 滚轮/按钮缩放(锚定缩放中心)、拖拽平移、Esc/背景点击关闭。
// 对外只暴露 open(svg) 一个方法, 显隐与交互全部内聚在组件内。

const visible = ref(false)
const stage = ref<HTMLElement>()
const closeBtn = ref<HTMLButtonElement>()
let lastFocused: HTMLElement | null = null

const MIN_ZOOM = 0.4
const MAX_ZOOM = 8
let zoom = 1
let panX = 0
let panY = 0
let dragging = false
let dragMoved = false
let dragStart = { x: 0, y: 0, px: 0, py: 0 }

function clampZoom(v: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v))
}

function applyTransform() {
  const svg = stage.value?.querySelector('svg') as SVGElement | null
  if (svg) svg.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`
}

function open(srcSvg: SVGElement) {
  visible.value = true
  zoom = 1
  panX = 0
  panY = 0
  dragging = false
  dragMoved = false
  // 记录触发焦点, 关闭时还原; 打开后焦点移入弹窗
  lastFocused = document.activeElement as HTMLElement | null
  nextTick(() => {
    const box = stage.value
    if (!box) return
    box.innerHTML = ''
    const clone = srcSvg.cloneNode(true) as SVGElement
    clone.style.transformOrigin = '0 0'
    box.appendChild(clone)
    applyTransform()
    closeBtn.value?.focus()
  })
}

function close() {
  visible.value = false
  dragging = false
  lastFocused?.focus?.()
  lastFocused = null
}

// 拖动过图片后, 松开时落在背景上的 click 不应关闭(拖动≠点击)
function onBackdropClick() {
  if (dragMoved) {
    dragMoved = false
    return
  }
  close()
}

// 以视口内坐标为中心缩放(锚定缩放: 缩放中心下的内容保持原位)
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

// 工具栏按钮: 以舞台中心为缩放锚点
function zoomByToolbar(factor: number) {
  const el = stage.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  zoomAt(rect.width / 2, rect.height / 2, factor)
}

function onPointerDown(e: PointerEvent) {
  dragging = true
  dragMoved = false
  dragStart = { x: e.clientX, y: e.clientY, px: panX, py: panY }
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging) return
  dragMoved = true
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
  if (e.key === 'Escape' && visible.value) close()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

defineExpose({ open })
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="mermaid-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="脉络图放大查看"
      @wheel.prevent="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="endDrag"
      @pointercancel="endDrag"
      @pointerleave="endDrag"
      @click.self="onBackdropClick"
    >
      <div class="lightbox-toolbar" @pointerdown.stop @click.stop>
        <span class="lightbox-title">脉络图</span>
        <button type="button" title="放大" @click="zoomByToolbar(1.25)">＋</button>
        <button type="button" title="缩小" @click="zoomByToolbar(0.8)">－</button>
        <button type="button" title="重置" @click="resetZoom">重置</button>
        <button ref="closeBtn" type="button" class="lightbox-close" title="关闭 (Esc)" @click="close">✕</button>
      </div>
      <div class="lightbox-hint">滚轮缩放 · 拖拽平移 · Esc 关闭</div>
      <div ref="stage" class="lightbox-stage" />
    </div>
  </Teleport>
</template>

<style scoped>
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
  /* 触屏拖拽平移图表时不滚动页面 */
  touch-action: none;
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
