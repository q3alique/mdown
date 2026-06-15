import type { Tab } from '../../types'

interface TabBarProps {
  tabs: Tab[]
  activeTabId: string
  onTabClick: (id: string) => void
  onTabClose: (id: string) => void
}

export default function TabBar({ tabs, activeTabId, onTabClick, onTabClose }: TabBarProps) {
  return (
    <div className="flex items-center h-8 gap-0 bg-[#1a1f2e] overflow-x-auto shrink-0">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        const isScratch = tab.type === 'scratch'

        return (
          <div
            key={tab.id}
            data-testid={`tab-${tab.id}`}
            onClick={() => onTabClick(tab.id)}
            className={`
              flex items-center gap-1.5 px-3 h-full cursor-pointer select-none
              text-sm border-r border-gray-700 whitespace-nowrap
              ${isActive
                ? 'bg-gray-700 text-gray-100'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-750 hover:text-gray-200'
              }
            `}
          >
            {/* File icon */}
            {isScratch ? (
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            )}

            {/* Title */}
            <span>{tab.title}</span>

            {/* Dirty indicator */}
            {tab.dirty && (
              <span className="text-blue-400 text-xs" data-testid={`dirty-${tab.id}`}>•</span>
            )}

            {/* Close button (not for scratch tab) */}
            {!isScratch && (
              <button
                data-testid={`close-${tab.id}`}
                onClick={(e) => { e.stopPropagation(); onTabClose(tab.id) }}
                className="ml-1 text-gray-500 hover:text-gray-100 hover:bg-gray-600 rounded p-0.5 leading-none"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
