import { useCallback, useRef, useEffect, useMemo } from 'react'
import CodeMirror, { type ReactCodeMirrorRef, type Statistics } from '@uiw/react-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { lineNumbers } from '@codemirror/view'
import { syntaxHighlighting, defaultHighlightStyle, HighlightStyle, indentUnit } from '@codemirror/language'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView, keymap, drawSelection, dropCursor } from '@codemirror/view'
import { defaultKeymap, historyKeymap, insertTab, indentLess } from '@codemirror/commands'
import { searchKeymap } from '@codemirror/search'
import { completionKeymap } from '@codemirror/autocomplete'
import { tags } from '@lezer/highlight'
import { countWords } from '../../utils/wordCount'
import { useAppStore } from '../../store'
import { fsWriteFile } from '../../lib/tauri-commands'
import type { CursorPosition } from '../../types'

// GitHub Light theme — built from CodeMirror primitives, no extra package needed
const githubLightEditorTheme = EditorView.theme(
  {
    '&': { backgroundColor: '#ffffff', color: '#24292e' },
    '.cm-content': { caretColor: '#24292e' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#24292e' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: '#0366d625',
    },
    '.cm-gutters': {
      backgroundColor: '#f6f8fa',
      color: '#6a737d',
      borderRight: '1px solid #e1e4e8',
    },
    '.cm-activeLineGutter': { backgroundColor: '#e8f0fe' },
    '.cm-activeLine': { backgroundColor: '#f1f8ff' },
    '.cm-matchingBracket': { backgroundColor: '#c8e1ff', outline: 'none' },
  },
  { dark: false },
)

const githubLightHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#d73a49' },
  { tag: tags.comment, color: '#6a737d', fontStyle: 'italic' },
  { tag: tags.string, color: '#032f62' },
  { tag: tags.number, color: '#005cc5' },
  { tag: tags.bool, color: '#005cc5' },
  { tag: tags.null, color: '#005cc5' },
  { tag: tags.heading, color: '#005cc5', fontWeight: 'bold' },
  { tag: tags.url, color: '#032f62', textDecoration: 'underline' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.link, color: '#032f62' },
  { tag: tags.typeName, color: '#6f42c1' },
  { tag: tags.function(tags.variableName), color: '#6f42c1' },
  { tag: tags.operator, color: '#d73a49' },
  { tag: tags.punctuation, color: '#24292e' },
  { tag: tags.meta, color: '#6a737d' },
])

interface EditorProps {
  tabId: string
}

export default function Editor({ tabId }: EditorProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null)
  const updateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const tab = useAppStore((s) => s.tabs.find((t) => t.id === tabId))
  const updateContent = useAppStore((s) => s.updateContent)
  const settings = useAppStore((s) => s.settings)
  const setEditorView = useAppStore((s) => s.setEditorView)

  const initialContent = tab?.content ?? ''

  // Save handler: called on Ctrl+S
  const handleSave = useCallback(async () => {
    const store = useAppStore.getState()
    const tab = store.tabs.find((t) => t.id === tabId)
    if (!tab) return

    if (tab.type === 'scratch') {
      store.setScratchContent(tab.content)
      store.setStatusMessage('Scratch pad saved')
      setTimeout(() => store.setStatusMessage(null), 3000)
      return
    }

    // File-backed tab — write to disk
    if (!tab.path) {
      store.setStatusMessage('Cannot save: file has no path')
      setTimeout(() => store.setStatusMessage(null), 3000)
      return
    }

    try {
      await fsWriteFile(tab.path, tab.content, tab.lineEnding)
      store.markSaved(tabId)
      store.setStatusMessage(`Saved ${tab.title}`)
      setTimeout(() => store.setStatusMessage(null), 3000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      store.setStatusMessage(`Save failed: ${msg}`)
      console.error('Save error:', err)
      setTimeout(() => store.setStatusMessage(null), 5000)
    }
  }, [tabId])

  // Debounced content change → Zustand
  const handleChange = useCallback(
    (value: string) => {
      // Immediately update Zustand (for Ctrl+S)
      updateContent(tabId, value)

      // Debounced onContentChange (100ms) — can be used for preview updates
      if (updateTimer.current) clearTimeout(updateTimer.current)
      updateTimer.current = setTimeout(() => {
        // Future: trigger preview update here
      }, 100)
    },
    [tabId, updateContent],
  )

  // Handle statistics (cursor position)
  const handleStatistics = useCallback(
    (data: Statistics) => {
      const content = tab?.content ?? ''
      const lineNum = data.line.number
      const head = data.selectionAsSingle.head
      const col = head - data.line.from + 1

      const cursorPos: CursorPosition = {
        line: lineNum,
        col,
        wordCount: countWords(content),
        charCount: content.length,
      }
      useAppStore.getState().updateCursorPosition(cursorPos)
    },
    [tab?.content],
  )

  // Custom keybindings
  const customKeymap = useMemo(
    () =>
      keymap.of([
        {
          key: 'Ctrl-s',
          run: () => {
            handleSave()
            return true
          },
        },
        {
          key: 'Ctrl-/',
          run: (view) => {
            // Toggle line comment — insert <!-- at line start or remove it
            const { state, dispatch } = view
            const line = state.doc.lineAt(state.selection.main.head)
            const lineText = line.text
            const trimmed = lineText.trimStart()
            const indent = lineText.length - trimmed.length
            const commentStart = '<!-- '
            const commentEnd = ' -->'

            if (trimmed.startsWith(commentStart) && trimmed.endsWith(commentEnd)) {
              // Uncomment
              const newContent = lineText.slice(0, indent) + trimmed.slice(commentStart.length, -commentEnd.length)
              dispatch({
                changes: { from: line.from, to: line.to, insert: newContent },
              })
            } else {
              // Comment
              const newContent = lineText.slice(0, indent) + commentStart + trimmed + commentEnd
              dispatch({
                changes: { from: line.from, to: line.to, insert: newContent },
              })
            }
            return true
          },
        },
        // Tab / Shift-Tab — use CodeMirror's built-ins so a multi-line
        // selection indents every line (and Shift-Tab dedents) instead of
        // being replaced. The indent unit (spaces vs. width) is set via the
        // indentUnit facet in `extensions`.
        { key: 'Tab', run: insertTab, shift: indentLess },
      ]),
    [handleSave],
  )

  // Extensions — vary by theme so the highlight style matches
  const extensions = useMemo(() => {
    const isGithubLight = settings.editorTheme === 'github-light'
    return [
      markdown({ base: markdownLanguage }),
      lineNumbers(),
      indentUnit.of(' '.repeat(settings.tabSize || 2)),
      isGithubLight
        ? syntaxHighlighting(githubLightHighlightStyle)
        : syntaxHighlighting(defaultHighlightStyle),
      drawSelection(),
      dropCursor(),
      settings.wordWrap ? EditorView.lineWrapping : [],
      customKeymap,
      keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, ...completionKeymap]),
    ].flat()
  }, [settings.wordWrap, settings.editorTheme, settings.tabSize, customKeymap])

  // Expose the live EditorView to the store so ContentArea can use its line
  // geometry for content-based scroll sync. Clear it on unmount.
  const handleCreateEditor = useCallback(
    (view: EditorView) => {
      setEditorView(view)
    },
    [setEditorView],
  )

  // Clean up timer + drop the view reference
  useEffect(() => {
    return () => {
      if (updateTimer.current) clearTimeout(updateTimer.current)
      setEditorView(null)
    }
  }, [setEditorView])

  return (
    <div className="h-full overflow-auto" style={{ fontSize: settings.fontSize }}>
      <CodeMirror
        ref={editorRef}
        value={initialContent}
        onChange={handleChange}
        onStatistics={handleStatistics}
        onCreateEditor={handleCreateEditor}
        extensions={extensions}
        theme={settings.editorTheme === 'one-dark' ? oneDark : githubLightEditorTheme}
        basicSetup={false}
        height="100%"
        width="100%"
      />
    </div>
  )
}
