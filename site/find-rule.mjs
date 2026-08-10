import puppeteer from 'puppeteer-core'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
await p.setViewport({ width: 375, height: 812 })
await p.goto('http://localhost:4175/notes/物理/物理竞赛/力学/01-运动学.html', { waitUntil: 'networkidle0' })
await sleep(1800)
const r = await p.evaluate(() => {
  const rules = []
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.selectorText && rule.selectorText.includes('table')) {
          rules.push(`${sheet.href?.split('/').pop() || 'inline'}: ${rule.selectorText} => ${rule.style.cssText.slice(0, 120)}`)
        }
      }
    } catch {}
  }
  // 溢出表格是第几个?
  const tables = [...document.querySelectorAll('.vp-doc table')].map((t, i) => {
    const r = t.getBoundingClientRect()
    return `${i}: [${Math.round(r.left)}→${Math.round(r.right)}] display=${getComputedStyle(t).display}`
  })
  return { rules: rules.slice(0, 8), tables }
})
console.log(r.rules.join('\n'))
console.log('---')
console.log(r.tables.join('\n'))
await b.close()
