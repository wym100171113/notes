import puppeteer from 'puppeteer-core'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900 })
p.on('console', (m) => { const t = m.text(); if (t.includes('search') || t.includes('worker') || t.includes('error')) console.log('[console]', t.slice(0, 150)) })
p.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 200)))
p.on('request', (req) => { if (req.url().includes('worker')) console.log('[request]', req.url().split('/').pop()) })
await p.goto('http://localhost:4175/notes/物理/物理竞赛/力学/01-运动学.html', { waitUntil: 'networkidle0', timeout: 60000 })
await sleep(1500)
await p.evaluate(() => document.querySelector('.DocSearch-Button').click())
await sleep(3000)
const st = await p.evaluate(() => ({
  fail: document.querySelector('.state-row.error')?.textContent || '',
  loading: !!document.querySelector('.spinner'),
  results: document.querySelectorAll('.result').length,
  workerCount: performance.getEntriesByType('resource').filter(r => r.name.includes('worker')).length,
}))
console.log('状态:', JSON.stringify(st))
await b.close()
