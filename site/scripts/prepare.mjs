// prepare.mjs — 将 Obsidian 笔记(数学/物理/化学)转换为 VitePress 源文件
// 运行: node scripts/prepare.mjs  (在 site/ 下)
import {
  rmSync, mkdirSync, copyFileSync, readdirSync, readFileSync, writeFileSync, existsSync, statSync,
} from 'node:fs';
import { join, dirname, basename, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const siteDir = resolve(here, '..');
const repoRoot = resolve(siteDir, '..');
const docsDir = join(siteDir, 'docs');

// 源目录 -> 站点目录名
const SUBJECTS = [
  { src: '数学笔记', dst: '数学' },
  { src: '物理', dst: '物理' },
  { src: '化学笔记', dst: '化学' },
];
const ASSETS_DIR = '图片引用';

// 真题 PDF: vault 内源目录 -> 站点 public 子目录(public 内容按原路径静态服务, 浏览器原生渲染 PDF)
const PDF_SOURCE_DIR = '物理/物理竞赛/真题/PDF';
const PDF_PUBLIC_DIR = '真题PDF'; // 位于 docs/public 下, 站点路径为 /真题PDF/... 与生成页 docs/真题PDF 区分
const PDF_PAGE_DIR = '真题PDF';   // 生成的索引页目录(与 public 内同名目录并存: 页面 /真题PDF/ 与资源 /真题PDF/xx.pdf)

const IMG_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.avif', '.ico']);

// ---------- 工具 ----------
function walk(dir, cb) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === '.DS_Store') continue;
    const full = join(dir, ent.name);
    if (ent.isDirectory()) walk(full, cb);
    else cb(full);
  }
}
function copyDir(src, dst) {
  mkdirSync(dst, { recursive: true });
  for (const ent of readdirSync(src, { withFileTypes: true })) {
    if (ent.name === '.DS_Store') continue;
    const s = join(src, ent.name);
    const d = join(dst, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else copyFileSync(s, d);
  }
}
const toSlashes = (p) => p.split('\\').join('/');

// ---------- 1. 清空并准备 docs ----------
rmSync(docsDir, { recursive: true, force: true });
mkdirSync(docsDir, { recursive: true });

// 复制图片资源
const assetsSrc = join(repoRoot, ASSETS_DIR);
if (existsSync(assetsSrc)) copyDir(assetsSrc, join(docsDir, ASSETS_DIR));

// 站点静态资源(favicon / OG 图片 / sw.js) -> docs/public
// (VitePress 固定把 srcDir/public 复制到构建输出)
const sitePublic = join(siteDir, 'public');
if (existsSync(sitePublic)) copyDir(sitePublic, join(docsDir, 'public'));

// 注入 SW 版本号(构建时间戳, 内容变化时强制更新缓存)
const swFile = join(docsDir, 'public', 'sw.js');
if (existsSync(swFile)) {
  const swVersion = Math.floor(Date.now() / 1000).toString(36);
  writeFileSync(swFile, readFileSync(swFile, 'utf8').replace('__SW_VERSION__', swVersion));
  console.log(`[prepare] Service Worker 版本: ${swVersion}`);
}

// 真题 PDF -> docs/public/真题PDF (浏览器原生渲染, 供 /真题PDF/ 索引页链接)
const pdfSrc = join(repoRoot, PDF_SOURCE_DIR);
if (existsSync(pdfSrc)) {
  copyDir(pdfSrc, join(docsDir, 'public', PDF_PUBLIC_DIR));
}

// 文件名净化: 去掉会破坏 URL/JSON 的字符(如双引号)
const sanitizeName = (name) => name.replace(/["']/g, '');

// 收集并复制 md 文件
const mdFiles = []; // { absSrc, relDst, origName }
for (const { src, dst } of SUBJECTS) {
  const srcAbs = join(repoRoot, src);
  if (!existsSync(srcAbs)) continue;
  walk(srcAbs, (abs) => {
    if (extname(abs).toLowerCase() !== '.md') return;
    const relSrc = toSlashes(relative(srcAbs, abs));
    // 逐段净化路径
    const cleanRel = relSrc.split('/').map(sanitizeName).join('/');
    const relDst = join(dst, cleanRel);
    mdFiles.push({ absSrc: abs, relDst: toSlashes(relDst), origName: basename(abs, '.md') });
  });
}
for (const f of mdFiles) {
  const destAbs = join(docsDir, f.relDst);
  mkdirSync(dirname(destAbs), { recursive: true });
  copyFileSync(f.absSrc, destAbs);
}

// ---------- 2. 建立索引 ----------
const allFiles = [];
walk(docsDir, (abs) => {
  const rel = toSlashes(relative(docsDir, abs));
  allFiles.push({ abs, rel });
});
const byBase = new Map();      // 文件名(去扩展名) -> 相对路径
const byFileName = new Map();  // 完整文件名 -> 相对路径
for (const f of allFiles) {
  const base = basename(f.rel, extname(f.rel));
  if (!byBase.has(base)) byBase.set(base, f.rel);
  const fn = basename(f.rel);
  if (!byFileName.has(fn)) byFileName.set(fn, f.rel);
}
// 原文件名(净化前, 可能含引号)也映射到净化后的路径, 保证 wikilink 仍能解析
for (const f of mdFiles) {
  if (!byBase.has(f.origName)) byBase.set(f.origName, f.relDst);
}

// ---------- 3. 链接/嵌入解析 ----------
function resolveTarget(target) {
  let frag = '';
  const h = target.indexOf('#');
  if (h >= 0) { frag = target.slice(h); target = target.slice(0, h); }
  target = target.replace(/\.md$/i, '').trim();
  if (!target) return null;

  // 直接按 docs 相对路径
  const direct = join(docsDir, target + '.md');
  if (existsSync(direct)) return { rel: toSlashes(relative(docsDir, direct)), frag };

  // 旧仓库路径 → docs 路径(顶层目录改名)
  let translated = target;
  for (const { src, dst } of SUBJECTS) {
    if (translated === src) { translated = dst; break; }
    if (translated.startsWith(src + '/')) { translated = dst + translated.slice(src.length); break; }
  }
  const translatedAbs = join(docsDir, translated + '.md');
  if (existsSync(translatedAbs)) return { rel: toSlashes(relative(docsDir, translatedAbs)), frag };

  // 文件名索引
  const hit = byBase.get(target);
  if (hit) return { rel: hit, frag };

  return null;
}
function resolveImage(name) {
  const direct = join(docsDir, ASSETS_DIR, name);
  if (existsSync(direct)) return `${ASSETS_DIR}/${name}`;
  const hit = byFileName.get(name);
  if (hit) return hit;
  return null;
}

// ---------- 4. 文本转换 ----------
const CALLOUT_MAP = {
  note: 'info', abstract: 'info', summary: 'info', tldr: 'info',
  info: 'info',
  tip: 'tip', hint: 'tip', important: 'tip',
  success: 'tip', check: 'tip', done: 'tip',
  question: 'tip', help: 'tip', faq: 'tip',
  warning: 'warning', caution: 'warning', attention: 'warning',
  failure: 'danger', fail: 'danger', missing: 'danger',
  danger: 'danger', error: 'danger', bug: 'danger',
  example: 'info', quote: 'info', cite: 'info',
  // 数学/物理常见标注
  definition: 'info', theorem: 'info', lemma: 'info', corollary: 'info', property: 'info',
  proof: 'tip', exercise: 'tip', remark: 'tip', solution: 'tip',
  todo: 'tip',
};

// 把 Obsidian callout(> [!type] 标题 + 嵌套)转换为 VitePress ::: 容器
function convertCallouts(content) {
  const lines = content.split('\n');
  const out = [];
  let i = 0;
  const re = /^>\s*\[!([a-zA-Z]+)([+-])?\]\s*(.*)$/;

  while (i < lines.length) {
    const m = lines[i].match(re);
    if (m) {
      const type = CALLOUT_MAP[m[1].toLowerCase()] || 'info';
      const title = (m[3] || '').trim();
      i++;
      const bodyLines = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        bodyLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      while (bodyLines.length && bodyLines[bodyLines.length - 1].trim() === '') bodyLines.pop();
      // 递归处理嵌套 callout(保留 > 前缀以识别)
      const body = convertCallouts(bodyLines.join('\n')).trim();
      out.push(`::: ${type}${title ? ' ' + title : ''}`);
      if (body) out.push(body);
      out.push(':::');
      continue;
    }
    out.push(lines[i]);
    i++;
  }
  return out.join('\n');
}

// 删除 Obsidian 注释 %% ... %% (跳过 fenced code block)
function stripObsidianComments(content) {
  const parts = content.split(/```/);
  return parts.map((part, i) => (i % 2 === 1 ? part : part.replace(/%%[\s\S]*?%%/g, ''))).join('```');
}

// 修复笔记中不规范的 $$ 定界符, 防止单个超长数学块拖垮构建
function normalizeMath(content) {
  // 1) 连续 4+ 个 $ 归并为一对 $$..$$ 边界
  content = content.replace(/\${4,}/g, '$$$$');
  const lines = content.split('\n');
  const out = [];
  let inBlock = false;
  let sinceOpen = 0;
  const MAX_BLOCK_LINES = 50;

  for (const line of lines) {
    const markers = (line.match(/\$\$/g) || []).length;
    const even = markers % 2 === 0;

    // 2) 超长未闭合块: 强行在此处闭合
    if (inBlock) {
      sinceOpen++;
      if (sinceOpen > MAX_BLOCK_LINES && even) {
        out.push('$$');
        inBlock = false;
        sinceOpen = 0;
      }
    }

    if (!even) {
      // 奇数个 $$: 状态翻转
      inBlock = !inBlock;
      sinceOpen = 0;
    }

    out.push(line);
  }

  // 3) 文件末尾仍未闭合则补一个结束符
  if (inBlock) out.push('$$');
  return out.join('\n');
}

// 转义花括号, 避免 Vue 把 {{ }} 当作插值表达式解析(markdown-it 会去掉 \{ 的反斜杠, 因此需处理所有 { })
// 跳过 YAML frontmatter 与 fenced code block(代码中的 {{ }} 仅做最保守的双括号转义)
function escapeVueBraces(content) {
  let body = content;
  let front = '';
  const fm = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  if (fm) {
    front = fm[0];
    body = content.slice(fm[0].length);
  }

  const parts = body.split(/```/);
  const escaped = parts.map((part, i) => {
    if (i % 2 === 1) {
      // fenced code block 内: 仅转义双花括号, 避免 Vue 插值; 保留单花括号以保证代码可读
      return part.split('{{').join('&#123;&#123;').split('}}').join('&#125;&#125;');
    }
    // 正文: 转义所有花括号
    return part.split('{').join('&#123;').split('}').join('&#125;');
  });
  return front + escaped.join('```');
}

function transform(content, curRel) {
  const curDir = dirname(curRel);
  const toRel = (rel) => {
    const p = toSlashes(relative(curDir, rel));
    return p === '' ? basename(rel) : p;
  };
  const linkLabel = (rel) => basename(rel, extname(rel));

  // 嵌入 ![[...]]
  content = content.replace(/!\[\[([^\]|]+?)(?:\|([^\]]*?))?\]\]/g, (_m, name, alt) => {
    name = name.trim();
    alt = (alt ?? '').trim();
    const ext = extname(name).toLowerCase();
    if (IMG_EXTS.has(ext)) {
      const imgRel = resolveImage(name);
      if (imgRel) return `![${alt || basename(name)}](${encodeURI(toRel(imgRel))})`;
      return alt || basename(name);
    }
    const resolved = resolveTarget(name);
    if (resolved) {
      const label = alt || linkLabel(resolved.rel);
      return `[${label}](${encodeURI(toRel(resolved.rel))}${resolved.frag})`;
    }
    return alt || name;
  });

  // 链接 [[...]]
  content = content.replace(/\[\[([^\]|]+?)(?:\|([^\]]*?))?\]\]/g, (_m, target, alias) => {
    target = target.trim();
    alias = (alias ?? '').trim();
    if (target.startsWith('#')) {
      return `[${alias || target.slice(1)}](${target})`;
    }
    const resolved = resolveTarget(target);
    if (resolved) {
      const label = alias || linkLabel(resolved.rel);
      return `[${label}](${encodeURI(toRel(resolved.rel))}${resolved.frag})`;
    }
    return alias || target;
  });

  content = stripObsidianComments(content);
  content = convertCallouts(content);
  content = normalizeMath(content);
  content = escapeVueBraces(content);
  return content;
}

for (const f of mdFiles) {
  const destAbs = join(docsDir, f.relDst);
  const content = readFileSync(destAbs, 'utf8');
  writeFileSync(destAbs, transform(content, f.relDst));
}

// ---------- 5. 生成主题首页与站点首页 ----------
function firstMdUnder(absDir) {
  if (!existsSync(absDir)) return null;
  let found = null;
  walk(absDir, (abs) => {
    if (found) return;
    if (extname(abs).toLowerCase() === '.md') found = abs;
  });
  return found;
}
function bestLink(relDir) {
  const absDir = join(docsDir, relDir);
  if (!existsSync(absDir)) return null;
  // 1) index.md
  if (existsSync(join(absDir, 'index.md'))) return `/${relDir}/`;
  // 2) 00-*总览.md
  for (const ent of readdirSync(absDir)) {
    if (/^00-.*总览\.md$/.test(ent)) return `/${relDir}/${ent.replace(/\.md$/, '')}`;
  }
  // 3) 第一个 md(递归)
  const f = firstMdUnder(absDir);
  if (f) {
    const rel = toSlashes(relative(docsDir, f)).replace(/\.md$/, '');
    return `/${rel}`;
  }
  return null;
}

for (const { dst } of SUBJECTS) {
  const subDir = join(docsDir, dst);
  if (!existsSync(subDir)) continue;
  const lines = [`# ${dst}`, '', `> 基于 Obsidian 整理的 ${dst} 学习笔记`, '', '## 目录', ''];
  for (const ent of readdirSync(subDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))) {
    if (ent.name.startsWith('.') || ent.name === 'index.md') continue;
    if (ent.isDirectory()) {
      const link = bestLink(`${dst}/${ent.name}`);
      if (link) lines.push(`- [${ent.name}](${link})`);
      else lines.push(`- ${ent.name}`);
    } else if (ent.isFile() && ent.name.endsWith('.md')) {
      lines.push(`- [${ent.name.replace(/\.md$/, '')}](/${dst}/${ent.name.replace(/\.md$/, '')})`);
    }
  }
  lines.push('');
  writeFileSync(join(subDir, 'index.md'), lines.join('\n'));
}

// 站点首页
const home = `---
layout: home

hero:
  name: "学习笔记"
  text: "数学 · 物理 · 化学"
  tagline: 基于 Obsidian 整理的个人学习笔记库，覆盖高中数学/竞赛、高中物理与高中化学
  actions:
    - theme: brand
      text: 数学笔记
      link: /数学/
    - theme: alt
      text: 物理笔记
      link: /物理/
    - theme: alt
      text: 化学笔记
      link: /化学/

features:
  - title: 数学
    details: 高中数学、数学竞赛（代数 / 几何 / 数论 / 组合）、微积分
    link: /数学/
  - title: 物理
    details: 高中物理（力学 / 电学 / 热学 / 光学）、物理竞赛、物理学大类
    link: /物理/
  - title: 化学
    details: 高中化学 22 章、化学反应原理、物质结构与性质、有机化学基础
    link: /化学/
---
`;
writeFileSync(join(docsDir, 'index.md'), home);

// ---------- 6. 真题 PDF 索引页 ----------// 为 docs/public/真题PDF 下的每个 PDF 生成带 iframe 预览的索引页 /真题PDF/
// (public 静态资源与生成的 .md 页面同名目录不冲突: 页面在 /真题PDF/, 资源在 /真题PDF/xxx.pdf)
const pdfPageDir = join(docsDir, PDF_PAGE_DIR);
const pdfPublicDir = join(docsDir, 'public', PDF_PUBLIC_DIR);
if (existsSync(pdfPublicDir)) {
  const groups = []; // { dir, files: [{name, href, sizeKB}] }
  for (const ent of readdirSync(pdfPublicDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))) {
    if (ent.name.startsWith('.') || ent.name === 'index.md') continue;
    const sub = join(pdfPublicDir, ent.name);
    if (ent.isDirectory()) {
      const files = [];
      for (const f of readdirSync(sub).filter((n) => n.toLowerCase().endsWith('.pdf')).sort((a, b) => a.localeCompare(b, 'zh-CN'))) {
        const size = statSync(join(sub, f)).size;
        files.push({ name: f.replace(/\.pdf$/i, ''), href: `/${PDF_PUBLIC_DIR}/${ent.name}/${encodeURI(f)}`, sizeKB: Math.round(size / 1024) });
      }
      if (files.length) groups.push({ dir: ent.name, files });
    }
  }
  if (groups.length) {
    mkdirSync(pdfPageDir, { recursive: true });
    const lines = ['# 物理竞赛真题 PDF', '', '> 全国中学生物理竞赛历年真题（预赛 / 复赛 / 决赛），浏览器原生打开 PDF 即可查看。点击条目在线查看，右键可另存。', ''];
    for (const g of groups) {
      lines.push(`## ${g.dir}`, '');
      for (const f of g.files) {
        lines.push(`- [${f.name}](${f.href})（${f.sizeKB} KB）`);
      }
      lines.push('');
    }
    lines.push('> [!note] 说明');
    lines.push('> 1999-2017 年复赛/决赛的官方 Word 版试题与解答（.doc）无法在网页渲染，保留在本地仓库外的 `全国高中物理联赛/` 文件夹；其中 [34届(2017) 复赛]( /物理/物理竞赛/真题/34届(2017)复赛试题及解答 ) 已誊录为 LaTeX 笔记。');
    writeFileSync(join(pdfPageDir, 'index.md'), lines.join('\n'));
    console.log(`[prepare] 真题 PDF 索引: ${groups.length} 组 ${groups.reduce((s, g) => s + g.files.length, 0)} 个文件`);
  }
}

console.log(`[prepare] 完成: ${mdFiles.length} 个笔记 → ${docsDir}`);

// ---------- 7. 标题索引(快速搜索用) ----------
// 为"快速/标题"档搜索生成轻量索引: {id, title, titles} 每页一条,
// 由 VPLocalSearchBox.vue 通过 virtual:title-index 静态引入(数 KB, 随组件打包, 秒开)。
const generatedDir = join(siteDir, '.vitepress', 'generated');
mkdirSync(generatedDir, { recursive: true });
// 站点 base 路径, 与 config.mts 的 base 保持一致(修改时需同步)
const BASE_URL = '/notes/';
function extractTitle(absPath) {
  let content = readFileSync(absPath, 'utf8');
  const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fm) {
    const m = fm[1].match(/^title:\s*(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  const h1 = content.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].trim();
  return basename(absPath, '.md');
}
const titleIndex = [];
for (const f of mdFiles) {
  const abs = f.absSrc;
  const rel = f.relDst.replace(/\.md$/, '');
  // id 必须带 base 前缀, 否则前端 router.go 拼接出错误路径导致 404
  titleIndex.push({ id: `${BASE_URL}${rel}`, title: extractTitle(abs), titles: [] });
}
// 目录页(各 subject 的 index.md)也加入
for (const { dst } of SUBJECTS) {
  const idxFile = join(docsDir, dst, 'index.md');
  if (existsSync(idxFile)) {
    titleIndex.push({ id: `${BASE_URL}${dst}/`, title: extractTitle(idxFile), titles: [] });
  }
}
writeFileSync(join(generatedDir, 'title-index.json'), JSON.stringify(titleIndex));
console.log(`[prepare] 标题索引: ${titleIndex.length} 条 → ${join(generatedDir, 'title-index.json')}`);
