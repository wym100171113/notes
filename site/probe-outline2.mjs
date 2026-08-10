import puppeteer from 'puppeteer-core'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900 })
await p.goto('http://localhost:4175/notes/物理/物理竞赛/力学/01-运动学.html', { waitUntil: 'networkidle0', timeout: 60000 })
await sleep(2000)
const r = await p.evaluate(() => {
  const content = document.querySelector('.VPDocAsideOutline .content')
  const cs = content && getComputedStyle(content)
  const links = [...document.querySelectorAll('.VPDocAsideOutline .outline-link')]
  return {
    content: content && {
      overflowY: cs.overflowY, maxHeight: cs.maxHeight, position: cs.position,
      scrollH: content.scrollHeight, clientH: content.clientHeight, scrollable: content.scrollHeight > content.clientHeight,
    },
    asideOutline: (() => { const o = document.querySelector('.VPDocAsideOutline'); const r = o?.getBoundingClientRect(); return r && `[${Math.round(r.top)}→${Math.round(r.bottom)}]` })(),
    linkCount: links.length,
    firstLinks: links.slice(0, 4).map(a => a.textContent.trim().slice(0, 20)),
    active: document.querySelector('.outline-link.active')?.textContent.trim().slice(0, 20),
  }
})
console.log(JSON.stringify(r, null, 1))
await b.close()
