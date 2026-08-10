import puppeteer from 'puppeteer-core'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()

const PAGES = [
  ['/', '首页'],
  ['/数学/', '数学总览'],
  ['/物理/物理竞赛/力学/01-运动学', '公式页'],
  ['/物理/物理竞赛/力学/00-竞赛力学总览', 'mermaid页'],
  ['/化学/', '化学总览'],
  ['/真题PDF/', '真题PDF'],
]
const WIDTHS = [375, 768, 1024, 1440, 1600, 1920]

async function audit(w, dark) {
  await p.setViewport({ width: w, height: 900 })
  await p.evaluate((d) => {
    const b = document.documentElement
    const m = (b.className.match(/dark/) !== null)
    if (m !== d) b.classList.toggle('dark', d)
  }, dark)
  await sleep(300)
  return await p.evaluate(() => {
    const out = {}
    // 1. 横向溢出
    const doc = document.documentElement
    if (doc.scrollWidth > window.innerWidth + 1) {
      const offenders = []
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect()
        if (r.right > window.innerWidth + 2 && r.width > 20) {
          offenders.push(`${el.tagName}.${(el.className||'').toString().split(' ')[0]}@${Math.round(r.right)}`)
        }
        if (offenders.length > 4) break
      }
      out.hOverflow = `${doc.scrollWidth}px > ${window.innerWidth}px: ${offenders.join(' | ')}`
    }
    // 2. 标题横线 vs 侧栏右缘
    const title = document.querySelector('.VPNavBarTitle .title')
    const sb = document.querySelector('.VPSidebar')
    if (title && sb) {
      const t = title.getBoundingClientRect(), s = sb.getBoundingClientRect()
      out.titleLine = `[${Math.round(t.left)}→${Math.round(t.right)}]`
      out.sidebar = `[${Math.round(s.left)}→${Math.round(s.right)}]`
      out.titleOk = Math.abs(t.right - s.right) < 2
      out.sidebarVisible = s.width > 0
    }
    // 3. 内容区
    const content = document.querySelector('.VPContent.has-sidebar .container')
    if (content) {
      const c = content.getBoundingClientRect()
      out.content = `L${Math.round(c.left)} R${Math.round(c.right)} w${Math.round(c.width)}`
      out.contentOverlapSidebar = c.left < (sb ? sb.getBoundingClientRect().right - 2 : -999)
      out.rightGap = Math.round(window.innerWidth - c.right)
    }
    // 4. 大纲 outline
    const ol = document.querySelector('.VPDocAsideOutline')
    if (ol) {
      const r = ol.getBoundingClientRect()
      out.outline = `L${Math.round(r.left)} R${Math.round(r.right)} w${Math.round(r.width)}`
      out.outlineGap = Math.round(window.innerWidth - r.right)
    }
    // 5. 公式/代码/表格/图片/mermaid 溢出容器
    const vpDoc = document.querySelector('.vp-doc')
    if (vpDoc) {
      const vd = vpDoc.getBoundingClientRect()
      const bad = []
      for (const sel of ['img', 'table', 'pre', '.katex-display', '.mermaid', '.md-card']) {
        for (const el of vpDoc.querySelectorAll(sel)) {
          const r = el.getBoundingClientRect()
          if (r.right > vd.right + 1 && r.width > 30) bad.push(`${sel}:${Math.round(r.right - vd.right)}px超`)
        }
        if (bad.length > 3) break
      }
      if (bad.length) out.mediaOverflow = bad.slice(0, 3).join(' | ')
    }
    // 6. 页脚
    const fw = document.querySelector('.VPLocalFooter .container, footer .container')
    if (fw) {
      const r = fw.getBoundingClientRect()
      out.footer = `L${Math.round(r.left)} R${Math.round(r.right)}`
    }
    return out
  })
}

for (const dark of [false, true]) {
  for (const [path, name] of PAGES) {
    await p.goto('http://localhost:4175/notes' + path, { waitUntil: 'networkidle0' })
    await sleep(1200)
    for (const w of WIDTHS) {
      const r = await audit(w, dark)
      const issues = []
      if (r.hOverflow) issues.push(`横向溢出:${r.hOverflow}`)
      if (r.titleOk === false && r.sidebarVisible) issues.push(`标题线右缘${r.titleLine} ≠ 侧栏右缘${r.sidebar}`)
      if (r.contentOverlapSidebar) issues.push(`内容重叠侧栏:${r.content}`)
      if (r.rightGap !== undefined && (r.rightGap < 12 || r.rightGap > 400) && r.rightGap < 1000) issues.push(`内容右侧间距异常:${r.rightGap}px`)
      if (r.outlineGap !== undefined && r.outlineGap < 0) issues.push(`大纲越界:${r.outline}`)
      if (r.mediaOverflow) issues.push(r.mediaOverflow)
      if (issues.length) console.log(`${dark?'暗':'亮'} ${name} @${w}px: ` + issues.join('  ||  '))
    }
  }
}
console.log('=== 布局审计完成 ===')
await b.close()
