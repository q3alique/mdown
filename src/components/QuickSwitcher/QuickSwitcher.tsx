import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Fuse from 'fuse.js'
import { useAppStore } from '../../store'
import { useFileOpen } from '../../hooks/useFileOpen'

interface SwitcherItem {
  type: 'open-tab' | 'recent-file'
  id: string
  path: string
  title: string
  subtitle: string
  lastOpened?: string
}

function buildItems(tabs: SwitcherItem[], recentFiles: SwitcherItem[]): SwitcherItem[] {
  const openPaths = new Set(tabs.map((t) => t.path))
  const filteredRecents = recentFiles.filter((r) => !openPaths.has(r.path))
  return [...tabs, ...filteredRecents]
}

export default function QuickSwitcher() {
  const tabs = useAppStore((s) => s.tabs)
  const recentFiles = useAppStore((s) => s.recentFiles)
  const setQuickSwitcherOpen = useAppStore((s) => s.setQuickSwitcherOpen)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const { openFileFromPath } = useFileOpen()

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const items = useMemo<SwitcherItem[]>(() => {
    const tabItems: SwitcherItem[] = tabs.map((t) => ({
      type: 'open-tab',
      id: t.id,
      path: t.path ?? t.id,
      title: t.title,
      subtitle: t.path ?? 'Scratch pad',
    }))

    const recentItems: SwitcherItem[] = recentFiles.map((r) => ({
      type: 'recent-file',
      id: r.path,
      path: r.path,
      title: r.title,
      subtitle: r.path,
      lastOpened: r.lastOpened,
    }))

    return buildItems(tabItems, recentItems)
  }, [tabs, recentFiles])

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: ['title', 'subtitle'],
        threshold: 0.4,
      }),
    [items],
  )

  const results = useMemo(() => {
    if (!query.trim()) return items
    return fuse.search(query).map((r) => r.item)
  }, [query, fuse, items])

  const visibleResults = useMemo(() => results.slice(0, 10), [results])

  const selectItem = useCallback(
    (item: SwitcherItem) => {
      if (item.type === 'open-tab') {
        setActiveTab(item.id)
        setQuickSwitcherOpen(false)
      } else {
        // Recent file — open from disk (openFileFromPath handles duplicate tab detection)
        openFileFromPath(item.path).then(() => setQuickSwitcherOpen(false))
      }
    },
    [setActiveTab, setQuickSwitcherOpen, openFileFromPath],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
        case 'Tab':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % visibleResults.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + visibleResults.length) % visibleResults.length)
          break
        case 'Enter':
          e.preventDefault()
          if (visibleResults[selectedIndex]) {
            selectItem(visibleResults[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          setQuickSwitcherOpen(false)
          break
      }
    },
    [visibleResults, selectedIndex, selectItem, setQuickSwitcherOpen],
  )

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    const activeEl = listRef.current?.querySelector('[data-selected="true"]') as HTMLElement | null
    activeEl?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const emptyMessage =
    items.length === 0
      ? "No files yet"
      : `No files matching '${query}'`

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setQuickSwitcherOpen(false)
      }}
    >
      <div
        className="w-[560px] max-h-[480px] bg-gray-800 rounded-lg shadow-2xl flex flex-col overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        <div className="p-4 border-b border-gray-700">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full bg-gray-700 text-gray-100 text-lg px-3 py-2 rounded outline-none placeholder-gray-400"
          />
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto">
          {visibleResults.length > 0 ? (
            visibleResults.map((item, i) => (
              <button
                key={`${item.type}-${item.id}`}
                data-selected={i === selectedIndex}
                className={`w-full text-left px-4 py-3 flex flex-col gap-0.5 cursor-pointer border-0 transition-colors ${
                  i === selectedIndex
                    ? 'bg-blue-600 text-white'
                    : 'bg-transparent text-gray-200 hover:bg-gray-700'
                }`}
                onMouseDown={() => selectItem(item)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span className="text-sm font-medium truncate">{item.title}</span>
                <span
                  className={`text-xs truncate ${
                    i === selectedIndex ? 'text-blue-200' : 'text-gray-400'
                  }`}
                >
                  {item.subtitle}
                </span>
              </button>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              {emptyMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
