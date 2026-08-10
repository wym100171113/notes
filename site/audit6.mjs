import puppeteer from 'puppeteer-core'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900 })
await p.goto('http://localhost:4175/notes/物理/物理竞赛/力学/01-运动学.html', { waitUntil: 'networkidle0' })
await sleep(1500)
const r = await p.evaluate(() => {
  const rules = []
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.selectorText && rule.selectorText.includes('VPFooter') && rule.selectorText.includes('has-sidebar')) {
          rules.push(`${sheet.href?.split('/').pop() || 'inline'} ${rule.selectorText} => ${rule.style.cssText}`)
        }
      }
    } catch {}
  }
  return rules
})
console.log(r.join('\n') || '无规则')
await b.close()
