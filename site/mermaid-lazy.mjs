import puppeteer from 'puppeteer-core'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
const mermaidReqs = []
p.on('request', (req) => {
  if (req.url().includes('mermaid') && req.url().endsWith('.js')) mermaidReqs.push(req.url().split('/').pop())
})
// 1. 无 mermaid 页
await p.setViewport({ width: 1440, height: 900 })
await p.goto('http://localhost:4175/notes/物理/物理竞赛/力学/01-运动学.html', { waitUntil: 'networkidle0' })
await sleep(2000)
console.log(`公式页(无脉络图): mermaid 请求 ${mermaidReqs.length ? mermaidReqs.join(',') : '无 ✓'}`)
// 2. 有 mermaid 页
await p.goto('http://localhost:4175/notes/物理/物理竞赛/力学/00-竞赛力学总览.html', { waitUntil: 'networkidle0' })
await sleep(4000)
const has = await p.evaluate(() => document.querySelectorAll('.vp-doc .mermaid svg').length)
console.log(`脉络图页: mermaid 请求 ${mermaidReqs.length ? mermaidReqs.join(',') : '无'} | 图渲染 ${has} 张 ${has > 0 ? '✓' : '✗'}`)
await b.close()
