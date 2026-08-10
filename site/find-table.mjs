import puppeteer from 'puppeteer-core'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
await p.setViewport({ width: 375, height: 812 })
await p.goto('http://localhost:4175/notes/物理/物理竞赛/力学/01-运动学.html', { waitUntil: 'networkidle0' })
await sleep(1800)
const r = await p.evaluate(() => {
  const t = document.querySelector('.vp-doc table')
  if (!t) return '无表格'
  const cs = getComputedStyle(t)
  const ancestors = []
  let el = t
  for (let i = 0; i < 5 && el; i++) {
    const r = el.getBoundingClientRect()
    ancestors.push(`${el.tagName}.${(el.className||'').toString().split(' ')[0]} w${Math.round(r.width)}`)
    el = el.parentElement
  }
  return {
    display: cs.display, overflowX: cs.overflowX, width: cs.width,
    scrollW: t.scrollWidth, clientW: t.clientWidth,
    ancestors,
  }
})
console.log(JSON.stringify(r, null, 1))
await b.close()
