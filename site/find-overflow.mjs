import puppeteer from 'puppeteer-core'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
await p.setViewport({ width: 375, height: 812 })
await p.goto('http://localhost:4175/notes/物理/物理竞赛/力学/01-运动学.html', { waitUntil: 'networkidle0' })
await sleep(1800)
const r = await p.evaluate(() => {
  const doc = document.documentElement
  const list = []
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect()
    if (r.right > innerWidth + 1 && r.width > 15 && r.left < innerWidth) {
      const cls = (el.className || '').toString().split(' ')[0]
      list.push(`${el.tagName}.${cls}[${Math.round(r.left)}→${Math.round(r.right)}] w${Math.round(r.width)}`)
      if (list.length > 6) break
    }
  }
  return { scrollW: doc.scrollWidth, innerW: innerWidth, list }
})
console.log(JSON.stringify(r, null, 1))
await b.close()
