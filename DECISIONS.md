# MDown — Autonomous Decisions Log

## Decision 1: Scaffold with Vite + add Tauri separately

**Context:** The `npm create tauri-app@latest` command requires an interactive terminal and fails with "not a terminal" when run non-interactively.

**Decision:** Scaffold a Vite + React + TypeScript project using `npm create vite@latest . -- --template react-ts`, then initialize Tauri in the same directory using `cargo tauri init`.

**Alternatives rejected:**
- Manual creation of all project files from scratch (too error-prone)
- Piping answers to `create-tauri-app` stdin (unreliable)

---

## Decision 2: Tailwind CSS v3 with PostCSS (as documented)

**Context:** The latest `tailwindcss` v4 was installed by default (v4.3.1). However, ENVIRONMENT.md and ARCHITECTURE.md explicitly document Tailwind CSS v3 with PostCSS and `autoprefixer`.

**Decision:** Uninstalled Tailwind v4 and `@tailwindcss/vite`, installed `tailwindcss@3`, `postcss`, and `autoprefixer`. Used `npx tailwindcss init -p` to generate config files. Configured `tailwind.config.js` with the content array from ENVIRONMENT.md.

**Alternatives rejected:**
- Using Tailwind v4 with its CSS-based configuration: would deviate from the documented approach
- Using Tailwind v4 with `@tailwindcss/vite` plugin: simpler but creates config incompatibility with the documented approach

---

## Decision 3: MSVC environment setup for Rust compilation

**Context:** The Windows environment had Visual Studio Build Tools installed but their `vcvars64.bat` was not automatically sourced, causing `link.exe` to not be found by Rust.

**Decision:** Manually set `LIB` and `INCLUDE` environment variables and prepend the MSVC `bin\Hostx64\x64` directory to PATH in the PowerShell session before Rust compilation.

**Alternatives rejected:**
- Running `vcvars64.bat` and capturing environment: more complex, less reliable in non-interactive context
- Using the `x86_64-pc-windows-gnu` target: avoids MSVC dependency but could cause compatibility issues with Tauri's native Windows dependencies

---

## Decision 4: Vitest configuration via `vitest/config`

**Context:** The `/// <reference types="vitest" />` directive was not sufficient to make TypeScript recognize the `test` property in `vite.config.ts` when using Vite 8 and Vitest v4.

**Decision:** Import `defineConfig` from `vitest/config` instead of `vite` to get the extended type definitions that include the `test` property.

**Alternatives rejected:**
- Keeping the reference directive and using a separate `vitest.config.ts` file: more files to maintain
- Using `@ts-ignore` or type assertions: fragile
