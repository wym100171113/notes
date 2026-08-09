// prepare.mjs — 将 Obsidian 笔记(数学/物理/化学)转换为 VitePress 源文件
// 运行: node scripts/prepare.mjs  (在 site/ 下)
import {
  rmSync, mkdirSync, copyFileSync, readdirSync, readFileSync, writeFileSync, existsSync,
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

// 收集并复制 md 文件
const mdFiles = []; // { absSrc, relDst }
for (const { src, dst } of SUBJECTS) {
  const srcAbs = join(repoRoot, src);
  if (!existsSync(srcAbs)) continue;
  walk(srcAbs, (abs) => {
    if (extname(abs).toLowerCase() !== '.md') return;
    const relSrc = toSlashes(relative(srcAbs, abs));
    const relDst = join(dst, relSrc);
    mdFiles.push({ absSrc: abs, relDst: toSlashes(relDst) });
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
};

function convertCallouts(content) {
  const lines = content.split('\n');
  const out = [];
  let i = 0;
  const re = /^>\s*\[!([a-z]+)\]\s*(.*)$/i;
  while (i < lines.length) {
    const m = lines[i].match(re);
    if (m) {
      const type = CALLOUT_MAP[m[1].toLowerCase()] || 'info';
      const title = m[2].trim();
      const body = [];
      i++;
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        body.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      while (body.length && body[body.length - 1].trim() === '') body.pop();
      out.push(`::: ${type}${title ? ' ' + title : ''}`);
      for (const b of body) out.push(b);
      out.push(':::');
      continue;
    }
    out.push(lines[i]);
    i++;
  }
  return out.join('\n');
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

console.log(`[prepare] 完成: ${mdFiles.length} 个笔记 → ${docsDir}`);
