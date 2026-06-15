import { useEffect, useCallback, useState } from 'react'
import { useAppStore } from '../../store'
import { persistSettings } from '../../store/persistence'
import type { AppSettings, ViewMode, TemplateName, PageSize } from '../../types'

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-200">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-600'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </label>
  )
}

function SegmentedControl<T extends string>({ options, value, onChange, label }: { options: T[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="py-2">
      <span className="text-sm text-gray-200 block mb-1">{label}</span>
      <div className="flex rounded-md overflow-hidden border border-gray-600">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt as T)}
            className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
              value === opt ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

const TEMPLATES = [
  { id: 'slate', label: 'Slate', color: '#4a5568' },
  { id: 'linen', label: 'Linen', color: '#f7e8d0' },
  { id: 'scholar', label: 'Scholar', color: '#fefefe' },
] as const

function TemplateSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="py-2">
      <span className="text-sm text-gray-200 block mb-1">Default template</span>
      <div className="space-y-2">
        {TEMPLATES.map((t) => (
          <label
            key={t.id}
            className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer border transition-colors ${
              value === t.id
                ? 'border-blue-500 bg-gray-700'
                : 'border-gray-600 bg-gray-800 hover:bg-gray-700'
            }`}
          >
            <input
              type="radio"
              name="template"
              value={t.id}
              checked={value === t.id}
              onChange={() => onChange(t.id)}
              className="sr-only"
            />
            <span
              className="w-5 h-5 rounded border border-gray-500 shrink-0"
              style={{ backgroundColor: t.color }}
            />
            <span className="text-sm text-gray-200">{t.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

export default function SettingsPanel() {
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const settingsOpen = useAppStore((s) => s.settingsOpen)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)
  const setViewMode = useAppStore((s) => s.setViewMode)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const setStatusMessage = useAppStore((s) => s.setStatusMessage)

  // Local draft state — initialised from store when panel opens
  const [draft, setDraft] = useState<AppSettings>(() => ({ ...settings }))
  const [hasChanges, setHasChanges] = useState(false)

  // Re-initialise draft every time the panel opens
  useEffect(() => {
    if (settingsOpen) {
      setDraft({ ...useAppStore.getState().settings })
      setHasChanges(false)
    }
  }, [settingsOpen])

  const updateDraft = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: value }
      setHasChanges(true)
      return next
    })
  }, [])

  const handleSave = useCallback(() => {
    // Apply draft to Zustand store
    updateSettings(draft)
    // Close panel and show feedback immediately — don't wait for disk I/O
    setHasChanges(false)
    setSettingsOpen(false)
    setStatusMessage('Settings saved')
    setTimeout(() => setStatusMessage(null), 2000)
    // Persist to Tauri plugin-store in the background (fire-and-forget)
    persistSettings(draft).catch((err) => {
      console.error('Failed to persist settings:', err)
      // Don't revert the UI — the in-memory settings are already applied
    })
  }, [draft, updateSettings, setSettingsOpen, setStatusMessage])

  const handleCancel = useCallback(() => {
    setDraft({ ...useAppStore.getState().settings })
    setHasChanges(false)
    setSettingsOpen(false)
  }, [setSettingsOpen])

  const close = useCallback(() => setSettingsOpen(false), [setSettingsOpen])

  useEffect(() => {
    if (!settingsOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (hasChanges) {
          // Let the user decide — don't auto-close with unsaved changes
          // Actually, do close and discard (matching Cancel behaviour)
          handleCancel()
        } else {
          close()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [settingsOpen, close, hasChanges, handleCancel])

  if (!settingsOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.5)]"
      onClick={(e) => { if (e.target === e.currentTarget) handleCancel() }}
    >
      <div className="bg-gray-800 text-gray-100 rounded-lg shadow-xl w-full max-w-[560px] max-h-[80vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-base font-semibold text-gray-100">Settings</h2>
          {hasChanges && (
            <span className="text-xs text-yellow-400">Unsaved changes</span>
          )}
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Editor */}
          <section>
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Editor</h3>
            <div className="space-y-1">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-200">Font size</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateDraft('fontSize', Math.max(10, draft.fontSize - 1))}
                    className="w-7 h-7 flex items-center justify-center rounded bg-gray-700 text-gray-200 hover:bg-gray-600 text-sm"
                  >
                    −
                  </button>
                  <span className="text-sm text-gray-200 w-6 text-center">{draft.fontSize}</span>
                  <button
                    type="button"
                    onClick={() => updateDraft('fontSize', Math.min(32, draft.fontSize + 1))}
                    className="w-7 h-7 flex items-center justify-center rounded bg-gray-700 text-gray-200 hover:bg-gray-600 text-sm"
                  >
                    +
                  </button>
                </div>
              </div>
              <ToggleSwitch
                checked={draft.lineNumbers}
                onChange={(v) => updateDraft('lineNumbers', v)}
                label="Line numbers"
              />
              <ToggleSwitch
                checked={draft.wordWrap}
                onChange={(v) => updateDraft('wordWrap', v)}
                label="Word wrap"
              />
              {/*
                The tab-size segmented control uses numeric values rendered as strings.
                We map them back to numbers when saving.
              */}
              <SegmentedControl
                options={['2', '4', '8']}
                value={String(draft.tabSize)}
                onChange={(v) => updateDraft('tabSize', Number(v))}
                label="Tab size"
              />
            </div>
          </section>

          {/* Appearance */}
          <section>
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Appearance</h3>
            <div className="space-y-1">
              <SegmentedControl
                options={['Dark', 'Light']}
                value={draft.uiTheme === 'dark' ? 'Dark' : 'Light'}
                onChange={(v) => updateDraft('uiTheme', v === 'Dark' ? 'dark' : 'light')}
                label="UI theme"
              />
              <SegmentedControl
                options={['One Dark', 'GitHub Light']}
                value={draft.editorTheme === 'one-dark' ? 'One Dark' : 'GitHub Light'}
                onChange={(v) => updateDraft('editorTheme', v === 'One Dark' ? 'one-dark' : 'github-light')}
                label="Editor theme"
              />
            </div>
          </section>

          {/* Export */}
          <section>
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Export</h3>
            <div className="space-y-1">
              <TemplateSelector
                value={draft.defaultTemplate}
                onChange={(v) => updateDraft('defaultTemplate', v as TemplateName)}
              />
              <SegmentedControl
                options={['A4', 'Letter']}
                value={draft.defaultPageSize}
                onChange={(v) => updateDraft('defaultPageSize', v as PageSize)}
                label="Default page size"
              />
            </div>
          </section>

          {/* Preview */}
          <section>
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Preview</h3>
            <div className="space-y-1">
              <SegmentedControl
                options={['Normal 800px', 'Wide 1100px', 'Full']}
                value={
                  draft.previewWidth === 'normal'
                    ? 'Normal 800px'
                    : draft.previewWidth === 'wide'
                      ? 'Wide 1100px'
                      : 'Full'
                }
                onChange={(v) =>
                  updateDraft(
                    'previewWidth',
                    v === 'Normal 800px' ? 'normal' : v === 'Wide 1100px' ? 'wide' : 'full',
                  )
                }
                label="Max preview width"
              />
            </div>
          </section>

          {/* Layout */}
          <section>
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Layout</h3>
            <div className="space-y-1">
              <ToggleSwitch
                checked={draft.sidebarVisible}
                onChange={(v) => {
                  updateDraft('sidebarVisible', v)
                  // Also toggle the real sidebar immediately so the user sees the effect
                  if (v !== useAppStore.getState().sidebarVisible) toggleSidebar()
                }}
                label="Show outline sidebar"
              />
              <SegmentedControl
                options={['Split', 'Editor only', 'Preview only']}
                value={
                  draft.defaultView === 'split'
                    ? 'Split'
                    : draft.defaultView === 'editor'
                      ? 'Editor only'
                      : 'Preview only'
                }
                onChange={(v) => {
                  const mode: ViewMode = v === 'Split' ? 'split' : v === 'Editor only' ? 'editor' : 'preview'
                  updateDraft('defaultView', mode)
                  // Also apply the view mode immediately so the user sees the effect
                  setViewMode(mode)
                }}
                label="Default view"
              />
            </div>
          </section>
        </div>

        {/* Footer with Save / Cancel */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-1.5 text-sm text-gray-300 hover:text-gray-100 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-colors disabled:opacity-40"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}
