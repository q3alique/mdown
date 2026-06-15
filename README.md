<div align="center">

<img src="docs/logo.png" alt="MDown logo" width="96" height="96" />

# MDown

**A fast, offline Markdown editor for the desktop — live preview, math, diagrams, and clean export.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built with Tauri](https://img.shields.io/badge/built%20with-Tauri%202-24C8DB.svg)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev)

</div>

---

## Demo

![MDown demo](docs/demo.gif)

> Replace `docs/demo.gif` with your recording (or drop the GIF in the `docs/` folder under that name and it will show up here automatically).

## Features

- **Live split preview** — write Markdown on the left, see the rendered result on the right, kept in sync as you type and scroll.
- **Math** — inline and block LaTeX rendered with KaTeX.
- **Diagrams** — Mermaid flowcharts, sequence diagrams, Gantt charts, and more, straight from fenced code blocks.
- **Syntax highlighting** — code blocks highlighted with highlight.js.
- **Rich Markdown** — footnotes, attributes, heading anchors, tables, task lists, and YAML frontmatter.
- **Document outline** — a navigable heading tree in the sidebar that jumps both the preview and the editor to the same spot.
- **Quick switcher** — fuzzy-find and jump between recent files.
- **Export** — emit a clean `.md` or a self-contained styled `.html`, with an optional generated table of contents. Open the exported Markdown in your favourite tool (e.g. Obsidian) to produce a polished PDF with your own theme.
- **Document combiner** — merge several Markdown files into a single document, with an optional cover page and combined table of contents.
- **Export themes** — choose between three built-in styles (Slate, Linen, Scholar) for HTML/print output.
- **Offline & standalone** — everything runs locally. No account, no network, no telemetry.

## Download

Prebuilt binaries for Windows are published on the [**Releases**](https://github.com/q3alique/mdown/releases) page:

- **Installer (recommended)** — `MDown_x64-setup.exe` (NSIS) or `MDown_x64_en-US.msi`.
- **Standalone executable** — `app.exe`, runs without installation.

> Windows needs the [WebView2 runtime](https://developer.microsoft.com/microsoft-edge/webview2/), which is preinstalled on Windows 11 and most up-to-date Windows 10 systems. The installers will fetch it automatically if it is missing.

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
└── docs/                 # README assets (logo, demo gif)
```

## License

Released under the [MIT License](LICENSE). © 2026 q3alique.
