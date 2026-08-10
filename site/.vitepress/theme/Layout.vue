<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import renderMathInElement from 'katex/contrib/auto-render'
import mermaid from 'mermaid'
import SidebarLocator from './components/SidebarLocator.vue'

const route = useRoute()
const { isDark } = useData()
const page = ref<HTMLElement>()

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
  const el = page.value
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
    const id = 'mmd-' + Math.random().toString(36).slice(2, 10)
    try {
      const { svg } = await mermaid.render(id, source)
      const wrap = document.createElement('div')
      wrap.className = 'mermaid'
      wrap.innerHTML = svg
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
})

watch(
  () => route.path,
  () => {
    // 等待新页面内容渲染完成后再渲染公式/图表
    requestAnimationFrame(() => requestAnimationFrame(renderAll))
  },
)

// 切换深色模式时重绘 Mermaid
watch(isDark, () => {
  mermaidInitialized = false
  const pre = page.value
  if (pre) {
    pre.querySelectorAll<HTMLElement>('.mermaid').forEach((el) => el.remove())
    pre.querySelectorAll<HTMLElement>('[data-mermaid-rendered]').forEach((el) => delete el.dataset.mermaidRendered)
  }
  renderMermaid()
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
</template>
