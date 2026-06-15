<div align="center">

<img src="docs/logo.png" alt="MDown logo" width="96" height="96" />

# MDown

**A fast, offline Markdown editor for the desktop — live preview, math, diagrams, and clean export.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built with Tauri](https://img.shields.io/badge/built%20with-Tauri%202-24C8DB.svg)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev)
[![Release](https://img.shields.io/github/v/release/q3alique/mdown?display_name=tag)](https://github.com/q3alique/mdown/releases)

</div>

---

## Demo

![MDown demo](docs/demo.gif)

## Why MDown?

MDown is a lightweight, native desktop Markdown editor that stays out of your way. It opens instantly, works completely offline, and renders everything you throw at it — math, diagrams, code, footnotes — in a live preview next to your text. When you're done, export a clean `.md` or a self-contained `.html`, or merge a stack of documents into one.

No account. No cloud. No telemetry. Just a fast local editor.

## Features

- **Live split preview** — write Markdown on the left, see the rendered result on the right, kept in sync as you type and scroll.
- **Math** — inline and block LaTeX rendered with KaTeX.
- **Diagrams** — Mermaid flowcharts, sequence diagrams, Gantt charts, and more, straight from fenced code blocks.
- **Syntax highlighting** — code blocks highlighted with highlight.js.
- **Rich Markdown** — footnotes, attributes, heading anchors, tables, task lists, and YAML frontmatter.
- **Tabs & document outline** — work across multiple files, with a navigable heading tree that jumps both the preview and the editor to the same spot.
- **Quick switcher** — fuzzy-find and jump between open files and recents (`Ctrl+P`).
- **Export** — emit a clean `.md` or a self-contained styled `.html`, with an optional generated table of contents. Open the exported Markdown in your favourite tool (e.g. Obsidian) to produce a polished PDF with your own theme.
- **Document combiner** — merge several Markdown files into a single document, with an optional cover page and combined table of contents.
- **Export themes** — three built-in styles (Slate, Linen, Scholar) for HTML/print output.
- **Drag & drop** — drop `.md` files onto the window to open them.
- **Offline & standalone** — everything runs locally. No account, no network, no telemetry.

## Download

Prebuilt binaries for Windows are published on the [**Releases**](https://github.com/q3alique/mdown/releases) page:

| Asset | Description |
| --- | --- |
| `MDown_x64-setup.exe` | NSIS installer (recommended) |
| `MDown_x64_en-US.msi` | MSI installer |
| `MDown_standalone_x64.zip` | Standalone executable — unzip and run, no installation |

> Windows needs the [WebView2 runtime](https://developer.microsoft.com/microsoft-edge/webview2/), which is preinstalled on Windows 11 and most up-to-date Windows 10 systems. The installers will fetch it automatically if it is missing.

## Usage

1. **Open a file** — `Ctrl+O`, or drag a `.md` file onto the window. You can also start typing in the scratch tab.
2. **Write & preview** — type in the editor; the preview updates live. Use the **Outline** panel in the sidebar to jump around long documents.
3. **Save** — `Ctrl+S` to save, `Ctrl+Shift+S` to save as.
4. **Export** — `Ctrl+Shift+E` to export the current document as Markdown or HTML, optionally with a table of contents.
5. **Combine** — `Ctrl+Shift+C` to merge multiple documents into one, with an optional cover page and TOC.

Want to try it quickly? The [`samples/`](samples) folder contains a few example documents that exercise math, diagrams, code, and tables.

### Producing a PDF

MDown deliberately doesn't bundle a PDF engine. Instead, export to clean Markdown (or HTML) and open the result in a tool you already trust — for example **Obsidian** — to print or export a PDF with your own theme. This keeps MDown small and gives you full control over the final styling.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl+O` | Open file |
| `Ctrl+S` | Save |
| `Ctrl+Shift+S` | Save as |
| `Ctrl+P` | Quick switcher |
| `Ctrl+Shift+E` | Export (Markdown / HTML) |
| `Ctrl+Shift+C` | Combine documents |
| `Ctrl+,` | Settings |

> On macOS builds, use `Cmd` in place of `Ctrl`.

## Settings

Open with `Ctrl+,`. Preferences are stored locally and persist between sessions.

- **Editor** — font size, line numbers, word wrap, tab size.
- **Appearance** — UI theme (Dark / Light) and editor theme (One Dark / GitHub Light).
- **Export** — default template (Slate / Linen / Scholar) and default page size (A4 / Letter).
- **Preview** — content width (Normal / Wide / Full).

## Building from source

### Prerequisites

| Tool | Notes |
| --- | --- |
| [Node.js](https://nodejs.org/) | LTS (18+). Ships with `npm`. |
| [Rust](https://rustup.rs/) | Stable toolchain via `rustup` (1.77.2 or newer). |
| **Windows build tools** | [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/) with the *Desktop development with C++* workload (provides the MSVC linker). |
| [WebView2 runtime](https://developer.microsoft.com/microsoft-edge/webview2/) | Preinstalled on Windows 11. |

See the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/) for macOS and Linux equivalents.

### Setup

```bash
# 1. Clone
git clone https://github.com/q3alique/mdown.git
cd mdown

# 2. Install frontend dependencies
npm install
```

### Run in development

```bash
npm run tauri dev
```

This launches the app with hot-reload. The first run compiles the Rust backend and may take a few minutes.

### Build a release

```bash
npm run tauri build
```

The build produces:

- the standalone executable at `src-tauri/target/release/app.exe`, and
- installers under `src-tauri/target/release/bundle/` (`msi/` and `nsis/`).

### Other scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server for the frontend only (no native shell). |
| `npm run build` | Type-check and build the frontend bundle. |
| `npm run lint` | Run ESLint over the project. |
| `npm run test` | Run the unit test suite (Vitest). |

## Tech stack

- **[Tauri 2](https://tauri.app)** — native desktop shell (Rust + system WebView).
- **[React 19](https://react.dev)** + **TypeScript** — UI.
- **[Vite](https://vite.dev)** — build tooling.
- **[Tailwind CSS](https://tailwindcss.com)** — styling.
- **[CodeMirror 6](https://codemirror.net)** — editor.
- **[markdown-it](https://github.com/markdown-it/markdown-it)** — Markdown rendering, with KaTeX, Mermaid, highlight.js, footnotes, attrs, and anchor plugins.
- **[Zustand](https://github.com/pmndrs/zustand)** — state management.

## Project structure

```
mdown/
├── src/                  # React frontend
│   ├── components/       # UI (Editor, Renderer, Export, Combiner, …)
│   ├── lib/              # Markdown rendering, export, Tauri command wrappers
│   ├── store/            # Zustand state
│   ├── templates/        # Export/print CSS themes (slate, linen, scholar)
│   └── types/
├── src-tauri/            # Rust backend (Tauri)
│   ├── src/              # Commands (file I/O, file watching)
│   ├── icons/            # App icons
│   └── tauri.conf.json   # Tauri configuration
├── samples/              # Example Markdown documents
└── docs/                 # README assets (logo, demo gif)
```

## Contributing

Issues and pull requests are welcome. For larger changes, please open an issue first to discuss what you'd like to change. Run `npm run lint` and `npm run test` before submitting.

## License

Released under the [MIT License](LICENSE). © 2026 q3alique.
