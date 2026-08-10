import puppeteer from 'puppeteer-core'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900 })
await p.goto('http://localhost:4175/notes/物理/物理竞赛/力学/01-运动学.html', { waitUntil: 'networkidle0', timeout: 60000 })
await sleep(4000)

// 1. 大纲公式渲染
const katexInOutline = await p.evaluate(() => document.querySelectorAll('.VPDocAsideOutline .katex').length)
const dollarLeft = await p.evaluate(() => [...document.querySelectorAll('.VPDocAsideOutline a')].filter(a => a.textContent.includes('$')).length)
console.log(`大纲公式: katex 渲染 ${katexInOutline} 处, 残留 \$ 标题 ${dollarLeft} 个 ${katexInOutline > 0 && dollarLeft === 0 ? '✓' : '✗'}`)

// 2. 大纲可滚动 + 激活项自动对齐
const r = await p.evaluate(() => {
  const content = document.querySelector('.VPDocAsideOutline .content')
  const cs = getComputedStyle(content)
  return {
    maxHeight: cs.maxHeight,
    overflowY: cs.overflowY,
    scrollable: content.scrollHeight > content.clientHeight,
    contentScrollH: content.scrollHeight,
    clientH: content.clientHeight,
  }
})
console.log(`大纲容器: maxHeight=${r.maxHeight} overflowY=${r.overflowY} 可滚动=${r.scrollable} ${r.scrollable ? '✓' : '✗'}`)

// 3. 滚动页面到中部, 激活项应自动滚入大纲视野
await p.evaluate(() => window.scrollTo(0, 2500))
await sleep(1200)
const align = await p.evaluate(() => {
  const content = document.querySelector('.VPDocAsideOutline .content')
  const active = content.querySelector('.outline-link.active')
  if (!active) return { active: null }
  const ar = active.getBoundingClientRect()
  const cr = content.getBoundingClientRect()
  return {
    active: active.textContent.trim().slice(0, 20),
    inView: ar.top >= cr.top - 2 && ar.bottom <= cr.bottom + 2,
    scrollTop: Math.round(content.scrollTop),
  }
})
console.log(`滚动页面后: 激活项=${align.active || '(无)'} 大纲内可见=${align.inView ? '✓ 自动对齐' : '✗'}`)
await b.close()
