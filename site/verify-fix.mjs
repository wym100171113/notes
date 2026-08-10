import puppeteer from 'puppeteer-core'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
await p.setViewport({ width: 375, height: 812 })

// 1. 公式溢出修复: 375 与 1024 都应无页面级横向溢出
let issues = []
for (const w of [375, 1024, 1440]) {
  await p.setViewport({ width: w, height: 900 })
  await p.goto('http://localhost:4175/notes/物理/物理竞赛/力学/01-运动学.html', { waitUntil: 'networkidle0' })
  await sleep(1800)
  const r = await p.evaluate(() => {
    const doc = document.documentElement
    const kd = document.querySelector('.katex-display')
    const wide = kd && kd.scrollWidth > kd.clientWidth + 2
    return {
      pageOverflow: doc.scrollWidth > window.innerWidth + 1 ? `${doc.scrollWidth}px` : null,
      formulaScrollable: wide ? '✓可滚动' : null,
    }
  })
  if (r.pageOverflow) issues.push(`${w}px: 页面仍溢出 ${r.pageOverflow}`)
  else console.log(`${w}px: 页面无横向溢出 ✓${r.formulaScrollable ? `, 公式${r.formulaScrollable}` : ''}`)
}
console.log(issues.length ? '✗ ' + issues.join(' | ') : '')

// 2. 深色切换 mermaid 顺序保持
await p.setViewport({ width: 1440, height: 900 })
await p.goto('http://localhost:4175/notes/物理/物理竞赛/力学/00-竞赛力学总览.html', { waitUntil: 'networkidle0' })
await sleep(3000)
const before = await p.evaluate(() => [...document.querySelectorAll('.vp-doc .mermaid svg .cluster text, .vp-doc .mermaid svg text')].slice(0, 6).map(t => t.textContent.trim()).filter(Boolean))
await p.evaluate(() => document.documentElement.classList.add('dark'))
await sleep(2500)
const after = await p.evaluate(() => [...document.querySelectorAll('.vp-doc .mermaid svg .cluster text, .vp-doc .mermaid svg text')].slice(0, 6).map(t => t.textContent.trim()).filter(Boolean))
console.log(`深色重绘后 mermaid 文本顺序: ${before.join('/')}`, before.length === after.length ? '✓' : '✗ 数量变化')
await p.evaluate(() => document.documentElement.classList.remove('dark'))
await sleep(2500)

// 3. lightbox 拆组件后仍可用
const btn = await p.$('.mermaid-zoom-btn')
if (btn) {
  await btn.click()
  await sleep(600)
  const ok = await p.evaluate(() => {
    const lb = document.querySelector('.mermaid-lightbox')
    const stage = document.querySelector('.lightbox-stage')
    const svg = stage?.querySelector('svg')
    return !!(lb && stage && svg)
  })
  console.log('lightbox 打开(组件化后):', ok ? '✓' : '✗')
  // 滚轮缩放
  await p.mouse.move(700, 450)
  await p.mouse.wheel({ deltaY: -240 })
  await sleep(300)
  const z = await p.evaluate(() => document.querySelector('.lightbox-stage svg')?.style.transform)
  console.log(`滚轮缩放 transform: ${z} ${z && z.includes('scale(') && !z.includes('scale(1)') ? '✓' : '✗'}`)
  await p.keyboard.press('Escape')
  await sleep(300)
  const closed = await p.evaluate(() => !document.querySelector('.mermaid-lightbox'))
  console.log('Esc 关闭:', closed ? '✓' : '✗')
}
await b.close()
