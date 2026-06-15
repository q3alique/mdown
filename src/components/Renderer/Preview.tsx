import { useRef, useEffect, useCallback } from 'react'
import { renderMarkdown, handlePreviewClick } from '../../lib/markdown'
import { useAppStore } from '../../store'

interface PreviewProps {
  content: string
}

export default function Preview({ content }: PreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null)
  const setHeadings = useAppStore((s) => s.setHeadings)
  const previewWidth = useAppStore((s) => s.settings.previewWidth)

  const maxWidthClass =
    previewWidth === 'normal'
      ? 'max-w-[800px]'
      : previewWidth === 'wide'
        ? 'max-w-[1100px]'
        : 'max-w-none'

  useEffect(() => {
    if (!previewRef.current) return
    if (!content) {
      previewRef.current.innerHTML = '<p class="text-gray-500 italic">Preview is empty</p>'
      setHeadings([])
      return
    }

    const result = renderMarkdown(content)
    previewRef.current.innerHTML = result.html
    setHeadings(result.headings)
  }, [content, setHeadings])

  const onClick = useCallback((e: MouseEvent) => {
    handlePreviewClick(e)
  }, [])

  useEffect(() => {
    const el = previewRef.current
    if (!el) return
    el.addEventListener('click', onClick)
    return () => el.removeEventListener('click', onClick)
  }, [onClick])

  return (
    <div className="flex-1 overflow-auto" data-preview-scroller="1">
      <div
        ref={previewRef}
        data-testid="preview-content"
        className={`${maxWidthClass} mx-auto px-8 py-6 text-gray-300 text-sm leading-relaxed preview-default`}
      />
    </div>
  )
}
