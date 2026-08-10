import puppeteer from 'puppeteer-core'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900 })
await p.goto('http://localhost:4175/notes/物理/物理竞赛/力学/01-运动学.html', { waitUntil: 'networkidle0', timeout: 60000 })
await sleep(1500)

// 清 IDB + 清 worker 缓存(刷新页面重来)
await p.evaluate(() => new Promise((res) => {
  const req = indexedDB.deleteDatabase('notes-search')
  req.onsuccess = req.onerror = req.onblocked = () => res()
  setTimeout(res, 800)
}))
await sleep(300)
await p.reload({ waitUntil: 'networkidle0', timeout: 60000 })
await sleep(1500)

// 1. 主线程长阻塞测量: 打开弹窗后 4s 内(worker 解析期间)
const gaps = await p.evaluate(() => new Promise((res) => {
  const gaps = []
  let last = performance.now()
  const iv = setInterval(() => {
    const now = performance.now()
    const g = now - last
    if (g > 80) gaps.push(Math.round(g))
    last = now
  }, 50)
  document.querySelector('.DocSearch-Button').click()
  setTimeout(() => { clearInterval(iv); res(gaps) }, 4000)
}))
console.log(`打开弹窗后 4s 内主线程长阻塞(worker 解析期间): ${gaps.length ? gaps.map(g => g + 'ms').join(', ') : '无 ✓'}`)

// 2. 立即输入: 测输入到结果出现
const t0 = Date.now()
await p.evaluate(() => { const c = document.querySelector('.search-input'); c.focus() })
await p.keyboard.type('楞次定律', { delay: 30 })
await sleep(300)
await p.evaluate(() => [...document.querySelectorAll('.seg-btn')].find(x => x.textContent.includes('全文'))?.click())
await sleep(3000)
const r = await p.evaluate(() => ({
  n: document.querySelectorAll('.result').length,
  loading: !!document.querySelector('.state-row'),
  spinnerDone: !document.querySelector('.spinner'),
}))
console.log(`搜"楞次定律": ${r.n} 条, loading spinner=${r.loading} ${r.n > 0 ? '✓' : '✗'}`)

// 3. worker 线程独立验证(主线程无卡顿即达标)
await p.evaluate(() => { const c = document.querySelector('.search-input'); c.value = ''; c.focus() })
await p.keyboard.type('高斯定理', { delay: 30 })
await sleep(2000)
const r2 = await p.evaluate(() => document.querySelectorAll('.result').length)
console.log(`搜"高斯定理": ${r2} 条 ${r2 > 5 ? '✓' : '✗'}`)

// 4. 停用词
await p.evaluate(() => { const c = document.querySelector('.search-input'); c.value = ''; c.focus() })
await p.keyboard.type('你', { delay: 30 })
await sleep(1500)
const r3 = await p.evaluate(() => ({
  broad: document.querySelector('.no-results')?.textContent.includes('宽泛') || false,
}))
console.log(`搜"你": 过宽=${r3.broad} ${r3.broad ? '✓' : '✗'}`)

// 5. AND 降级
await p.evaluate(() => { const c = document.querySelector('.search-input'); c.value = ''; c.focus() })
await p.keyboard.type('电磁感应 有机化学', { delay: 30 })
await sleep(2000)
const r4 = await p.evaluate(() => ({
  n: document.querySelectorAll('.result').length,
  fb: !!document.querySelector('.fallback-row'),
}))
console.log(`AND降级: ${r4.n} 条, 提示=${r4.fb} ${r4.n > 0 && r4.fb ? '✓' : '✗'}`)

// 6. 详情展开
await p.evaluate(() => document.querySelector('.detail-btn')?.click())
await sleep(800)
const r5 = await p.evaluate(() => !!document.querySelector('.excerpt'))
console.log(`详情展开: ${r5 ? '✓' : '✗'}`)
await b.close()
console.log('done')
