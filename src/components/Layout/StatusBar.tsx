import { useAppStore } from '../../store'

interface StatusBarProps {
  filename: string
}

export default function StatusBar({ filename }: StatusBarProps) {
  const cursorPosition = useAppStore((s) => s.cursorPosition)
  const statusMessage = useAppStore((s) => s.statusMessage)

  return (
    <footer className="h-6 bg-gray-800 border-t border-gray-700 flex items-center px-4 text-xs text-gray-400 shrink-0">
      {/* Left: active filename */}
      <span data-testid="status-filename" className="truncate">
        {filename}
      </span>

      {/* Center spacer */}
      <div className="flex-1" />
      {statusMessage && (
        <span data-testid="status-message" className="text-green-400 mr-4">
          {statusMessage}
        </span>
      )}

      {/* Center: word count */}
      {!statusMessage && (
        <span data-testid="status-wordcount" className="mr-4">
          {cursorPosition.wordCount} words
        </span>
      )}

      {/* Right: cursor position */}
      <span data-testid="status-cursor">
        Ln {cursorPosition.line}, Col {cursorPosition.col}
      </span>
    </footer>
  )
}
