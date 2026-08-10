<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, inBrowser } from 'vitepress'

// 侧栏"回到当前文件"指示器:
// 当前阅读的文件在侧栏中不可见时, 显示一个小胶囊按钮; 已可见则淡出。
const route = useRoute()
const visible = ref(false)

function currentLink(): HTMLElement | null {
  if (!inBrowser) return null
  const sidebar = document.querySelector('.VPSidebar')
  return (
    sidebar?.querySelector('.VPSidebarItem.is-active > .item > .link') as HTMLElement | null
  ) ?? null
}

function check() {
  if (!inBrowser) return
  nextTick(() => {
    const sidebar = document.querySelector('.VPSidebar')
    const el = currentLink()
    if (!sidebar || !el) {
      visible.value = false
      return
    }
    const sb = sidebar.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    // 当前项超出侧栏可视区(12px 余量)时显示指示器; 完全可见则淡出
    visible.value = r.top < sb.top + 12 || r.bottom > sb.bottom - 12
  })
}

function scrollToActive() {
  const el = currentLink()
  const sidebar = document.querySelector('.VPSidebar')
  const nav = sidebar?.querySelector('.nav') as HTMLElement | null
  if (!el || !nav) return
  // 只滚动侧栏容器, 不滚动页面
  const itemRect = el.getBoundingClientRect()
  const navRect = nav.getBoundingClientRect()
  nav.scrollTop += itemRect.top - navRect.top - nav.clientHeight / 2
  visible.value = false
}

// 侧栏元素随路由切换会卸载/重建, 用捕获阶段的窗口级监听避免监听泄漏与丢失
function onWindowScroll(e: Event) {
  const target = e.target as HTMLElement
  if (!target.classList?.contains('VPSidebar')) return
  check()
}

watch(() => route.path, () => {
  if (inBrowser) check()
})
onMounted(() => {
  if (!inBrowser) return
  check()
  window.addEventListener('resize', check)
  window.addEventListener('scroll', onWindowScroll, { capture: true, passive: true })
})
onBeforeUnmount(() => {
  if (!inBrowser) return
  window.removeEventListener('resize', check)
  window.removeEventListener('scroll', onWindowScroll, { capture: true })
})
</script>

<template>
  <Transition name="locator-fade">
    <button v-if="visible" class="sidebar-locator" title="回到当前阅读的文件" @click="scrollToActive">
      <span class="locator-dot" />
      回到当前
    </button>
  </Transition>
</template>

<style scoped>
.sidebar-locator {
  position: sticky;
  bottom: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 4px 12px 8px;
  padding: 5px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 0.75rem;
  line-height: 1.4;
  cursor: pointer;
  box-shadow: var(--vp-shadow-2);
  z-index: 5;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.sidebar-locator:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.locator-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  animation: locator-pulse 1.6s ease-in-out infinite;
}

@keyframes locator-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(0.8);
  }
}

.locator-fade-enter-active,
.locator-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.locator-fade-enter-from,
.locator-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
