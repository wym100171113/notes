import puppeteer from 'puppeteer-core'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900 })
await p.goto('http://localhost:4175/notes/物理/物理竞赛/力学/01-运动学.html', { waitUntil: 'networkidle0', timeout: 60000 })
await sleep(2000)
const r = await p.evaluate(() => {
  const aside = document.querySelector('.VPDocAside')
  const outline = document.querySelector('.VPDocAsideOutline')
  const list = document.querySelector('.VPDocAsideOutline .outline-list')
  // 含 $ 的大纲标题
  const dollar = [...document.querySelectorAll('.VPDocAsideOutline .outline-link')].filter(a => a.textContent.includes('$')).map(a => a.textContent.trim().slice(0, 30))
  return {
    outlineHTML: outline?.outerHTML.slice(0, 500),
    listScrollable: list ? { scrollH: list.scrollHeight, clientH: list.clientHeight, overflowY: getComputedStyle(list).overflowY } : null,
    asideScrollable: aside ? { scrollH: aside.scrollHeight, clientH: aside.clientHeight, overflowY: getComputedStyle(aside).overflowY } : null,
    dollarTitles: dollar.slice(0, 3),
    outlineItemCount: document.querySelectorAll('.VPDocAsideOutline .outline-item').length,
  }
})
console.log(JSON.stringify(r, null, 1))
await b.close()
