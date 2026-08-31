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

// ---------- 发布排除规则 ----------
// 以下笔记仅从站点生成中排除, vault 内源文件原样保留(站点只发布一部分笔记)。
// 路径相对仓库根目录, 用 / 分隔; 新增时往数组里加一行即可。
const EXCLUDE_DIRS = [
  // 转载他人内容, 非原创笔记
  '物理/物理学大类/相对论/相对论(知乎潦草搬运)',
  // 未发表的数学建模竞赛论文, 公开后影响后续参赛/投稿
  '数学笔记/杂项/IMMC',
];
const EXCLUDE_FILES = [
  // Obsidian Base 视图嵌入(![[数学笔记index.base]]), .base 不会复制到站点 -> 渲染为空页
  '数学笔记/数学笔记index.md',
  // 碎片: 仅一个公式或一个未解答的问题, 不成篇
  '数学笔记/随笔/随笔3.md',
  '数学笔记/随笔/随笔4.md',
  '数学笔记/高中数学/复数/小知识.md',
];
const EXCLUDE_DIR_PREFIXES = EXCLUDE_DIRS.map((d) => (d.endsWith('/') ? d : d + '/'));
// rel 为相对仓库根目录、以 / 分隔的路径
function isExcluded(rel) {
  return EXCLUDE_FILES.includes(rel) || EXCLUDE_DIR_PREFIXES.some((p) => rel.startsWith(p));
}

// 真题 PDF 不再托管: 竞赛试题版权归中国物理学会, 且流转副本的元数据中
// 含第三方姓名信息, 不适合公开分发。站点 /真题PDF/ 页面改为指向官方发布页。
// 官方"全国竞赛试题和解答"列表页(第 25-38 届, 更早/更新届次见官网通知公告)
const CPHO_PAPERS_URL = 'https://cpho.pku.edu.cn/ckzl/qgjssthjd.htm';
const CPHO_HOME_URL = 'https://cpho.pku.edu.cn/';

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
// docs 是脚本整体重建的目录, 但 rmSync(recursive, force) 是无差别删除:
// 一旦 siteDir 计算错误(如脚本被从别处调用)就会删错地方。删除前先确认目标
// 确实是 site/ 下的 docs 目录, 不符预期直接退出, 不执行任何删除。
const docsReal = resolve(docsDir);
if (basename(docsReal) !== 'docs' || !existsSync(join(docsReal, '..', 'package.json'))) {
  console.error(`[prepare] 拒绝清空非预期目录(不是 site/docs): ${docsReal}`);
  process.exit(1);
}
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

// 真题 PDF 不再复制到站点(版权与第三方隐私考虑, 见文件头部说明)

// 文件名净化: 去掉会破坏 URL/JSON 的字符(如双引号)
const sanitizeName = (name) => name.replace(/["']/g, '');

// 收集并复制 md 文件
const mdFiles = []; // { absSrc, relDst, origName }
const excluded = []; // 命中排除规则的笔记(仅统计, 不动源文件)
for (const { src, dst } of SUBJECTS) {
  const srcAbs = join(repoRoot, src);
  if (!existsSync(srcAbs)) continue;
  walk(srcAbs, (abs) => {
    if (extname(abs).toLowerCase() !== '.md') return;
    // 排除 Obsidian 插件自动生成的目录导航 index.md(vault 内部文件, 不进站点)
    if (basename(abs).toLowerCase() === 'index.md') return;
    // 命中发布排除规则: 不进站点, 源文件保留
    const relVault = toSlashes(relative(repoRoot, abs));
    if (isExcluded(relVault)) { excluded.push(relVault); return; }
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
function resolveTarget(target, curRel) {
  let frag = '';
  const h = target.indexOf('#');
  if (h >= 0) { frag = target.slice(h); target = target.slice(0, h); }
  target = target.replace(/\.md$/i, '').trim();
  if (!target) return null;

  // 1) 相对当前文件所在目录(笔记里最常见的"同级/子目录"引用写法, 如 [[01-xx/00-xx总览]])
  if (curRel) {
    const abs = join(docsDir, dirname(curRel), target + '.md');
    if (existsSync(abs)) return { rel: toSlashes(relative(docsDir, abs)), frag };
  }

  // 2) 直接按 docs 相对路径
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

  // 4) 文件名索引(带路径时退化为最后一段, 与 Obsidian 按名匹配的语义一致)
  const hit = byBase.get(target) || byBase.get(target.split('/').pop());
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
  let inFence = false;
  const MAX_BLOCK_LINES = 50;

  for (const line of lines) {
    const trimmed = line.trim();
    // 跳过 fenced code block: 代码里的 $$ 只是文本, 计入块状态会错乱配对
    if (trimmed.startsWith('```')) {
      inFence = !inFence;
      out.push(line);
      continue;
    }
    if (inFence) {
      out.push(line);
      continue;
    }

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

// 规范化数学定界符: Obsidian 允许 $ x $ / $$ x $$(定界符与内容间空白),
// 但 KaTeX auto-render 不渲染带空格的定界符。这里去掉定界符内侧空白。
// 跳过 fenced code block 与转义美元(\$)。
function normalizeMathDelimiters(content) {
  const parts = content.split(/```/);
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part;
      let out = part;
      // 行内 $ x $ → $x$(内容不跨行, 不含 $; 排除 \$;
      // 注意用 [ \t]+ 而非 \s+, 否则会跨行匹配把 $$ 块截坏
      out = out.replace(/(?<!\\)\$[ \t]+([^$\n]{1,120}?)[ \t]+\$/g, '$$$1$');
      // 块 $$ x $$ → $$x$$(可跨行)
      // $$ 块: 只清理定界符内侧的"水平"空白(空格/tab)。
      // 注意: 不能用 \s*(含换行), 否则块闭合 $$ 后跟的换行被删, 与 --- 等粘连;
      // 替换串里 $$ 表示一个字面 $, 输出 $$ 必须写 $$$$
      out = out.replace(/(?<!\\)\$\$[ \t]*/g, '$$$$').replace(/[ \t]+\$\$/g, '$$$$');
      // $$ 块内的空行压缩为单换行: Obsidian 允许块内空行, 但 markdown 渲染
      // 会把空行分段, auto-render 无法跨段落匹配 $$...$$ 导致整块不渲染
      out = out.replace(/\$\$[^]*?\$\$/g, (m) => m.replace(/\n[ \t]*\n/g, '\n'));
      return out;
    })
    .join('```');
}

// 转义花括号, 避免 Vue 把 {{ }} 当作插值表达式解析(markdown-it 会去掉 \{ 的反斜杠, 因此需处理所有 { })
// 跳过 YAML frontmatter 与 fenced code block(代码中的 {{ }} 仅做最保守的双括号转义);
// 数学块($..$ / $$..$$ / \[..\] / \(..\))内的花括号是 LaTeX 语法, 必须保留(KaTeX 需要),
// 仅对其中的双花括号做实体转义以防 Vue 插值
function escapeVueBraces(content) {
  let body = content;
  let front = '';
  const fm = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  if (fm) {
    front = fm[0];
    body = content.slice(fm[0].length);
  }

  // 提取数学块为占位符(占位符用私有区字符, 不可能出现在正文)
  const mathBlocks = [];
  const MARK = (i) => `\uE000M${i}\uE001`;
  // 数学块提取: 字符状态机(跨行行内公式也能保护; 块内单个 $ 忽略;
  // \$ 转义美元不参与配对)。未闭合的块放弃保护, 交给普通花括号转义兜底
  const protectMath = (text) => {
    const n = text.length;
    let out = '';
    let state = 0; // 0=text 1=行内$ 2=块$$ 3=\[..\] 4=\(..\)
    let start = 0;
    let i = 0;
    const close = (end) => {
      mathBlocks.push(text.slice(start, end));
      out += MARK(mathBlocks.length - 1);
      state = 0;
    };
    while (i < n) {
      const c = text[i];
      if (state === 0) {
        if (c === '\\' && (text[i + 1] === '[' || text[i + 1] === '(')) {
          state = text[i + 1] === '[' ? 3 : 4;
          start = i;
          i += 2;
          continue;
        }
        if (c === '\\') { out += c + (text[i + 1] || ''); i += 2; continue; }
        if (c === '$') {
          if (text[i + 1] === '$') { state = 2; start = i; i += 2; continue; }
          state = 1;
          start = i;
          i += 1;
          continue;
        }
        out += c;
        i += 1;
      } else if (state === 1) {
        if (c === '\\') { i += 2; continue; }
        if (c === '$') close(i + 1);
        i += 1;
      } else if (state === 2) {
        if (text.startsWith('$$', i)) { close(i + 2); i += 2; continue; }
        i += 1;
      } else if (state === 3) {
        if (text.startsWith('\\]', i)) { close(i + 2); i += 2; continue; }
        i += 1;
      } else if (state === 4) {
        if (text.startsWith('\\)', i)) { close(i + 2); i += 2; continue; }
        i += 1;
      }
    }
    return out;
  };
  const restoreMath = (text) =>
    text.replace(/\uE000M(\d+)\uE001/g, (_, idx) => {
      let block = mathBlocks[Number(idx)];
      // 行内公式($..$, 非 $$ 块)里的 \tag 不被 KaTeX 支持, 移除编号
      // (跨行行内公式同样不删会报错, 这里不限制是否含换行)
      if (block.startsWith('$') && !block.startsWith('$$')) {
        block = block.replace(/\\tag\{[^}]*\}/g, '');
      }
      // 数学块内 {{ 拆成 { {: 用循环替换直到无残留(单次替换的边界会与
      // 相邻 { 重组出 {{, 循环每次消除一对必然收敛);
      // 不用 HTML 实体(会被 markdown-it 双重转义成 &amp;#123; 使 KaTeX 收到字面实体);
      // }} 无需处理(Vue 插值只认 {{)
      while (block.includes('{{')) block = block.replace('{{', '{ {');
      // 数学块内整行只有 = / -(如独立对齐行)会被 markdown-it 的 setext
      // 标题规则吞成 h1(文本行 + 下划线行): 转义为 \text{...} 使 KaTeX 等价渲染
      block = block.replace(/^([ \t]*)(=+|-+)[ \t]*$/gm, (_m, ws, marks) => `${ws}\\text{${marks}}`);
      // markdown-it 会把 \{ 转义为字面 {, 相邻的 { 会组成 {{ 触发 Vue 插值报错;
      // 用语义等价的 \lbrace/\rbrace 替代(KaTeX 同样渲染字面花括号, 且不受 markdown 转义影响)
      block = block.split('\\{').join('\\lbrace ').split('\\}').join('\\rbrace ');
      // markdown-it 会把 \\ 转义为单个 \, 破坏 KaTeX 的换行/对齐(如 aligned 的 \\&);
      // 换成语义等价的 \newline(字母命令不受 markdown 转义影响)
      block = block.split('\\\\').join('\\newline');
      // markdown-it 会把 \, \; \! \> \| 的反斜杠转义吃掉还原成裸标点,
      // 使 KaTeX 渲染出错误的逗号/分号/感叹号/单竖线; 换成语义等价的
      // 字母命令(不受 markdown 转义影响), 后跟字母时加 {} 防止命令粘连
      block = block.replace(/\\,([A-Za-z])/g, '\\thinspace{}$1');
      block = block.replace(/\\,/g, '\\thinspace');
      block = block.replace(/\\;([A-Za-z])/g, '\\thickspace{}$1');
      block = block.replace(/\\;/g, '\\thickspace');
      block = block.replace(/\\!([A-Za-z])/g, '\\negthinspace{}$1');
      block = block.replace(/\\!/g, '\\negthinspace');
      block = block.replace(/\\>([A-Za-z])/g, '\\medspace{}$1');
      block = block.replace(/\\>/g, '\\medspace');
      block = block.replace(/\\\|([A-Za-z])/g, '\\Vert{}$1');
      block = block.replace(/\\\|/g, '\\Vert');
      // markdown 会把公式内的 _ 与 * 解析为强调(em 标签), 使 auto-render 无法匹配跨标签的 $...$;
      // 裸 _ 转义为 \_(markdown 渲染回 _ 供 KaTeX 作下标), 裸 * 同理转义为 \*
      block = block.replace(/(?<!\\)_/g, '\\_');
      block = block.replace(/(?<!\\)\*/g, '\\*');
      // \#(转义井号)经 markdown 渲染会去掉反斜杠变成裸 #(KaTeX 保留字符报错):
      // 加倍反斜杠, markdown 渲染回 \# 供 KaTeX 显示字面 #;
      // 注意放在 \\ → \\newline 替换之后, 否则 \\# 的 \\ 会被换行替换吃掉
      block = block.replace(/\\#/g, '\\\\#');
      // \\& / \\%(KaTeX 的 & 对齐符与 % 注释符)经 markdown 还原成裸字符会报错;
      // 同样加倍反斜杠(\\) -> \\newline 已在前面完成, 不会误伤 \\& 换行对齐
      block = block.replace(/\\&/g, '\\\\&').replace(/\\%/g, '\\\\%');
      // 数学里的裸 #(集合大小记号)是 KaTeX 保留字符会报错; 同样转义为 \\#
      block = block.replace(/(?<!\\)#/g, '\\\\#');
      return block;
    });

  const parts = body.split(/```/);
  const escaped = parts.map((part, i) => {
    if (i % 2 === 1) {
      // fenced code block 内: 仅拆 {{ 防 Vue 插值, 保留单花括号以保证代码可读
      while (part.includes('{{')) part = part.replace('{{', '{ {');
      return part;
    }
    // 正文: 保护数学块后只拆 {{(单个花括号对 Vue/markdown 均无害), 再还原数学块
    const tmp = protectMath(part);
    let out = tmp;
    while (out.includes('{{')) out = out.replace('{{', '{ {');
    return restoreMath(out);
  });
  return front + escaped.join('```');
}

// 解析 [[...]] / ![[...]] 内部文本 -> { target, alias }
// Obsidian 导出时把分隔符写成转义的 \|(形如 [[01-xx/00-xx总览\|00-xx总览]]),
// 旧正则 ([^\]|]+?) 不认转义, 会把 \ 算进文件名 -> resolveTarget 失败 -> 链接降级为纯文本。
// 这里统一按"第一个未转义或转义的 |"切分, 并还原 target 中的 \| \[ \] 转义。
function parseWikiInner(inner) {
  const strip = (s) => s.trim().replace(/\\([|[\]])/g, '$1');
  const m = inner.match(/^([\s\S]*?)(?:\\?\|)([\s\S]*)$/);
  if (!m) return { target: strip(inner), alias: '' };
  return { target: strip(m[1]), alias: m[2].trim() };
}

function transform(content, curRel) {
  const curDir = dirname(curRel);
  const toRel = (rel) => {
    const p = toSlashes(relative(curDir, rel));
    return p === '' ? basename(rel) : p;
  };
  const linkLabel = (rel) => basename(rel, extname(rel));

  // 嵌入 ![[...]]
  content = content.replace(/!\[\[([^\]]+?)\]\]/g, (_m, inner) => {
    const { target: name, alias: alt } = parseWikiInner(inner);
    const ext = extname(name).toLowerCase();
    if (IMG_EXTS.has(ext)) {
      const imgRel = resolveImage(name);
      if (imgRel) return `![${alt || basename(name)}](${encodeURI(toRel(imgRel))})`;
      return alt || basename(name);
    }
    const resolved = resolveTarget(name, curRel);
    if (resolved) {
      const label = alt || linkLabel(resolved.rel);
      return `[${label}](${encodeURI(toRel(resolved.rel))}${resolved.frag})`;
    }
    return alt || name;
  });

  // 链接 [[...]]
  content = content.replace(/\[\[([^\]]+?)\]\]/g, (_m, inner) => {
    const { target, alias } = parseWikiInner(inner);
    if (target.startsWith('#')) {
      return `[${alias || target.slice(1)}](${target})`;
    }
    const resolved = resolveTarget(target, curRel);
    if (resolved) {
      const label = alias || linkLabel(resolved.rel);
      return `[${label}](${encodeURI(toRel(resolved.rel))}${resolved.frag})`;
    }
    return alias || target;
  });

  content = stripObsidianComments(content);
  content = convertCallouts(content);
  content = normalizeMath(content);
  content = normalizeMathDelimiters(content);
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
    - theme: brand
      text: 物理笔记
      link: /物理/
    - theme: brand
      text: 化学笔记
      link: /化学/
    - theme: alt
      text: 我的博客
      link: https://wym100171113.github.io/

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

// ---------- 6. 真题页(官方外链指引) ----------
// 站点不再托管真题 PDF, /真题PDF/ 页面保留为官方获取渠道的指引
const pdfPageDir = join(docsDir, '真题PDF');
mkdirSync(pdfPageDir, { recursive: true });
const pdfLines = [
  '# 物理竞赛真题（官方发布页）',
  '',
  '> 本站不再托管历年真题文件。试题版权归中国物理学会所有，请从官方渠道获取：',
  '',
  `- [全国竞赛试题和解答（官方列表页，第 25–38 届）](${CPHO_PAPERS_URL})`,
  `- [中国物理学会全国中学生物理竞赛网（首页）](${CPHO_HOME_URL})`,
  '',
  '## 使用说明',
  '',
  '- 官网路径：首页 → 参考资料 → 全国竞赛试题和解答，按届次下载预赛 / 复赛 / 决赛试题与参考解答。',
  '- 第 39 届（2022）及之后的真题请在官网「通知公告」栏目查找对应届次的发布页。',
  '- 本地备份：`~/Desktop/东西/01-物理奥赛 近十年预赛试题及讲评2026/`（预赛）与 `~/Desktop/东西/全国高中物理联赛/`（复赛 / 决赛，含官方 Word 原件），仅在本地与 Obsidian 中使用。',
  '- [34届(2017) 复赛](/物理/物理竞赛/真题/34届(2017)复赛试题及解答) 已誊录为 LaTeX 笔记，可在线阅读。',
];
writeFileSync(join(pdfPageDir, 'index.md'), pdfLines.join('\n') + '\n');
console.log('[prepare] 真题页已改为官方外链指引');

if (excluded.length) {
  console.log(`[prepare] 排除 ${excluded.length} 个笔记(仅不发布, 源文件保留):`);
  for (const e of excluded.sort()) console.log(`  - ${e}`);
}
console.log(`[prepare] 完成: ${mdFiles.length} 个笔记 → ${docsDir}`);

// ---------- 7. 搜索数据(标题索引 + 摘录索引) ----------
// 输出到 docs/public/search-data/, 由 SearchModal 组件 fetch 加载(浏览器/SW 缓存)。
// 站点 base 路径, 与 config.mts 的 base 保持一致(修改时需同步)
const BASE_URL = '/notes/';
const searchDataDir = join(docsDir, 'public', 'search-data');
mkdirSync(searchDataDir, { recursive: true });
// 摘录/节标题提取的截断参数(在 titleIndex 与 excerpts 两处使用)
const EXCERPT_MAX = 300; // 每节正文截断字符
const EXCERPT_MAX_SECTIONS = 12;
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
  // id 必须带 base 前缀, 否则导航拼出错误路径导致 404
  // titles: 页内节标题(供"标题"模式检索小节), 取自 buildExcerpts 的节结构
  const secs = buildExcerpts(abs);
  titleIndex.push({ id: `${BASE_URL}${rel}`, title: extractTitle(abs), titles: secs.map((s) => s.t).filter(Boolean).slice(0, 16) });
}
for (const { dst } of SUBJECTS) {
  const idxFile = join(docsDir, dst, 'index.md');
  if (existsSync(idxFile)) {
    titleIndex.push({ id: `${BASE_URL}${dst}/`, title: extractTitle(idxFile), titles: [] });
  }
}
writeFileSync(join(searchDataDir, 'title.json'), JSON.stringify(titleIndex));
console.log(`[prepare] 标题索引: ${titleIndex.length} 条 → search-data/title.json`);

// 摘录索引: 每页按标题切分成 {t: 标题, x: 正文片段}, 供搜索结果"展开详情"展示
// (不依赖页面 chunk 动态导入, 一次 fetch 全部缓存)
function buildExcerpts(absPath) {
  let content = readFileSync(absPath, 'utf8');
  content = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, ''); // 去 frontmatter
  const sections = [];
  let cur = null;
  let inFence = false;
  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('```')) { inFence = !inFence; continue; }
    if (inFence) continue;
    if (/^#{1,4}\s/.test(line)) {
      if (cur && (cur.x || cur.t)) sections.push(cur);
      cur = { t: line.replace(/^#+\s*/, '').trim(), x: '' };
      if (sections.length >= EXCERPT_MAX_SECTIONS) break;
      continue;
    }
    if (!cur) { cur = { t: '', x: '' }; }
    if (/^\s*[!>|]/.test(raw) || /^\s*\$/.test(raw) || /^!\[/.test(raw) || /^\[\[/.test(raw)) continue;
    const text = line.replace(/[#$*_`~]/g, '').trim();
    if (text) {
      if (cur.x) cur.x += ' ';
      cur.x += text;
      if (cur.x.length > EXCERPT_MAX) { cur.x = cur.x.slice(0, EXCERPT_MAX) + '…'; }
    }
  }
  if (cur && (cur.x || cur.t)) sections.push(cur);
  return sections.filter((s) => s.t || s.x);
}
const excerpts = {};
for (const f of mdFiles) {
  const rel = f.relDst.replace(/\.md$/, '');
  const secs = buildExcerpts(f.absSrc);
  if (secs.length) excerpts[`/${rel}`] = secs;
}
writeFileSync(join(searchDataDir, 'excerpts.json'), JSON.stringify(excerpts));
console.log(`[prepare] 摘录索引: ${Object.keys(excerpts).length} 页 → search-data/excerpts.json`);

// 构建版本号: 驱动前端 IndexedDB 全文索引缓存失效(每次部署新版本)
writeFileSync(join(searchDataDir, 'version.json'), JSON.stringify({ v: Date.now().toString(36) }));
console.log(`[prepare] 构建版本 → search-data/version.json`);
