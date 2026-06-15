import MarkdownIt from 'markdown-it'
import footnote from 'markdown-it-footnote'
import anchor from 'markdown-it-anchor'
import hljs from 'highlight.js'
import DOMPurify from 'dompurify'
import mermaid from 'mermaid'
import * as jsYaml from 'js-yaml'
import type { Heading, FrontmatterData } from '../types'

// ── Mermaid initialisation (once, at module level) ─────────────────

mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'strict',
})

// ── Frontmatter state ──────────────────────────────────────────────

let _rawFrontmatter = ''
let _parsedFrontmatter: FrontmatterData | null = null

export function getFrontmatter(): { raw: string; parsed: FrontmatterData | null } {
  return { raw: _rawFrontmatter, parsed: _parsedFrontmatter }
}

function resetFrontmatter() {
  _rawFrontmatter = ''
  _parsedFrontmatter = null
}

// ── markdown-it instance ───────────────────────────────────────────

const md: MarkdownIt = new MarkdownIt({
  html: false, // NEVER allow raw HTML
  linkify: true,
  typographer: true,
  highlight: (str: string, lang: string): string => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`
      } catch {
        // fall through to escaped output
      }
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`
  },
})

// Plugins
md.use(footnote)
md.use(anchor, {
  permalink: anchor.permalink.headerLink({ class: 'header-anchor' }),
})

// Tag every top-level block with the source line it originated from. This is
// what makes "content sync" possible: the preview DOM carries the .md line
// number of each block, so the editor and preview can be aligned by *content*
// (which source line is on screen) rather than by raw scroll percentage.
//
// `token.map` is [startLine, endLine] in 0-based source-line coordinates of the
// text that markdown-it actually rendered. Frontmatter is stripped before
// rendering, so we add `sourceLineOffset` (the number of frontmatter lines) and
// +1 to land on the same 1-based line numbers CodeMirror reports.
md.core.ruler.push('inject_source_line', (state) => {
  const env = (state.env ?? {}) as { sourceLineOffset?: number }
  const offset = env.sourceLineOffset ?? 0
  for (const token of state.tokens) {
    // Only top-level blocks (level 0) with a known source range. Skip inline
    // containers — their parent block already carries the line.
    if (token.level === 0 && token.map && token.type !== 'inline') {
      token.attrSet('data-source-line', String(token.map[0] + offset + 1))
    }
  }
})

// Override fence renderer for Mermaid
const defaultFence = md.renderer.rules.fence!
md.renderer.rules.fence = (tokens, idx, _options, _env, _self) => {
  const token = tokens[idx]
  const lang = token.info.trim().split(/\s+/)[0]

  if (lang === 'mermaid') {
    // Preserve the source-line tag the core ruler attached so mermaid blocks
    // still participate in content sync.
    const srcLine = token.attrGet('data-source-line')
    const srcAttr = srcLine ? ` data-source-line="${srcLine}"` : ''
    return `<div class="mermaid"${srcAttr}>${md.utils.escapeHtml(token.content)}</div>`
  }

  return defaultFence(tokens, idx, _options, _env, _self)
}

// ── Render function ────────────────────────────────────────────────

export interface RenderResult {
  html: string
  headings: Heading[]
  frontmatter: FrontmatterData | null
}

/** Safely convert a YAML value to string, handling Date objects */
function safeStr(val: unknown): string | undefined {
  if (val === null || val === undefined) return undefined
  if (val instanceof Date) return val.toISOString()
  return String(val)
}

export function renderMarkdown(content: string): RenderResult {
  // Reset frontmatter state for this render
  resetFrontmatter()

  // Parse frontmatter manually (extract before markdown-it rendering)
  let body = content
  let sourceLineOffset = 0
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/)
  if (fmMatch) {
    _rawFrontmatter = fmMatch[1]
    body = content.slice(fmMatch[0].length)
    // Lines consumed by the frontmatter block — added back to token line
    // numbers so the preview's data-source-line matches editor line numbers.
    sourceLineOffset = (fmMatch[0].match(/\n/g) ?? []).length
    try {
      const parsed = jsYaml.load(_rawFrontmatter) as Record<string, unknown>
      if (parsed && typeof parsed === 'object') {
        _parsedFrontmatter = {
          title: safeStr(parsed.title),
          author: safeStr(parsed.author),
          date: safeStr(parsed.date),
          description: safeStr(parsed.description),
        }
      }
    } catch {
      console.warn('Frontmatter parse error — treating as absent')
    }
  }

  // Render (pass the frontmatter offset so block line numbers stay aligned
  // with the editor's source lines).
  const rawHtml = md.render(body, { sourceLineOffset })

  // Sanitise with DOMPurify
  const sanitized = DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    ALLOWED_ATTR: ['class', 'id', 'href', 'src', 'alt', 'title', 'target', 'rel', 'data-source-line'],
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr', 'pre', 'code', 'blockquote',
      'ul', 'ol', 'li', 'dl', 'dt', 'dd',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'a', 'img', 'strong', 'em', 'del', 'ins', 'sub', 'sup',
      'span', 'div', 'section', 'header', 'footer',
      'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon',
      'text', 'g', 'defs', 'use', 'marker',
    ],
  })

  // Extract headings from the rendered HTML
  const headings = extractHeadings(sanitized)

  // Run Mermaid on .mermaid elements (async, non-blocking)
  scheduleMermaidRun()

  return {
    html: sanitized,
    headings,
    frontmatter: _parsedFrontmatter,
  }
}

// ── Heading extraction ─────────────────────────────────────────────

function extractHeadings(html: string): Heading[] {
  const headings: Heading[] = []
  const regex = /<h([1-4])(?:\s+id="([^"]*)")?[^>]*>([\s\S]*?)<\/h\1>/gi
  let match: RegExpExecArray | null

  while ((match = regex.exec(html)) !== null) {
    const level = Number(match[1])
    let id = match[2] ?? ''
    const innerHtml = match[3]

    // If no id on the heading, check if first child is an anchor with id
    if (!id) {
      const anchorMatch = innerHtml.match(/^<a\s+id="([^"]*)"/i)
      if (anchorMatch) id = anchorMatch[1]
    }

    // Strip tags from inner HTML to get plain text
    const text = innerHtml.replace(/<[^>]*>/g, '').trim()
    const offset = match.index

    headings.push({ id, text, level, offset })
  }

  return headings
}

// ── Mermaid scheduling ─────────────────────────────────────────────

let mermaidTimer: ReturnType<typeof setTimeout> | null = null

function scheduleMermaidRun() {
  if (mermaidTimer) clearTimeout(mermaidTimer)
  mermaidTimer = setTimeout(() => {
    mermaidTimer = null
    const elements = document.querySelectorAll('.mermaid')
    if (elements.length > 0) {
      // Cast to NodeListOf<HTMLElement> for mermaid.run compatibility
      mermaid.run({ nodes: elements as unknown as HTMLElement[] }).catch((err: unknown) => {
        console.error('Mermaid render error:', err)
      })
    }
  }, 50)
}

// ── External link handler ─────────────────────────────────────────

export function handlePreviewClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  const link = target.closest('a')
  if (!link) return

  const href = link.getAttribute('href') ?? ''
  // Allow internal anchor links
  if (href.startsWith('#')) return

  // External links — open in system browser
  if (href.startsWith('http://') || href.startsWith('https://')) {
    e.preventDefault()
    window.open(href, '_blank')
  }
}
