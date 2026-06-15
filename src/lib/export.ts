import slateCss from '../templates/slate.css?raw'
import linenCss from '../templates/linen.css?raw'
import scholarCss from '../templates/scholar.css?raw'
import hljsCss from 'highlight.js/styles/github-dark.css?raw'
import katexCss from 'katex/dist/katex.min.css?raw'
import { renderMarkdown } from './markdown'
import { fsWriteFile, saveFileDialog } from './tauri-commands'
import type { FrontmatterData, TemplateName, PageSize, Heading } from '../types'

const TEMPLATE_CSS: Record<TemplateName, string> = {
  slate: slateCss,
  linen: linenCss,
  scholar: scholarCss,
}

export interface SingleExportOptions {
  content: string
  template: TemplateName
  frontmatter: FrontmatterData
  pageSize: PageSize
  includeTOC?: boolean
  outputPath?: string
}

export interface CombinedExportOptions {
  documents: Array<{ content: string; frontmatter: FrontmatterData; filename: string }>
  template: TemplateName
  pageSize: PageSize
  coverPage: { title: string; subtitle?: string; author?: string; date?: string } | null
  includeTOC: boolean
  outputPath?: string
}

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildDocHtml(
  content: string,
  template: TemplateName,
  pageSize: PageSize,
  title: string,
  includeTOC = false,
): string {
  const templateCss = TEMPLATE_CSS[template]
  const rendered = renderMarkdown(content)
  const pageSizeRule = `@page { size: ${pageSize}; }`

  // Optional table of contents built from the document's own headings. The
  // .toc class carries `page-break-after: always`, so the body starts on a
  // fresh page just like the combined-document export.
  const tocHtml =
    includeTOC && rendered.headings.length > 0 ? buildSingleTocHtml(rendered.headings) : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${esc(title)}</title>
  <style>
${templateCss}

${pageSizeRule}

${hljsCss}

${katexCss}
  </style>
</head>
<body>
  ${tocHtml}${rendered.html}
</body>
</html>`
}

function buildSingleTocHtml(headings: Heading[]): string {
  let items = '<ul>'
  for (const h of headings) {
    if (h.level > 3) continue
    items += `<li class="toc-h${h.level}"><a href="#${esc(h.id)}">${esc(h.text)}</a></li>`
  }
  items += '</ul>'
  return `<div class="toc">${items}</div>`
}

export function buildPrintHtml(
  content: string,
  template: TemplateName,
  frontmatter: FrontmatterData,
  pageSize: PageSize,
  includeTOC = false,
): string {
  const title = frontmatter.title || 'Document'
  return buildDocHtml(content, template, pageSize, title, includeTOC)
}

function buildCoverPageHtml(
  coverPage: { title: string; subtitle?: string; author?: string; date?: string },
): string {
  return `<div class="cover-page">
  <h1>${esc(coverPage.title)}</h1>
  ${coverPage.subtitle ? `<p class="cover-subtitle">${esc(coverPage.subtitle)}</p>` : ''}
  ${coverPage.author ? `<p class="cover-author">${esc(coverPage.author)}</p>` : ''}
  ${coverPage.date ? `<p class="cover-date">${esc(coverPage.date)}</p>` : ''}
</div>`
}

function buildTocHtml(
  renderedDocs: Array<{ filename: string; frontmatter: FrontmatterData; headings: Heading[] }>,
): string {
  let items = '<ul>'
  for (const doc of renderedDocs) {
    const title = doc.frontmatter.title || doc.filename
    items += `<li class="toc-h1"><a href="#${esc(doc.filename)}">${esc(title)}</a></li>`
    for (const h of doc.headings) {
      if (h.level > 3) continue
      items += `<li class="toc-h${h.level}"><a href="#${esc(h.id)}">${esc(h.text)}</a></li>`
    }
  }
  items += '</ul>'
  return `<div class="toc">${items}</div>`
}

// ── Markdown export ────────────────────────────────────────────────
//
// Rather than rendering a PDF ourselves (headless-browser printing is brittle),
// we emit a clean `.md` file. The user can then open it in Obsidian — or any
// other markdown tool — to produce a polished PDF with their own theme. For the
// combiner this is the natural "merge" output: every selected document's raw
// markdown concatenated into one file, optionally with a generated TOC/cover.

/** Drop a leading YAML frontmatter block, returning just the markdown body. */
function stripFrontmatter(content: string): string {
  const m = content.match(/^---\n[\s\S]*?\n---\n/)
  return m ? content.slice(m[0].length) : content
}

/** Build a nested markdown bullet list linking to each heading by its slug. */
function buildTocMarkdownFromHeadings(headings: Heading[]): string {
  let out = '## Table of Contents\n\n'
  for (const h of headings) {
    if (h.level > 3) continue
    const indent = '  '.repeat(Math.max(0, h.level - 1))
    out += `${indent}- [${h.text}](#${h.id})\n`
  }
  return out
}

/** Combined TOC: each document is a top-level entry, with its headings nested. */
function buildCombinedTocMarkdown(
  docs: Array<{ filename: string; frontmatter: FrontmatterData; headings: Heading[] }>,
): string {
  let out = '## Table of Contents\n\n'
  for (const doc of docs) {
    const title = doc.frontmatter.title || doc.filename
    out += `- [${title}](#${doc.filename})\n`
    for (const h of doc.headings) {
      if (h.level > 3) continue
      const indent = '  '.repeat(h.level)
      out += `${indent}- [${h.text}](#${h.id})\n`
    }
  }
  return out
}

/** A simple markdown cover/title block for the merged document. */
function buildCoverMarkdown(
  cover: { title: string; subtitle?: string; author?: string; date?: string },
): string {
  let out = `# ${cover.title}\n`
  if (cover.subtitle) out += `\n*${cover.subtitle}*\n`
  const meta: string[] = []
  if (cover.author) meta.push(cover.author)
  if (cover.date) meta.push(cover.date)
  if (meta.length) out += `\n${meta.join(' · ')}\n`
  return out
}

export async function exportToMarkdown(options: SingleExportOptions): Promise<void> {
  let markdown = options.content

  // Optionally inject a generated TOC just below any frontmatter block, so the
  // document's own metadata stays at the very top where tools expect it.
  if (options.includeTOC) {
    const rendered = renderMarkdown(options.content)
    if (rendered.headings.length > 0) {
      const toc = buildTocMarkdownFromHeadings(rendered.headings)
      const fm = options.content.match(/^---\n[\s\S]*?\n---\n/)
      markdown = fm
        ? `${fm[0]}\n${toc}\n${options.content.slice(fm[0].length)}`
        : `${toc}\n${options.content}`
    }
  }

  let outputPath = options.outputPath
  if (!outputPath) {
    const defaultName = options.frontmatter.title
      ? `${options.frontmatter.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`
      : 'document.md'
    const result = await saveFileDialog({
      title: 'Export Markdown',
      defaultFilename: defaultName,
      filterName: 'Markdown Files',
      filterExtensions: ['md'],
    })
    if (!result) return
    outputPath = result
  }
  await fsWriteFile(outputPath, markdown, 'lf')
}

/**
 * Export combined documents as a single merged `.md` file. Each document's raw
 * markdown is concatenated (frontmatter stripped) and separated by a thematic
 * break, with an optional cover block and table of contents prepended.
 */
export async function exportCombinedMarkdown(options: CombinedExportOptions): Promise<void> {
  const docs = options.documents.map((doc) => ({
    ...doc,
    headings: renderMarkdown(doc.content).headings,
    body: stripFrontmatter(doc.content).trim(),
  }))

  const parts: string[] = []

  if (options.coverPage) {
    parts.push(buildCoverMarkdown(options.coverPage))
  }

  if (options.includeTOC) {
    parts.push(buildCombinedTocMarkdown(docs))
  }

  for (const doc of docs) {
    parts.push(doc.body)
  }

  // A blank line + `---` between sections renders as a clean section break in
  // Obsidian and other markdown tools.
  const markdown = `${parts.join('\n\n---\n\n')}\n`

  let outputPath = options.outputPath
  if (!outputPath) {
    const result = await saveFileDialog({
      title: 'Export Combined Markdown',
      defaultFilename: 'combined-document.md',
      filterName: 'Markdown Files',
      filterExtensions: ['md'],
    })
    if (!result) return
    outputPath = result
  }
  await fsWriteFile(outputPath, markdown, 'lf')
}

export async function exportToHTML(options: SingleExportOptions): Promise<void> {
  const html = buildPrintHtml(options.content, options.template, options.frontmatter, options.pageSize, options.includeTOC)
  let outputPath = options.outputPath
  if (!outputPath) {
    const defaultName = options.frontmatter.title
      ? `${options.frontmatter.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.html`
      : 'document.html'
    const result = await saveFileDialog({
      title: 'Export HTML',
      defaultFilename: defaultName,
      filterName: 'HTML Files',
      filterExtensions: ['html'],
    })
    if (!result) return
    outputPath = result
  }
  await fsWriteFile(outputPath, html, 'lf')
}

/**
 * Export combined documents as a single self-contained HTML file.
 */
export async function exportCombinedHTML(options: CombinedExportOptions): Promise<void> {
  const renderedDocs = options.documents.map((doc) => {
    const rendered = renderMarkdown(doc.content)
    return { ...doc, html: rendered.html, headings: rendered.headings }
  })

  let bodyHtml = ''

  if (options.coverPage) {
    bodyHtml += buildCoverPageHtml(options.coverPage)
  }

  if (options.includeTOC) {
    bodyHtml += buildTocHtml(renderedDocs)
  }

  for (let i = 0; i < renderedDocs.length; i++) {
    const doc = renderedDocs[i]
    bodyHtml += `<div id="${esc(doc.filename)}" class="${i > 0 ? 'page-break' : ''}">
${doc.html}
</div>`
  }

  const templateCss = TEMPLATE_CSS[options.template]
  const pageSizeRule = `@page { size: ${options.pageSize}; }`
  const title = options.coverPage?.title || 'Combined Document'

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${esc(title)}</title>
  <style>
${templateCss}

${pageSizeRule}

${hljsCss}

${katexCss}
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`

  let outputPath = options.outputPath
  if (!outputPath) {
    const result = await saveFileDialog({
      title: 'Export Combined HTML',
      defaultFilename: 'combined-document.html',
      filterName: 'HTML Files',
      filterExtensions: ['html'],
    })
    if (!result) return
    outputPath = result
  }
  await fsWriteFile(outputPath, fullHtml, 'lf')
}
