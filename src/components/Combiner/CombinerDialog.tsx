import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../../store'
import { exportCombinedMarkdown, exportCombinedHTML } from '../../lib/export'
import type { TemplateName, PageSize, FrontmatterData } from '../../types'

const TEMPLATES: Array<{ id: TemplateName; label: string; color: string; desc: string }> = [
  { id: 'slate', label: 'Slate', color: '#4a5568', desc: 'Modern Corporate' },
  { id: 'linen', label: 'Linen', color: '#f7e8d0', desc: 'Minimal Warm Serif' },
  { id: 'scholar', label: 'Scholar', color: '#fefefe', desc: 'Academic Structured' },
]

interface SelectedDoc {
  id: string
  title: string
  content: string
  frontmatter: FrontmatterData
  filename: string
}

export default function CombinerDialog() {
  const combinerDialogOpen = useAppStore((s) => s.combinerDialogOpen)
  const setCombinerDialogOpen = useAppStore((s) => s.setCombinerDialogOpen)
  const tabs = useAppStore((s) => s.tabs)

  const [selectedDocs, setSelectedDocs] = useState<SelectedDoc[]>([])
  const [template, setTemplate] = useState<TemplateName>('slate')
  const [pageSize, setPageSize] = useState<PageSize>('A4')
  const [coverEnabled, setCoverEnabled] = useState(false)
  const [coverTitle, setCoverTitle] = useState('')
  const [coverSubtitle, setCoverSubtitle] = useState('')
  const [coverAuthor, setCoverAuthor] = useState('')
  const [coverDate, setCoverDate] = useState('')
  const [includeTOC, setIncludeTOC] = useState(false)
  const [format, setFormat] = useState<'md' | 'html'>('md')
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (combinerDialogOpen) {
      setSelectedDocs([])
      setTemplate('slate')
      setPageSize('A4')
      setCoverEnabled(false)
      setCoverTitle('')
      setCoverSubtitle('')
      setCoverAuthor('')
      setCoverDate('')
      setIncludeTOC(false)
      setFormat('md')
      setStatus(null)
    }
  }, [combinerDialogOpen])

  const close = useCallback(() => {
    setCombinerDialogOpen(false)
  }, [setCombinerDialogOpen])

  useEffect(() => {
    if (!combinerDialogOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [combinerDialogOpen, close])

  const availableTabs = tabs.filter((t) => !selectedDocs.some((d) => d.id === t.id))

  const addDoc = useCallback(
    (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId)
      if (!tab) return
      setSelectedDocs((prev) => [
        ...prev,
        {
          id: tab.id,
          title: tab.title,
          content: tab.content,
          frontmatter: tab.frontmatter ?? {},
          filename: tab.title.replace(/[^a-zA-Z0-9_-]/g, '_'),
        },
      ])
    },
    [tabs],
  )

  const removeDoc = useCallback((docId: string) => {
    setSelectedDocs((prev) => prev.filter((d) => d.id !== docId))
  }, [])

  const moveUp = useCallback((index: number) => {
    if (index === 0) return
    setSelectedDocs((prev) => {
      const arr = [...prev]
      ;[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]
      return arr
    })
  }, [])

  const moveDown = useCallback((index: number) => {
    setSelectedDocs((prev) => {
      if (index === prev.length - 1) return prev
      const arr = [...prev]
      ;[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]
      return arr
    })
  }, [])

  const handleExport = useCallback(async () => {
    if (selectedDocs.length === 0) {
      setStatus('Please select at least one document')
      return
    }
    if (coverEnabled && !coverTitle.trim()) {
      setStatus('Title is required for cover page')
      return
    }
    setStatus(`Exporting combined ${format === 'md' ? 'Markdown' : 'HTML'}...`)
    try {
      const exportFn = format === 'md' ? exportCombinedMarkdown : exportCombinedHTML
      await exportFn({
        documents: selectedDocs.map((d) => ({
          content: d.content,
          frontmatter: d.frontmatter,
          filename: d.filename,
        })),
        template,
        pageSize,
        coverPage: coverEnabled
          ? {
              title: coverTitle,
              subtitle: coverSubtitle || undefined,
              author: coverAuthor || undefined,
              date: coverDate || undefined,
            }
          : null,
        includeTOC,
      })
      setStatus('Exported successfully')
      setTimeout(() => setStatus(null), 2000)
    } catch (err) {
      setStatus(`Export failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [selectedDocs, template, pageSize, coverEnabled, coverTitle, coverSubtitle, coverAuthor, coverDate, includeTOC, format])

  if (!combinerDialogOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.5)]"
      onClick={(e) => { if (e.target === e.currentTarget) close() }}
    >
      <div className="bg-gray-800 text-gray-100 rounded-lg shadow-xl w-full max-w-[640px] mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
          <h2 className="text-base font-semibold text-gray-100">Combine Documents</h2>
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

        <div className="overflow-y-auto px-6 py-4 space-y-5 flex-1">
          {/* Available Documents */}
          <section>
            <p className="text-sm text-gray-200 block mb-2">Available Documents</p>
            {availableTabs.length === 0 ? (
              <p className="text-xs text-gray-500 italic">All tabs added</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => addDoc(tab.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded border border-gray-600 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {tab.title}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Selected Documents */}
          <section>
            <p className="text-sm text-gray-200 block mb-2">
              Selected Documents <span className="text-gray-500">({selectedDocs.length})</span>
            </p>
            {selectedDocs.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No documents selected</p>
            ) : (
              <div className="space-y-1.5">
                {selectedDocs.map((doc, i) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 rounded border border-gray-600"
                  >
                    <span className="text-xs text-gray-500 w-5 shrink-0">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 truncate">{doc.title}</p>
                      <p className="text-xs text-gray-500 truncate">{tabs.find((t) => t.id === doc.id)?.path ?? 'Scratch pad'}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => moveUp(i)}
                        className="p-1 text-gray-500 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed rounded"
                        title="Move up"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        disabled={i === selectedDocs.length - 1}
                        onClick={() => moveDown(i)}
                        className="p-1 text-gray-500 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed rounded"
                        title="Move down"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDoc(doc.id)}
                        className="p-1 text-gray-500 hover:text-red-400 rounded"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Template */}
          <section>
            <p className="text-sm text-gray-200 block mb-2">Template</p>
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
          </section>

          {/* Page Size */}
          <section>
            <p className="text-sm text-gray-200 block mb-1">Page size</p>
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
          </section>

          {/* Cover Page */}
          <section>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={coverEnabled}
                onChange={(e) => setCoverEnabled(e.target.checked)}
                className="accent-blue-500"
              />
              <span className="text-sm text-gray-200">Add cover page</span>
            </label>
            {coverEnabled && (
              <div className="mt-3 space-y-2.5 pl-6">
                <input
                  type="text"
                  value={coverTitle}
                  onChange={(e) => setCoverTitle(e.target.value)}
                  placeholder="Title (required)"
                  className="w-full bg-gray-700 text-sm text-gray-100 px-3 py-1.5 rounded border border-gray-600 placeholder-gray-500 outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  value={coverSubtitle}
                  onChange={(e) => setCoverSubtitle(e.target.value)}
                  placeholder="Subtitle"
                  className="w-full bg-gray-700 text-sm text-gray-100 px-3 py-1.5 rounded border border-gray-600 placeholder-gray-500 outline-none focus:border-blue-500"
                />
                <div className="flex gap-2.5">
                  <input
                    type="text"
                    value={coverAuthor}
                    onChange={(e) => setCoverAuthor(e.target.value)}
                    placeholder="Author"
                    className="flex-1 bg-gray-700 text-sm text-gray-100 px-3 py-1.5 rounded border border-gray-600 placeholder-gray-500 outline-none focus:border-blue-500"
                  />
                  <input
                    type="date"
                    value={coverDate}
                    onChange={(e) => setCoverDate(e.target.value)}
                    className="flex-1 bg-gray-700 text-sm text-gray-100 px-3 py-1.5 rounded border border-gray-600 outline-none focus:border-blue-500 [color-scheme:dark]"
                  />
                </div>
              </div>
            )}
          </section>

          {/* Table of Contents */}
          <section>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTOC}
                onChange={(e) => setIncludeTOC(e.target.checked)}
                className="accent-blue-500"
              />
              <span className="text-sm text-gray-200">Include table of contents</span>
            </label>
          </section>

          {/* Export Format */}
          <section>
            <p className="text-sm text-gray-200 block mb-1">Export format</p>
            <div className="flex rounded-md overflow-hidden border border-gray-600">
              {([
                { id: 'md', label: 'Markdown' },
                { id: 'html', label: 'HTML' },
              ] as const).map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setFormat(fmt.id)}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                    format === fmt.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>
          </section>

          {status && (
            <div className="text-sm text-gray-300 text-center">{status}</div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700 shrink-0">
          <button
            type="button"
            onClick={close}
            className="px-4 py-1.5 text-sm text-gray-300 hover:text-gray-100 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={selectedDocs.length === 0}
            className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Export Combined {format === 'md' ? 'Markdown' : 'HTML'}
          </button>
        </div>
      </div>
    </div>
  )
}
