import puppeteer from 'puppeteer-core'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
await p.setViewport({ width: 375, height: 812 })
await p.goto('http://localhost:4175/notes/物理/物理竞赛/力学/01-运动学.html', { waitUntil: 'networkidle0' })
await sleep(1800)
const r = await p.evaluate(async () => {
  const res = await fetch('/notes/assets/style.CsfYWn3l.css')
  const text = await res.text()
  return {
    styleSheetsCount: document.styleSheets.length,
    sheets: [...document.styleSheets].map(s => (s.href || 'inline').split('/').pop()),
    cssContainsTableRule: text.includes('.vp-doc table'),
    cssContainsDisplayBlock: text.includes('display: block'),
    tableRuleIdx: text.indexOf('.vp-doc table'),
  }
})
console.log(JSON.stringify(r, null, 1))
await b.close()
