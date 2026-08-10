import puppeteer from 'puppeteer-core'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
await p.setViewport({ width: 375, height: 812 })
await p.goto('http://localhost:4175/notes/物理/物理竞赛/力学/01-运动学.html', { waitUntil: 'networkidle0' })
await sleep(1800)
let r = await p.evaluate(() => {
  const t = document.querySelector('.vp-doc table')
  const sheets = [...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.href.split('/').pop())
  // 检查样式表是否真的包含该规则
  const all = []
  for (const s of document.styleSheets) {
    try {
      const rules = s.cssRules ? [...s.cssRules] : []
      const hit = rules.filter(r => r.selectorText && r.selectorText.includes('.vp-doc table'))
      if (hit.length) all.push(`${s.href?.split('/').pop()}: ${hit.map(h => h.cssText.slice(0, 60))}`)
    } catch (e) { all.push(`ERR ${s.href}`) }
  }
  return { display: getComputedStyle(t).display, sheets: sheets.slice(0, 6), ruleHit: all }
})
console.log(JSON.stringify(r, null, 1))
await b.close()
