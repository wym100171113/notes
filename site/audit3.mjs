import puppeteer from 'puppeteer-core'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900 })
await p.goto('http://localhost:4175/notes/物理/物理竞赛/力学/01-运动学.html', { waitUntil: 'networkidle0' })
await sleep(1500)
// 正文列 vs 大纲间距(正确的选择器)
let r = await p.evaluate(() => {
  const main = document.querySelector('.VPDoc:not(.has-aside) .content, .vp-doc')?.getBoundingClientRect()
  const aside = document.querySelector('.VPDocAside')?.getBoundingClientRect()
  const grid = document.querySelector('.VPContent.has-sidebar .container')?.getBoundingClientRect()
  return {
    main: main && `[${Math.round(main.left)}→${Math.round(main.right)}]`,
    aside: aside && `[${Math.round(aside.left)}→${Math.round(aside.right)}]`,
    gap: main && aside ? Math.round(aside.left - main.right) : null,
    grid: grid && `[${Math.round(grid.left)}→${Math.round(grid.right)}]`,
  }
})
console.log(`正文列 ${r.main} | 大纲列 ${r.aside} | 间距 ${r.gap}px | grid ${r.grid} ${r.gap !== null && r.gap > 0 ? '✓' : '✗'}`)
// 页脚
r = await p.evaluate(() => {
  const f = document.querySelector('.VPLocalFooter .container')?.getBoundingClientRect()
  return f && `L${Math.round(f.left)} R${Math.round(f.right)} w${Math.round(f.width)}`
})
console.log(`页脚: ${r}`)
// 代码块横滚能力
r = await p.evaluate(() => {
  const pre = document.querySelector('.vp-doc div[class*="language-"]')
  if (!pre) return '无代码块'
  const pr = pre.getBoundingClientRect(), sc = pre.scrollWidth, cw = pre.clientWidth
  return `scrollWidth=${sc} clientWidth=${cw} ${sc > cw ? '可横滚✓' : '无溢出'}`
})
console.log(`代码块: ${r}`)
// 暗色公式对比
await p.evaluate(() => document.documentElement.classList.toggle('dark', true))
await sleep(400)
r = await p.evaluate(() => {
  const k = document.querySelector('.katex-display .katex')?.getBoundingClientRect()
  const doc = document.querySelector('.vp-doc')?.getBoundingClientRect()
  return k && doc && k.width > doc.width
})
console.log(`暗色长公式溢出正文: ${r ? '✗' : '✓(无溢出或相等)'}`)
// lightbox @375
await p.setViewport({ width: 375, height: 812 })
await p.goto('http://localhost:4175/notes/物理/物理竞赛/力学/00-竞赛力学总览.html', { waitUntil: 'networkidle0' })
await sleep(1800)
const btn = await p.$('.mermaid-zoom-btn')
if (btn) {
  await btn.click()
  await sleep(600)
  r = await p.evaluate(() => {
    const lb = document.querySelector('.mermaid-lightbox')?.getBoundingClientRect()
    const st = document.querySelector('.lightbox-stage')?.getBoundingClientRect()
    return lb && st && `lightbox${Math.round(lb.width)}x${Math.round(lb.height)} stage${Math.round(st.width)}x${Math.round(st.height)}`
  })
  console.log(`lightbox@375: ${r}`)
  await p.keyboard.press('Escape')
}
// mermaid 图窄屏宽度
await p.goto('http://localhost:4175/notes/物理/物理竞赛/力学/00-竞赛力学总览.html', { waitUntil: 'networkidle0' })
await sleep(2500)
r = await p.evaluate(() => {
  const m = document.querySelector('.vp-doc .mermaid svg')?.getBoundingClientRect()
  const doc = document.querySelector('.vp-doc')?.getBoundingClientRect()
  return m && doc && `svg w${Math.round(m.width)} 正文 w${Math.round(doc.width)} ${m.width > doc.width ? '✗ 溢出' : '✓'}`
})
console.log(`mermaid图@375: ${r}`)
await b.close()
