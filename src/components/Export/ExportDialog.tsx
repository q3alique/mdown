import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../../store'
import { exportToHTML, exportToMarkdown } from '../../lib/export'
import type { TemplateName, PageSize } from '../../types'

const TEMPLATES: Array<{ id: TemplateName; label: string; color: string; desc: string }> = [
  { id: 'slate', label: 'Slate', color: '#4a5568', desc: 'Modern Corporate' },
  { id: 'linen', label: 'Linen', color: '#f7e8d0', desc: 'Minimal Warm Serif' },
  { id: 'scholar', label: 'Scholar', color: '#fefefe', desc: 'Academic Structured' },
]

export default function ExportDialog() {
  const exportDialogOpen = useAppStore((s) => s.exportDialogOpen)
  const setExportDialogOpen = useAppStore((s) => s.setExportDialogOpen)
  const settings = useAppStore((s) => s.settings)
  const tabs = useAppStore((s) => s.tabs)
  const activeTabId = useAppStore((s) => s.activeTabId)

  const [template, setTemplate] = useState<TemplateName>(settings.defaultTemplate)
  const [pageSize, setPageSize] = useState<PageSize>(settings.defaultPageSize === 'A3' ? 'A4' : settings.defaultPageSize)
  const [includeTOC, setIncludeTOC] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (exportDialogOpen) {
      setTemplate(settings.defaultTemplate)
      setPageSize(settings.defaultPageSize === 'A3' ? 'A4' : settings.defaultPageSize)
      setIncludeTOC(false)
      setStatus(null)
    }
  }, [exportDialogOpen, settings.defaultTemplate, settings.defaultPageSize])

  const close = useCallback(() => {
    setExportDialogOpen(false)
  }, [setExportDialogOpen])

  useEffect(() => {
    if (!exportDialogOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [exportDialogOpen, close])

  const activeTab = tabs.find((t) => t.id === activeTabId)

  const handleExport = useCallback(async (format: 'html' | 'md') => {
    if (!activeTab) return
    setStatus(`Exporting ${format === 'md' ? 'Markdown' : 'HTML'}...`)
    try {
      const options = {
        content: activeTab.content,
        template,
        frontmatter: activeTab.frontmatter ?? {},
        pageSize,
        includeTOC,
      }
      if (format === 'html') {
        await exportToHTML(options)
      } else {
        await exportToMarkdown(options)
      }
      setStatus('Exported successfully')
      setTimeout(() => setStatus(null), 2000)
    } catch (err) {
      setStatus(`Export failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [activeTab, template, pageSize, includeTOC])

  if (!exportDialogOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.5)]"
      onClick={(e) => { if (e.target === e.currentTarget) close() }}
    >
      <div className="bg-gray-800 text-gray-100 rounded-lg shadow-xl w-full max-w-[480px] mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-base font-semibold text-gray-100">Export</h2>
          <button
            type="button"
            onClick={close}
            className="text-gray-500 hover:text-gray-200 p-1 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-5">
          <div>
            <span className="text-sm text-gray-200 block mb-2">Template</span>
            <div className="grid grid-cols-3 gap-3">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplate(t.id)}
                  className={`flex flex-col items-center gap-2 px-3 py-3 rounded-lg border transition-colors ${
                    template === t.id
                      ? 'border-blue-500 bg-gray-700 ring-1 ring-blue-500'
                      : 'border-gray-600 bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  <span
                    className="w-8 h-8 rounded-lg border border-gray-500"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="text-xs font-medium text-gray-200">{t.label}</span>
                  <span className="text-[10px] text-gray-500 text-center leading-tight">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-sm text-gray-200 block mb-1">Page size</span>
            <div className="flex rounded-md overflow-hidden border border-gray-600">
              {(['A4', 'Letter'] as PageSize[]).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPageSize(size)}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                    pageSize === size ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeTOC}
              onChange={(e) => setIncludeTOC(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
            />
            <span className="text-sm text-gray-200">Include table of contents</span>
          </label>

          {status && (
            <div className="text-sm text-gray-300 text-center">{status}</div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700">
          <button
            type="button"
            onClick={close}
            className="px-4 py-1.5 text-sm text-gray-300 hover:text-gray-100 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleExport('html')}
            className="px-4 py-1.5 text-sm font-medium text-white bg-gray-600 hover:bg-gray-500 rounded-md transition-colors"
          >
            Export HTML
          </button>
          <button
            type="button"
            onClick={() => handleExport('md')}
            className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-colors"
          >
            Export Markdown
          </button>
        </div>
      </div>
    </div>
  )
}
