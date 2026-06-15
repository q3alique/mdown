import { memo, useCallback, useState, useRef, useEffect } from 'react'
import { EditorView } from '@codemirror/view'
import logoUrl from '../../assets/logo.png'
import { useAppStore } from '../../store'
import { useFileOpen } from '../../hooks/useFileOpen'
import type { Heading } from '../../types'

interface HeadingItemProps {
  heading: Heading
  onSelect: (id: string) => void
}

const HeadingItem = memo(function HeadingItem({ heading, onSelect }: HeadingItemProps) {
  const indentMap: Record<number, string> = {
    1: 'pl-0',
    2: 'pl-3',
    3: 'pl-6',
    4: 'pl-9',
  }
  const weightMap: Record<number, string> = {
    1: 'font-semibold',
    2: 'font-medium',
    3: 'font-normal',
    4: 'font-normal',
  }

  return (
    <button
      className={`w-full text-left text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded px-2 py-0.5 truncate ${indentMap[heading.level] ?? ''} ${weightMap[heading.level] ?? ''}`}
      onClick={() => onSelect(heading.id)}
      title={heading.text}
    >
      {heading.text}
    </button>
  )
})

const Sidebar = memo(function Sidebar() {
  const headings = useAppStore((s) => s.headings)
  const recentFiles = useAppStore((s) => s.recentFiles)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)
  const setExportDialogOpen = useAppStore((s) => s.setExportDialogOpen)
  const setCombinerDialogOpen = useAppStore((s) => s.setCombinerDialogOpen)
  const { openFileFromDialog, openFileFromPath } = useFileOpen()

  const [recentMenuOpen, setRecentMenuOpen] = useState(false)
  const recentBtnRef = useRef<HTMLButtonElement>(null)
  const recentMenuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    if (!recentMenuOpen) return
    function onMouseDown(e: MouseEvent) {
      if (
        !recentMenuRef.current?.contains(e.target as Node) &&
        !recentBtnRef.current?.contains(e.target as Node)
      ) {
        setRecentMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [recentMenuOpen])

  const handleHeadingSelect = useCallback((id: string) => {
    // 1) Scroll the PREVIEW to the heading element.
    const el = document.querySelector<HTMLElement>(
      `[data-testid="preview-content"] #${CSS.escape(id)}`,
    )
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    // 2) Scroll the EDITOR (code side) to the same heading's source line. The
    // rendered heading carries `data-source-line` (its .md line number), so we
    // read it off the preview element and drive the CodeMirror view directly —
    // this keeps both panes anchored on the same content regardless of how
    // differently the two sides are laid out.
    const lineAttr = el?.getAttribute('data-source-line')
    const view = useAppStore.getState().editorView
    if (view && lineAttr) {
      const line = Number(lineAttr)
      if (Number.isFinite(line) && line >= 1) {
        const lineInfo = view.state.doc.line(Math.min(line, view.state.doc.lines))
        view.dispatch({
          selection: { anchor: lineInfo.from },
          effects: EditorView.scrollIntoView(lineInfo.from, { y: 'start' }),
        })
        // Place the cursor there too, so it's visually obvious where you landed.
        view.focus()
      }
    }
  }, [])

  const handleOpenRecent = useCallback((path: string) => {
    setRecentMenuOpen(false)
    openFileFromPath(path)
  }, [openFileFromPath])

  return (
    <aside className="w-60 bg-gray-800 flex flex-col shrink-0 border-r border-gray-700 relative">
      {/* App logo / name */}
      <div className="h-10 flex items-center gap-2 px-4 border-b border-gray-700 shrink-0">
        <img src={logoUrl} alt="MDown logo" className="w-5 h-5 rounded-sm" />
        <h1 className="text-sm font-bold text-gray-100 tracking-wide">MDown</h1>
      </div>

      {/* Outline panel */}
      <div className="flex-1 overflow-y-auto p-3">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">Outline</p>
        {headings.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No headings found</p>
        ) : (
          <nav className="flex flex-col gap-0.5">
            {headings.map((h) => (
              <HeadingItem key={h.id} heading={h} onSelect={handleHeadingSelect} />
            ))}
          </nav>
        )}
      </div>

      {/* Recent files popover — rendered inside aside so it clips correctly */}
      {recentMenuOpen && (
        <div
          ref={recentMenuRef}
          className="absolute bottom-12 left-0 right-0 mx-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-20 overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-gray-700">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Recent Files</span>
          </div>
          {recentFiles.length === 0 ? (
            <div className="px-3 py-4 text-sm text-gray-500 italic text-center">No recent files</div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {recentFiles.map((f) => (
                <button
                  key={f.path}
                  className="w-full text-left px-3 py-2 hover:bg-gray-700 flex flex-col gap-0.5 transition-colors"
                  onClick={() => handleOpenRecent(f.path)}
                  title={f.path}
                >
                  <span className="text-sm text-gray-200 truncate">{f.title}</span>
                  <span className="text-xs text-gray-500 truncate">{f.path}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer with icon buttons */}
      <div className="h-10 flex items-center justify-around px-3 border-t border-gray-700 shrink-0">
        {/* Open File icon */}
        <button
          data-testid="sidebar-open"
          className="text-gray-500 hover:text-gray-200 p-1 rounded"
          title="Open File (Ctrl+O)"
          onClick={openFileFromDialog}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </button>

        {/* Recent Files icon */}
        <button
          ref={recentBtnRef}
          data-testid="sidebar-recent"
          className={`p-1 rounded transition-colors ${recentMenuOpen ? 'text-blue-400' : 'text-gray-500 hover:text-gray-200'}`}
          title="Recent Files"
          onClick={() => setRecentMenuOpen((v) => !v)}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* Export icon */}
        <button
          data-testid="sidebar-export"
          className="text-gray-500 hover:text-gray-200 p-1 rounded"
          title="Export (Ctrl+Shift+E)"
          onClick={() => setExportDialogOpen(true)}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>

        {/* Combine icon */}
        <button
          data-testid="sidebar-combine"
          className="text-gray-500 hover:text-gray-200 p-1 rounded"
          title="Combine Documents (Ctrl+Shift+C)"
          onClick={() => setCombinerDialogOpen(true)}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>

        {/* Settings icon */}
        <button
          data-testid="sidebar-settings"
          className="text-gray-500 hover:text-gray-200 p-1 rounded"
          title="Settings"
          onClick={() => setSettingsOpen(true)}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </aside>
  )
})

export default Sidebar
