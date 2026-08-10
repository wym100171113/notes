import puppeteer from 'puppeteer-core'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900 })

// 1. 搜索: 详情展开(此前点详情即崩的 bug)
await p.goto('http://localhost:4175/notes/物理/物理竞赛/力学/01-运动学.html', { waitUntil: 'networkidle0' })
await sleep(1500)
const pageErrors = []
p.on('pageerror', (e) => pageErrors.push(e.message))
await p.evaluate(() => document.querySelector('.DocSearch-Button').click())
await sleep(1500)
await p.evaluate(() => { const c = document.querySelector('.search-input'); c.value = ''; c.focus() })
await p.keyboard.type('楞次定律', { delay: 30 })
await sleep(400)
await p.evaluate(() => [...document.querySelectorAll('.seg-btn')].find(x => x.textContent.includes('全文'))?.click())
await sleep(2500)
await p.evaluate(() => [...document.querySelectorAll('.detail-btn')][0]?.click())
await sleep(800)
const detail = await p.evaluate(() => {
  const ex = document.querySelector('.excerpt')
  return { shown: !!ex, text: ex?.textContent.trim().slice(0, 30) || '', err: undefined }
})
console.log(`详情展开: ${detail.shown ? '✓' : '✗'} ${detail.text ? `(片段: ${detail.text}…)` : ''}`)
await p.keyboard.press('Escape')
await sleep(400)

// 2. AND 降级提示(响应式 orFallbackUsed)
await p.evaluate(() => document.querySelector('.DocSearch-Button').click())
await sleep(1500)
await p.evaluate(() => { const c = document.querySelector('.search-input'); c.value = ''; c.focus() })
await p.keyboard.type('电磁感应 有机化学', { delay: 30 })
await sleep(400)
await p.evaluate(() => [...document.querySelectorAll('.seg-btn')].find(x => x.textContent.includes('全文'))?.click())
await sleep(2500)
const fb = await p.evaluate(() => {
  const row = document.querySelector('.fallback-row')
  return row && getComputedStyle(row).display !== 'none'
})
console.log(`AND降级提示显示: ${fb ? '✓' : '✗'}`)
await p.keyboard.press('Escape')
await sleep(400)

// 3. 无 JS 错误
console.log(`JS 错误: ${pageErrors.length ? '✗ ' + pageErrors.join(' | ') : '✓ 无'}`)
await b.close()
