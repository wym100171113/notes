// 综合浏览器测试: 验证导航/搜索/侧栏/mermaid 全部修复
import puppeteer from 'puppeteer-core'

const BASE = 'http://localhost:4175/notes'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const results = []
function record(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`)
}

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })

const consoleErrors = []
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message))
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push('console: ' + m.text().slice(0, 200))
})

// ---------- 1. 导航: 404 页点击"物理" ----------
await page.goto(BASE + '/404.html', { waitUntil: 'networkidle0' })
await sleep(500)
await page.evaluate(() => {
  const link = [...document.querySelectorAll('.VPNavBarMenuLink')].find((a) => a.textContent.includes('物理'))
  link?.click()
})
await sleep(1200)
const navUrl = decodeURIComponent(page.url())
const navContent = await page.evaluate(() => document.querySelector('.vp-doc h1')?.textContent?.trim() || '')
record('导航: 404→点击物理', navUrl.includes('/物理/') && navContent.length > 0, `${navUrl} h1=${navContent.slice(0, 20)}`)

// ---------- 2. 数学页导航(含 $ 标题的 outline) ----------
await page.goto(BASE + '/数学/数学竞赛/组合数学/拉姆齐理论与极图理论.html', { waitUntil: 'networkidle0' })
await sleep(800)
const outlineKatex = await page.evaluate(() => document.querySelectorAll('.VPDocAsideOutline .katex').length)
record('数学页 outline 不被 KaTeX 污染', outlineKatex === 0, `outline内katex节点=${outlineKatex}`)
// 再从数学页点导航"物理"
await page.evaluate(() => {
  const link = [...document.querySelectorAll('.VPNavBarMenuLink')].find((a) => a.textContent.includes('物理'))
  link?.click()
})
await sleep(1200)
const nav2 = decodeURIComponent(page.url())
record('导航: 数学页→点击物理', nav2.includes('/物理/'), nav2)

// ---------- 3. 搜索: 打开/标题档/全文/展开详情/重开无加载 ----------
await page.goto(BASE + '/物理/物理竞赛/力学/01-运动学.html', { waitUntil: 'networkidle0' })
await sleep(800)
await page.keyboard.down('Meta'); await page.keyboard.press('k'); await page.keyboard.up('Meta')
await sleep(600)
const boxVisible = await page.evaluate(() => !!document.querySelector('.search-modal'))
record('搜索框弹出', boxVisible)

await page.type('.search-input', '洛伦兹力')
await sleep(500)
const quickCount = await page.evaluate(() => document.querySelectorAll('.result').length)
record('标题档即时出结果', quickCount > 0, `结果数=${quickCount}`)

// 切全文
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.seg-btn')].find((b) => b.textContent.includes('全文'))
  btn?.click()
})
await sleep(2500) // 等待索引加载+搜索
const fullCount = await page.evaluate(() => document.querySelectorAll('.result').length)
const loadingVisible = await page.evaluate(() => !!document.querySelector('.index-loading'))
record('全文档搜索', fullCount > 0 && !loadingVisible, `结果数=${fullCount} 加载中=${loadingVisible}`)

// 展开详情
await page.evaluate(() => {
  const btn = document.querySelector('.detail-btn')
  btn?.click()
})
await sleep(2000)
const excerptCount = await page.evaluate(() => document.querySelectorAll('.result .excerpt').length)
record('展开详情显示摘录', excerptCount > 0, `摘录数=${excerptCount}`)

// 关闭重开: 是否还有加载
await page.keyboard.press('Escape')
await sleep(400)
await page.keyboard.down('Meta'); await page.keyboard.press('k'); await page.keyboard.up('Meta')
await sleep(500)
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.seg-btn')].find((b) => b.textContent.includes('全文'))
  btn?.click()
})
await sleep(300)
const loading2 = await page.evaluate(() => !!document.querySelector('.state-row'))
await page.type('.search-input', '洛伦兹力')
await sleep(600)
const res2 = await page.evaluate(() => document.querySelectorAll('.result').length)
record('重开全文无加载(索引缓存)', !loading2 && res2 > 0, `加载中=${loading2} 结果=${res2}`)
await page.keyboard.press('Escape')
await sleep(300)

// ---------- 4. 侧栏"回到当前" ----------
await page.goto(BASE + '/物理/物理竞赛/力学/01-运动学.html', { waitUntil: 'networkidle0' })
await sleep(800)
// 滚动侧栏使当前项离开视口
await page.evaluate(() => {
  const nav = document.querySelector('.VPSidebar .nav')
  if (nav) nav.scrollTop = 99999
})
await sleep(600)
const locatorShown = await page.evaluate(() => !!document.querySelector('.sidebar-locator'))
record('侧栏当前项滚出后显示"回到当前"', locatorShown)
// 点击后应回到当前项
if (locatorShown) {
  await page.evaluate(() => document.querySelector('.sidebar-locator')?.click())
  await sleep(800)
  const locatorGone = await page.evaluate(() => !document.querySelector('.sidebar-locator'))
  record('点击"回到当前"后按钮隐藏', locatorGone)
}

// ---------- 5. Mermaid 脉络图 + 放大 ----------
await page.goto(BASE + '/物理/物理竞赛/力学/00-竞赛力学总览.html', { waitUntil: 'networkidle0' })
await sleep(1500)
const mermaidCount = await page.evaluate(() => document.querySelectorAll('.mermaid').length)
record('脉络图渲染', mermaidCount > 0, `图数=${mermaidCount}`)
const zoomBtn = await page.evaluate(() => {
  const b = document.querySelector('.mermaid-zoom-btn')
  if (b) { b.style.opacity = '1'; return true }
  return false
})
record('放大按钮存在', zoomBtn)
await page.evaluate(() => document.querySelector('.mermaid-zoom-btn')?.click())
await sleep(600)
const lightboxShown = await page.evaluate(() => !!document.querySelector('.mermaid-lightbox'))
record('点击放大弹出 lightbox', lightboxShown)
// 滚轮缩放
await page.mouse.move(720, 450)
await page.mouse.wheel({ deltaY: -200 })
await sleep(300)
const zoomed = await page.evaluate(() => {
  const svg = document.querySelector('.lightbox-stage svg')
  return svg?.style.transform?.includes('scale') || false
})
record('lightbox 滚轮缩放生效', zoomed, `transform=${await page.evaluate(() => document.querySelector('.lightbox-stage svg')?.style.transform)}`)
await page.keyboard.press('Escape')
await sleep(300)
const lightboxClosed = await page.evaluate(() => !document.querySelector('.mermaid-lightbox'))
record('Esc 关闭 lightbox', lightboxClosed)

// ---------- 6. 深色模式切换后 mermaid 仍在 ----------
await page.evaluate(() => {
  const btn = document.querySelector('.dark switch, [class*="dark"]')
  // 用 VitePress 的按钮
  const appearance = document.querySelector('.VPSwitchAppearance')
  appearance?.click()
})
await sleep(1500)
const mermaidAfterDark = await page.evaluate(() => document.querySelectorAll('.mermaid').length)
record('深色切换后脉络图仍在', mermaidAfterDark > 0, `图数=${mermaidAfterDark}`)

// ---------- 7. 控制台错误 ----------
record('全程无 JS 错误', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | ') || '无')

await browser.close()
const failed = results.filter((r) => !r.ok).length
console.log(`\n=== 结果: ${results.length - failed}/${results.length} 通过 ===`)
process.exit(failed ? 1 : 0)
