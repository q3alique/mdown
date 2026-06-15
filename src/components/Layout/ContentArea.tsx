import { useRef, useEffect } from 'react'
import { useAppStore } from '../../store'
import Editor from '../Editor/Editor'
import Preview from '../Renderer/Preview'
import { useFileOpen } from '../../hooks/useFileOpen'

type Anchor = { line: number; top: number }

// Map a (fractional) source line to a scroll position in the preview, by
// interpolating between the two surrounding block anchors. Returns the
// preview scrollTop that puts that source line at the top of the viewport.
function sourceLineToTop(
  srcLine: number,
  anchors: Anchor[],
  scroller: HTMLElement,
): number | null {
  if (anchors.length === 0) return null
  const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight)

  // Before the first anchored block — scale linearly from the document top.
  if (srcLine <= anchors[0].line) {
    const a = anchors[0]
    const ratio = a.line > 1 ? (srcLine - 1) / (a.line - 1) : 0
    return Math.min(maxScroll, Math.max(0, ratio * a.top))
  }
  // After the last anchored block — scale toward the document bottom.
  const last = anchors[anchors.length - 1]
  if (srcLine >= last.line) {
    return Math.min(maxScroll, last.top)
  }
  // Between two anchors — interpolate.
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i]
    const b = anchors[i + 1]
    if (srcLine >= a.line && srcLine <= b.line) {
      const span = b.line - a.line
      const ratio = span > 0 ? (srcLine - a.line) / span : 0
      return Math.min(maxScroll, Math.max(0, a.top + ratio * (b.top - a.top)))
    }
  }
  return Math.min(maxScroll, last.top)
}

// Inverse of sourceLineToTop: given the preview's scrollTop, find which
// (fractional) source line is currently at the top of the viewport.
function topToSourceLine(scrollTop: number, anchors: Anchor[]): number | null {
  if (anchors.length === 0) return null
  if (scrollTop <= anchors[0].top) return anchors[0].line
  const last = anchors[anchors.length - 1]
  if (scrollTop >= last.top) return last.line
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i]
    const b = anchors[i + 1]
    if (scrollTop >= a.top && scrollTop <= b.top) {
      const span = b.top - a.top
      const ratio = span > 0 ? (scrollTop - a.top) / span : 0
      return a.line + ratio * (b.line - a.line)
    }
  }
  return last.line
}

export default function ContentArea() {
  const activeTabId = useAppStore((s) => s.activeTabId)
  const tabs = useAppStore((s) => s.tabs)
  const viewMode = useAppStore((s) => s.viewMode)
  const activeTab = tabs.find((t) => t.id === activeTabId)
  const { openFileFromDialog } = useFileOpen()

  const editorPaneRef = useRef<HTMLDivElement>(null)
  const previewPaneRef = useRef<HTMLDivElement>(null)
  const scrollingFrom = useRef<'editor' | 'preview' | null>(null)

  const showEditor = viewMode === 'split' || viewMode === 'editor'
  const showPreview = viewMode === 'split' || viewMode === 'preview'

  useEffect(() => {
    if (!showEditor || !showPreview) return
    const editorPane = editorPaneRef.current
    const previewPane = previewPaneRef.current
    if (!editorPane || !previewPane) return

    let resetTimer: ReturnType<typeof setTimeout> | null = null
    let previewScroller: HTMLElement | null = previewPane.querySelector('[data-preview-scroller]')

    const resetSource = () => {
      if (resetTimer) clearTimeout(resetTimer)
      resetTimer = setTimeout(() => { scrollingFrom.current = null }, 80)
    }

    // Build the preview's source-line anchors: each rendered top-level block
    // carries a `data-source-line` attribute (its .md line number). We record
    // [sourceLine, contentTop] pairs, sorted by line, so we can map any source
    // line to a vertical position in the preview (and back) by interpolation.
    const buildPreviewAnchors = (scroller: HTMLElement): { line: number; top: number }[] => {
      const scrollerTop = scroller.getBoundingClientRect().top
      const els = scroller.querySelectorAll<HTMLElement>('[data-source-line]')
      const anchors: { line: number; top: number }[] = []
      els.forEach((el) => {
        const line = Number(el.getAttribute('data-source-line'))
        if (!Number.isFinite(line)) return
        // Position of the block's top within the scroller's content.
        const top = el.getBoundingClientRect().top - scrollerTop + scroller.scrollTop
        anchors.push({ line, top })
      })
      // data-source-line order already follows document order, but guard anyway.
      anchors.sort((a, b) => a.line - b.line)
      return anchors
    }

    // ── Editor → Preview ────────────────────────────────────────────
    // Find the source line at the top of the editor viewport (with a fractional
    // part for smoothness), then scroll the preview so that same line's block
    // sits at the top.
    const syncEditorToPreview = () => {
      const view = useAppStore.getState().editorView
      if (!view || !previewScroller) return
      const scrollTop = view.scrollDOM.scrollTop
      const block = view.lineBlockAtHeight(scrollTop)
      const startLine = view.state.doc.lineAt(block.from).number
      const endLine = view.state.doc.lineAt(block.to).number
      const frac = block.height > 0 ? (scrollTop - block.top) / block.height : 0
      const srcPos = startLine + frac * (endLine - startLine)

      const anchors = buildPreviewAnchors(previewScroller)
      const targetTop = sourceLineToTop(srcPos, anchors, previewScroller)
      if (targetTop == null) return

      scrollingFrom.current = 'editor'
      previewScroller.scrollTop = targetTop
      resetSource()
    }

    // ── Preview → Editor ────────────────────────────────────────────
    // Determine which source line is at the top of the preview viewport, then
    // scroll the editor so that line is at its top.
    const syncPreviewToEditor = () => {
      const view = useAppStore.getState().editorView
      if (!view || !previewScroller) return
      const anchors = buildPreviewAnchors(previewScroller)
      const srcPos = topToSourceLine(previewScroller.scrollTop, anchors)
      if (srcPos == null) return

      const totalLines = view.state.doc.lines
      const clamped = Math.max(1, Math.min(totalLines, srcPos))
      const lineInfo = view.state.doc.line(Math.floor(clamped))
      const lineBlock = view.lineBlockAt(lineInfo.from)
      const lineFrac = clamped - Math.floor(clamped)
      const targetTop = lineBlock.top + lineFrac * lineBlock.height

      scrollingFrom.current = 'preview'
      view.scrollDOM.scrollTop = targetTop
      resetSource()
    }

    const onEditorScroll = (e: Event) => {
      const t = e.target as HTMLElement
      if (!(t instanceof HTMLElement) || !t.classList.contains('cm-scroller')) return
      if (scrollingFrom.current && scrollingFrom.current !== 'editor') return
      if (!previewScroller) previewScroller = previewPane.querySelector('[data-preview-scroller]')
      syncEditorToPreview()
    }
    const onPreviewScroll = (e: Event) => {
      const t = e.target as HTMLElement
      if (!(t instanceof HTMLElement)) return
      previewScroller = t
      if (scrollingFrom.current && scrollingFrom.current !== 'preview') return
      syncPreviewToEditor()
    }

    // Capture phase is essential: `scroll` does not bubble, but capturing
    // listeners on an ancestor still receive it as the event travels down to the
    // real scroll container.
    editorPane.addEventListener('scroll', onEditorScroll, { capture: true, passive: true })
    previewPane.addEventListener('scroll', onPreviewScroll, { capture: true, passive: true })

    const onResize = () => {
      if (scrollingFrom.current) return
      syncEditorToPreview()
    }
    window.addEventListener('resize', onResize)

    return () => {
      editorPane.removeEventListener('scroll', onEditorScroll, { capture: true })
      previewPane.removeEventListener('scroll', onPreviewScroll, { capture: true })
      window.removeEventListener('resize', onResize)
      if (resetTimer) clearTimeout(resetTimer)
      scrollingFrom.current = null
    }
  }, [showEditor, showPreview, activeTabId])

  if (!activeTab) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-sm">
        <p className="mb-4">No tabs open. Open a file to get started.</p>
        <button
          onClick={openFileFromDialog}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors"
        >
          Open File
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {showEditor && (
        <div
          ref={editorPaneRef}
          data-testid="editor-pane"
          className={`${showPreview ? 'flex-1' : 'w-full'} flex overflow-hidden`}
        >
          <Editor tabId={activeTab.id} />
        </div>
      )}

      {showEditor && showPreview && (
        <div className="w-px bg-gray-700 cursor-col-resize shrink-0" />
      )}

      {showPreview && (
        <div
          ref={previewPaneRef}
          data-testid="preview-pane"
          className={`${showEditor ? 'flex-1' : 'w-full'} flex overflow-hidden`}
        >
          <Preview content={activeTab.content} />
        </div>
      )}
    </div>
  )
}
