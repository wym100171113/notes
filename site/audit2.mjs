import puppeteer from 'puppeteer-core'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
const log = (s) => console.log(s)
await p.setViewport({ width: 375, height: 812 })
await p.goto('http://localhost:4175/notes/物理/物理竞赛/力学/01-运动学.html', { waitUntil: 'networkidle0' })
await sleep(1500)
// 1. 移动端导航栏: 汉堡/标题/搜索按钮是否重叠
let r = await p.evaluate(() => {
  const nav = document.querySelector('.VPNavBar')
  const n = nav?.getBoundingClientRect()
  const burger = document.querySelector('.VPNavBarHamburger')?.getBoundingClientRect()
  const title = document.querySelector('.VPNavBarTitle .title')?.getBoundingClientRect()
  const search = document.querySelector('.VPNavBarSearch')?.getBoundingClientRect()
  const items = []
  if (n && title && burger && search) {
    items.push(`汉堡[${Math.round(burger.left)}-${Math.round(burger.right)}] 标题[${Math.round(title.left)}-${Math.round(title.right)}] 搜索[${Math.round(search.left)}-${Math.round(search.right)}] 导航宽${Math.round(n.width)}`)
  }
  return { s: items.join(' '), titleRight: title?.right, searchLeft: search?.left, burgerRight: burger?.right }
})
log(`移动端导航: ${r.s}`)
log(`  标题与搜索重叠: ${r.titleRight > r.searchLeft ? '✗ 重叠' : '✓ 不重叠'}`)
log(`  标题与汉堡重叠: ${r.burgerRight > (r.titleRight - 16) ? '✗ 重叠' : '✓ 不重叠'}`)
// 2. 移动端表格溢出
r = await p.evaluate(() => {
  const doc = document.querySelector('.vp-doc')
  const t = doc?.querySelector('table')
  if (!t) return null
  const tr = t.getBoundingClientRect()
  const dr = doc.getBoundingClientRect()
  return { tableRight: Math.round(tr.right), docRight: Math.round(dr.right), overflow: tr.right > dr.right + 1 }
})
log(`移动端表格: ${r ? (r.overflow ? `✗ 溢出 ${r.tableRight - r.docRight}px` : '✓ 正常') : '无表格'}`)
// 3. 搜索弹窗
await p.evaluate(() => document.querySelector('.DocSearch-Button').click())
await sleep(1500)
r = await p.evaluate(() => {
  const m = document.querySelector('.search-modal')?.getBoundingClientRect()
  const s = document.querySelector('.search-shell')?.getBoundingClientRect()
  return { modal: m ? `${Math.round(m.width)}x${Math.round(m.height)}` : 'null', shell: s ? `L${Math.round(s.left)} R${Math.round(s.right)}` : 'null', overflow: s ? s.right > innerWidth + 1 : false }
})
log(`搜索弹窗@375: ${r.modal} ${r.shell} ${r.overflow ? '✗ 越界' : '✓'}`)
await p.keyboard.press('Escape')
await sleep(400)
// 4. 首页 hero
await p.goto('http://localhost:4175/notes/', { waitUntil: 'networkidle0' })
await sleep(1200)
r = await p.evaluate(() => {
  const hero = document.querySelector('.VPHero .container')
  const h = hero?.getBoundingClientRect()
  const f = document.querySelector('.VPFeatures')?.getBoundingClientRect()
  return { hero: h ? `w${Math.round(h.width)}` : 'null', feat: f ? `w${Math.round(f.width)}` : 'null', overflow: hero && hero.right > innerWidth + 1 }
})
log(`首页 hero: ${r.hero} ${r.feat} ${r.overflow ? '✗ 越界' : '✓'}`)
// 5. 大纲在 1440
await p.setViewport({ width: 1440, height: 900 })
await p.goto('http://localhost:4175/notes/物理/物理竞赛/力学/01-运动学.html', { waitUntil: 'networkidle0' })
await sleep(1500)
r = await p.evaluate(() => {
  const ol = document.querySelector('.VPDocAsideOutline')
  const main = document.querySelector('.VPContent .container')?.getBoundingClientRect()
  return {
    ol: ol ? (() => { const o = ol.getBoundingClientRect(); return `L${Math.round(o.left)} R${Math.round(o.right)} w${Math.round(o.width)}` })() : '无大纲',
    mainRight: main ? Math.round(main.right) : 'null',
    gap: ol ? Math.round(ol.getBoundingClientRect().left - main.right) : null,
  }
})
log(`1440 大纲: ${r.ol} 正文右缘${r.mainRight} 间距${r.gap}px ${r.gap !== null && r.gap > 0 ? '✓' : '✗'}`)
// 6. 长标题页 / 目录很深的页(数学)
await p.goto('http://localhost:4175/notes/数学/', { waitUntil: 'networkidle0' })
await sleep(1500)
r = await p.evaluate(() => {
  const sidebar = document.querySelector('.VPSidebar')
  const nav = sidebar?.querySelector('.nav')
  const first = nav?.querySelector('.VPSidebarItem')
  const sr = sidebar?.getBoundingClientRect(), nr = nav?.getBoundingClientRect(), fr = first?.getBoundingClientRect()
  return { sidebar: sr && `${Math.round(sr.width)}px`, nav: nr && `${Math.round(nr.width)}px`, first: fr && `${Math.round(fr.left)}-${Math.round(fr.right)}` }
})
log(`数学总览侧栏: ${r.sidebar} 内边距正确: ${r.nav === r.sidebar ? '?' : ''} 首项${r.first}`)
await b.close()
