import puppeteer from 'puppeteer-core'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900 })
await p.goto('http://localhost:4175/notes/物理/物理竞赛/力学/01-运动学.html', { waitUntil: 'networkidle0' })
await sleep(1500)
let r = await p.evaluate(() => {
  const f = document.querySelector('.VPFooter')
  const c = document.querySelector('.VPFooter .container')
  const style = f && getComputedStyle(f)
  const inner = c?.textContent
  return {
    footerDisplay: style?.display, footerHeight: f?.offsetHeight, footerMargin: style?.marginTop,
    containerText: (inner || '').trim().slice(0, 60),
    footerTop: f?.getBoundingClientRect().top,
    docH: document.documentElement.scrollHeight, winH: innerHeight,
  }
})
console.log(JSON.stringify(r))
// 滚动到底再查
await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
await sleep(500)
r = await p.evaluate(() => {
  const f = document.querySelector('.VPFooter')?.getBoundingClientRect()
  const c = document.querySelector('.VPFooter .container')?.getBoundingClientRect()
  return f && c && `footer[${Math.round(f.left)}-${Math.round(f.right)}]x${Math.round(f.height)} container[${Math.round(c.left)}-${Math.round(c.right)}] text=${(document.querySelector('.VPFooter .container')?.textContent||'').trim().slice(0,40)}`
})
console.log('滚动到底:', r)
await b.close()
