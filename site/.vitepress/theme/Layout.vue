<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import renderMathInElement from 'katex/contrib/auto-render'

const route = useRoute()
const page = ref<HTMLElement>()

function renderMath() {
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

onMounted(() => {
  renderMath()
  // 首次渲染可能在路由就绪前, 再补一次
  setTimeout(renderMath, 0)
})

watch(
  () => route.path,
  () => {
    // 等待新页面内容渲染完成后再渲染公式
    requestAnimationFrame(() => requestAnimationFrame(renderMath))
  },
)
</script>

<template>
  <div ref="page" class="katex-root">
    <DefaultTheme.Layout />
  </div>
</template>
