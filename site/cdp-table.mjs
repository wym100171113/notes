import puppeteer from 'puppeteer-core'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
const cdp = await p.target().createCDPSession()
await cdp.send('DOM.enable'); await cdp.send('CSS.enable')
await p.setViewport({ width: 375, height: 812 })
await p.goto('http://localhost:4175/notes/物理/物理竞赛/力学/01-运动学.html', { waitUntil: 'networkidle0' })
await sleep(1800)
const { root } = await cdp.send('DOM.getDocument')
const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '.vp-doc table' })
const res = await cdp.send('CSS.getMatchedStylesForNode', { nodeId })
const out = []
if (res.matchedCSSRules?.inline) out.push('INLINE: ' + res.matchedCSSRules.inline.map(r => r.style.cssText).join(' '))
for (const m of res.matchedCSSRules?.matched || []) {
  for (const r of m.rules) {
    const sel = r.selectorList ? r.selectorList.text : r.selectorText
    out.push(`${sel} => display:${r.style.display || '?'} | ${r.style.cssText.slice(0, 70)}`)
  }
}
for (const a of res.matchedCSSRules?.attributes || []) out.push('ATTR: ' + a.style.cssText)
console.log(out.slice(0, 16).join('\n') || '无匹配规则')
await b.close()
