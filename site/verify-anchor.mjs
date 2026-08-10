import puppeteer from 'puppeteer-core'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900 })
await p.goto('http://localhost:4175/notes/物理/物理竞赛/力学/01-运动学.html', { waitUntil: 'networkidle0', timeout: 60000 })
await sleep(3000)
// 点击含公式的大纲项($a=-kv$)
const clicked = await p.evaluate(async () => {
  const link = [...document.querySelectorAll('.VPDocAsideOutline a')].find(a => a.textContent.includes('-kv'))
  if (!link) return '未找到含-kv的大纲项'
  link.click()
  await new Promise(r => setTimeout(r, 1200))
  const h = document.querySelector('h2[id^="专题二"]') || [...document.querySelectorAll('h2,h3')].find(h => h.textContent.includes('-kv'))
  if (!h) return '未找到目标标题'
  const hr = h.getBoundingClientRect()
  return { href: link.getAttribute('href'), title: h.textContent.trim().slice(0, 24), top: Math.round(hr.top), inViewport: hr.top > -50 && hr.top < 200 }
})
console.log(`锚点跳转: ${JSON.stringify(clicked)} ${clicked.inViewport ? '✓' : '✗'}`)
await b.close()
