import { defineConfig } from 'vitepress'
import { readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import markdownItMark from 'markdown-it-mark'
import zlib from 'node:zlib'
import type { Plugin } from 'vite'

const here = dirname(fileURLToPath(import.meta.url))
const docsDir = join(here, '../docs')

// ---------- 搜索索引压缩插件 ----------
// VitePress 本地搜索把"每个标题"都建成一个索引文档(12000+ 个), 序列化后可达 10+MB,
// 打开搜索时需先下载整个索引, 导致"预加载很慢"。本插件:
//   1. 把同一页面下的标题级文档合并为页面级文档(12000+ -> ~500)
//   2. 将索引 JSON gzip 压缩后以 base64 内联, 运行时用内联的 fflate 同步解压
// 不改动 MiniSearch 序列化格式(v2), 消费端 loadJSON 无需任何修改。
async function compactSearchIndex(): Promise<Plugin> {
  const { build } = await import('esbuild')
  // 内联 gunzip 实现: 用 esbuild 把 fflate 的 gunzipSync 打包成独立 IIFE
  const stub = 'import { gunzipSync } from "fflate"; globalThis.__wj_gunzip = gunzipSync;'
  const bundled = await build({
    stdin: { contents: stub, resolveDir: here, sourcefile: 'inflate-stub.ts' },
    bundle: true, write: false, format: 'iife', minify: true, target: 'es2019',
  })
  const inflateCode = bundled.outputFiles![0].text
  return {
    name: 'compact-search-index',
    apply: 'build',
    generateBundle(_opts, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk' || !fileName.includes('localSearchIndex')) continue
        const code = chunk.code
        const start = code.indexOf('`')
        const end = code.lastIndexOf('`')
        if (start < 0 || end <= start) continue
        // 还原 rollup 对模板字符串的转义, 得到原始 JSON
        const json = code.slice(start + 1, end).replace(/\\`/g, '`').replace(/\\\$\{/g, '${')
        let idx
        try { idx = JSON.parse(json) } catch { continue }

        // 1) 按页面合并标题级文档
        const pages = new Map<string, { docs: string[]; firstPath: string; title?: string; titles?: unknown }>()
        for (const [did, path] of Object.entries(idx.documentIds)) {
          const page = String(path).split('#')[0]
          if (!pages.has(page)) {
            pages.set(page, {
              docs: [], firstPath: String(path),
              title: (idx.storedFields[did] as any)?.title,
              titles: (idx.storedFields[did] as any)?.titles,
            })
          }
          pages.get(page)!.docs.push(did)
        }
        const pageOf = new Map<string, number>()
        const newDocumentIds: Record<string, string> = {}
        const newStored: Record<string, { title?: string; titles?: unknown }> = {}
        const newFieldLength: Record<string, number[]> = {}
        let nid = 0
        for (const [page, info] of pages) {
          newDocumentIds[nid] = info.firstPath
          newStored[nid] = { title: info.title, titles: info.titles }
          newFieldLength[nid] = [0, 0, 0]
          for (const did of info.docs) {
            const fl = idx.fieldLength[did] || []
            for (let f = 0; f < 3; f++) newFieldLength[nid][f] += (fl[f] || 0)
            pageOf.set(did, nid)
          }
          nid++
        }
        // 2) 重建倒排索引(同页内同名 term 的频率累加)
        const acc = new Map<string, Map<string, Map<number, number>>>()
        for (const entry of idx.index) {
          const term = entry[0]
          for (const [fid, docs] of Object.entries(entry[1] as Record<string, Record<string, number>>)) {
            for (const [did, tf] of Object.entries(docs)) {
              const nd = pageOf.get(did)
              if (nd === undefined) continue
              if (!acc.has(term)) acc.set(term, new Map())
              const fm = acc.get(term)!
              if (!fm.has(fid)) fm.set(fid, new Map())
              const dm = fm.get(fid)!
              dm.set(nd, (dm.get(nd) || 0) + tf)
            }
          }
        }
        const newIndex: [string, Record<string, Record<string, number>>][] = []
        for (const [term, fm] of acc) {
          const fields: Record<string, Record<string, number>> = {}
          for (const [fid, dm] of fm) fields[fid] = Object.fromEntries(dm)
          newIndex.push([term, fields])
        }
        const merged = {
          documentCount: nid,
          nextId: nid,
          documentIds: newDocumentIds,
          fieldIds: idx.fieldIds,
          fieldLength: newFieldLength,
          averageFieldLength: [0, 0, 0].map((_, f) => {
            let s = 0
            for (const fl of Object.values(newFieldLength)) s += fl[f]
            return s / nid
          }),
          storedFields: newStored,
          dirtCount: 0,
          index: newIndex,
          serializationVersion: 2,
        }
        const outJson = JSON.stringify(merged)
        const b64 = zlib.gzipSync(Buffer.from(outJson, 'utf8')).toString('base64')
        const newCode = `const _localSearchIndexroot = (()=>{${inflateCode}const _b64="${b64}";const _bin=Uint8Array.from(atob(_b64),c=>c.charCodeAt(0));return new TextDecoder().decode(__wj_gunzip(_bin));})();`
        const exportLine = code.slice(end + 1)
        chunk.code = newCode + exportLine
        console.log(`[compact] ${fileName}: ${(code.length / 1024 / 1024).toFixed(1)}MB -> ${(chunk.code.length / 1024 / 1024).toFixed(2)}MB (${pages.size} 个页面文档)`)
      }
    },
  }
}

// 中文搜索分词: 优先用 Intl.Segmenter 词典分词(更接近词语, 误匹配少, 索引更小),
// 不可用时退回 bigram; 与 VPLocalSearchBox.vue 的 tokenizeQuery 保持一致。
// 注意: 该函数会被 VitePress 序列化进客户端包, 必须自包含(不能引用模块级常量)。
function tokenizeForSearch(text: string): string[] {
  const hasSegmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl
  const tokens: string[] = []
  if (hasSegmenter) {
    const seg = new Intl.Segmenter('zh', { granularity: 'word' })
    for (const part of seg.segment(text)) {
      const t = part.segment.trim()
      if (!t) continue
      if (/^[\u4e00-\u9fff]+$/u.test(t)) {
        tokens.push(t)
      } else {
        tokens.push(...t.split(/[^\p{L}\p{N}]+/u).filter(Boolean))
      }
    }
    // 词典把整串未知词当成一个词时, 退回 bigram 提高召回
    if (tokens.length === 1 && /^[\u4e00-\u9fff]{4,}$/u.test(tokens[0])) {
      const chars = Array.from(tokens[0])
      const bigrams: string[] = []
      for (let i = 0; i < chars.length - 1; i++) bigrams.push(chars[i] + chars[i + 1])
      return bigrams
    }
    return tokens
  }
  // 兜底: bigram
  const parts = text.split(/([\u4e00-\u9fff]+)/).filter(Boolean)
  for (const part of parts) {
    if (/^[\u4e00-\u9fff]+$/.test(part)) {
      const chars = Array.from(part)
      if (chars.length === 1) tokens.push(chars[0])
      else for (let i = 0; i < chars.length - 1; i++) tokens.push(chars[i] + chars[i + 1])
    } else {
      tokens.push(...part.split(/[^\p{L}\p{N}]+/u).filter(Boolean))
    }
  }
  return tokens
}

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
  description: '基于 Obsidian 整理的高中数学、物理、化学学习笔记',
  base: '/notes/',
  srcDir: 'docs',
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', href: '/notes/favicon.svg', type: 'image/svg+xml' }],
    ['link', { rel: 'icon', href: '/notes/favicon-64.png', type: 'image/png' }],
    ['link', { rel: 'apple-touch-icon', href: '/notes/apple-touch-icon.png' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: '学习笔记' }],
    ['meta', { property: 'og:url', content: 'https://wym100171113.github.io/notes/' }],
    ['meta', { property: 'og:title', content: '学习笔记 · 数学 物理 化学' }],
    ['meta', { property: 'og:description', content: '基于 Obsidian 整理的高中数学、物理、化学学习笔记(含竞赛与微积分)。' }],
    ['meta', { property: 'og:image', content: 'https://wym100171113.github.io/notes/og-image.png' }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: '学习笔记 · 数学 物理 化学' }],
    ['meta', { name: 'twitter:description', content: '基于 Obsidian 整理的高中数学、物理、化学学习笔记。' }],
    ['meta', { name: 'twitter:image', content: 'https://wym100171113.github.io/notes/og-image.png' }],
    // 注册 Service Worker: 缓存搜索索引等哈希静态资源(先缓存后更新)
    ['script', {}, `if ('serviceWorker' in navigator) { window.addEventListener('load', function () { navigator.serviceWorker.register('/notes/sw.js').catch(function () {}) }) }`],
  ],
  ignoreDeadLinks: [
    // Obsidian 里指向本页外部/不存在的链接, 构建时忽略
    /^\/数学\/.*index/,
    /^\/物理\/.*index/,
    /^\/化学\/.*index/,
  ],
  vite: {
    plugins: [
      await compactSearchIndex(),
      // 用两档搜索组件替换默认 VPLocalSearchBox(直接拦 VPNavBarSearch 的相对导入)
      {
        name: 'override-local-search-box',
        enforce: 'pre',
        resolveId(source, importer) {
          if (
            source === './VPLocalSearchBox.vue' &&
            importer?.includes('theme-default/components/VPNavBarSearch.vue')
          ) {
            return join(here, 'components/VPLocalSearchBox.vue')
          }
        },
      },
    ],
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
        miniSearch: {
          searchOptions: {
            combineWith: 'AND',
          },
          options: {
            tokenize: tokenizeForSearch,
          },
        },
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
