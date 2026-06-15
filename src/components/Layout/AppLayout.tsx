import { useAppStore } from '../../store'
import TabBar from './TabBar'
import Sidebar from './Sidebar'
import ContentArea from './ContentArea'
import StatusBar from './StatusBar'
import type { ViewMode } from '../../types'

const VIEW_MODES: { mode: ViewMode; label: string }[] = [
  { mode: 'editor', label: 'Edit' },
  { mode: 'split', label: 'Split' },
  { mode: 'preview', label: 'View' },
]

export default function AppLayout() {
  const tabs = useAppStore((s) => s.tabs)
  const activeTabId = useAppStore((s) => s.activeTabId)
  const closeTab = useAppStore((s) => s.closeTab)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const viewMode = useAppStore((s) => s.viewMode)
  const setViewMode = useAppStore((s) => s.setViewMode)

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0] ?? null

  if (!activeTab) {
    return (
      <div className="h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <p className="text-gray-500">No tabs open</p>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-900 text-gray-100 flex flex-col">
      {/* Tab Bar + View Mode Buttons */}
      <div className="flex items-stretch shrink-0 bg-[#1a1f2e] border-b border-gray-700">
        <div className="flex-1 overflow-hidden">
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId ?? activeTab.id}
            onTabClick={setActiveTab}
            onTabClose={closeTab}
          />
        </div>
        <div className="flex items-center px-2 gap-0 shrink-0 border-l border-gray-700">
          {VIEW_MODES.map(({ mode, label }) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              title={mode === 'editor' ? 'Editor only (Alt+1)' : mode === 'split' ? 'Split view (Alt+2)' : 'Preview only (Alt+3)'}
              className={`px-3 h-full text-xs font-medium transition-colors ${
                viewMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main body: sidebar + content */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <ContentArea />
      </div>

      {/* Status Bar */}
      <StatusBar
        filename={activeTab.path
          ? `${activeTab.title}${activeTab.path.endsWith('.md') ? '.md' : ''}`
          : activeTab.title}
      />
    </div>
  )
}
