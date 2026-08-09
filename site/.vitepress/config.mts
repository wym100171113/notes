import { defineConfig } from 'vitepress'
import { readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import markdownItMark from 'markdown-it-mark'

const here = dirname(fileURLToPath(import.meta.url))
const docsDir = join(here, '../docs')

interface SidebarItem {
  text: string
  link?: string
  items?: SidebarItem[]
}

function buildTree(absDir: string): SidebarItem[] {
  let entries = readdirSync(absDir, { withFileTypes: true })
    .filter((e) => !e.name.startsWith('.') && e.name !== 'index.md')
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))

  // 目录在前, 文件在后
  entries = [...entries.filter((e) => e.isDirectory()), ...entries.filter((e) => !e.isDirectory())]

  const items: SidebarItem[] = []
  for (const e of entries) {
    const full = join(absDir, e.name)
    const rel = full.slice(docsDir.length + 1).replace(/\\/g, '/')
    if (e.isDirectory()) {
      const children = buildTree(full)
      if (children.length === 0) continue
      const item: SidebarItem = { text: e.name, collapsed: false, items: children }
      const idx = join(full, 'index.md')
      if (existsSync(idx)) item.link = `/${rel}/`
      items.push(item)
    } else if (e.isFile() && e.name.endsWith('.md')) {
      items.push({ text: e.name.replace(/\.md$/, ''), link: `/${rel.replace(/\.md$/, '')}` })
    }
  }
  return items
}

function sidebarFor(subject: string): SidebarItem[] {
  return buildTree(join(docsDir, subject))
}

export default defineConfig({
  lang: 'zh-CN',
  title: '学习笔记',
  description: '数学 · 物理 · 化学 学习笔记',
  base: '/notes/',
  srcDir: 'docs',
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: [
    // Obsidian 里指向本页外部/不存在的链接, 构建时忽略
    /^\/数学\/.*index/,
    /^\/物理\/.*index/,
    /^\/化学\/.*index/,
  ],
  vite: {
    build: {
      // 关闭压缩以减少构建期内存峰值(部署体积换构建稳定性)
      minify: false,
      cssMinify: false,
      chunkSizeWarningLimit: 6000,
    },
  },
  markdown: {
    // 关闭原始 HTML 透传, 避免笔记中的不规范标签导致 Vue 模板编译失败
    html: false,
    // 数学在浏览器端用 KaTeX 渲染(见 theme), 避免 SSR 预渲染 444 页公式导致构建内存溢出
    config(md) {
      // Obsidian ==高亮== -> <mark>
      md.use(markdownItMark)
    },
  },
  themeConfig: {
    logo: undefined,
    nav: [
      { text: '首页', link: '/' },
      { text: '数学', link: '/数学/' },
      { text: '物理', link: '/物理/' },
      { text: '化学', link: '/化学/' },
    ],
    sidebar: {
      '/数学/': sidebarFor('数学'),
      '/物理/': sidebarFor('物理'),
      '/化学/': sidebarFor('化学'),
    },
    outline: { level: [2, 4], label: '本页目录' },
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索', buttonAriaLabel: '搜索' },
          modal: { noResultsText: '未找到相关结果', displayDetails: '显示详情' },
        },
      },
    },
    docFooter: { prev: '上一篇', next: '下一篇' },
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
    lastUpdated: { text: '最后更新' },
    footer: {
      message: '基于 Obsidian 整理 · 由 VitePress 构建',
      copyright: '学习笔记',
    },
  },
})
