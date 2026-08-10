import puppeteer from 'puppeteer-core'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900 })
// 数学目录深的页面
await p.goto('http://localhost:4175/notes/数学/', { waitUntil: 'networkidle0', timeout: 60000 })
await sleep(2000)
// 把侧栏滚到顶部, 让当前激活项离开视野
let st = await p.evaluate(() => {
  const sb = document.querySelector('.VPSidebar')
  sb.scrollTop = 0
  return sb.scrollTop
})
await sleep(300)
// 指示器应出现(激活项不可见)
const shownBefore = await p.evaluate(() => !!document.querySelector('.sidebar-locator'))
// 点击"回到当前"
await p.evaluate(() => document.querySelector('.sidebar-locator')?.click())
await sleep(600)
const r = await p.evaluate(() => {
  const sb = document.querySelector('.VPSidebar')
  const active = document.querySelector('.VPSidebarItem.is-active > .item > .link')?.getBoundingClientRect()
  const sbr = sb.getBoundingClientRect()
  return {
    scrollTop: Math.round(sb.scrollTop),
    activeVisible: active && active.top >= sbr.top - 4 && active.bottom <= sbr.bottom + 4,
    locatorGone: !document.querySelector('.sidebar-locator'),
  }
})
console.log(`指示器出现: ${shownBefore ? '✓' : '✗'}`)
console.log(`点击后: scrollTop=${r.scrollTop} 激活项回到视野=${r.activeVisible ? '✓' : '✗'} 指示器消失=${r.locatorGone ? '✓' : '✗'}`)
await b.close()
