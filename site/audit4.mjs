import puppeteer from 'puppeteer-core'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900 })
await p.goto('http://localhost:4175/notes/物理/物理竞赛/力学/01-运动学.html', { waitUntil: 'networkidle0' })
await sleep(1500)
let r = await p.evaluate(() => {
  const els = [...document.querySelectorAll('footer, [class*="Footer"]')].map(el => el.className)
  const f = document.querySelector('.VPFooter .container')
  return { classes: els.slice(0, 3), footer: f ? (() => { const r = f.getBoundingClientRect(); return `L${Math.round(r.left)} R${Math.round(r.right)}` })() : null }
})
console.log(`页脚元素: ${JSON.stringify(r.classes)} | ${r.footer || '无容器'}`)
// 代码块(找个有代码的页面)
await p.goto('http://localhost:4175/notes/化学/', { waitUntil: 'networkidle0' })
await sleep(1200)
r = await p.evaluate(() => {
  const pre = document.querySelector('.vp-doc div[class*="language-"]')
  if (!pre) return '无代码块'
  return `scrollW=${pre.scrollWidth} clientW=${pre.clientWidth} ${pre.scrollWidth > pre.clientWidth ? '可横滚✓' : '正常'}`
})
console.log(`代码块: ${r}`)
await b.close()
