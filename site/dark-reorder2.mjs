import puppeteer from 'puppeteer-core'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900 })
await p.goto('http://localhost:4175/notes/物理/物理竞赛/力学/00-竞赛力学总览.html', { waitUntil: 'networkidle0' })
await sleep(4000)
const info = await p.evaluate(() => {
  const svg = document.querySelector('.vp-doc .mermaid svg')
  if (!svg) return '无 svg'
  return {
    texts: svg.querySelectorAll('text').length,
    foreign: svg.querySelectorAll('foreignObject').length,
    anyText: (svg.textContent || '').trim().slice(0, 120),
  }
})
console.log(JSON.stringify(info))
await b.close()
