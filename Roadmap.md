# Nthing Roadmap

Things I'm thinking about adding:

## Recently Completed

- ✅ **Outline/TOC sidebar** - Implemented in v1.11.0 (Ctrl+Shift+O)
- ✅ **File tree sidebar** - Implemented in v1.12.0 (Ctrl+Shift+E)
- ✅ **Multiple windows** - Implemented in v1.12.0 (Ctrl+Shift+N)
- ✅ **HTML file support** - Implemented in v1.12.0

## Short term (probably next)

- **Export to PDF/HTML** - should be straightforward with Electron's print API
- **Interactive task lists** - `- [ ]` checkboxes that actually work in the preview
- **Dark theme** - people keep asking about this
- **Smart formatting wrapping** - typing `**` around selected text should wrap it instead of replacing it
- **Move lines with keyboard** - Ctrl+Arrow Up/Down to move selected lines (like VS Code)

## Medium term (would be nice)

- **File tree enhancements**:
  - Search/filter files in tree
  - Real-time file system watching with chokidar
  - Right-click context menu (reveal in explorer, copy path, etc.)
- **Left sidebar organization** - Outline and file tree as tabs and/or stacked (user setting decides which layout)
- **Right sidebar organization** - Minimap and backups as tabs and/or stacked (user setting decides which layout)
- **Strikethrough support** - `~~text~~` rendering

## Long term (maybe)

- **Math equations** - LaTeX/KaTeX for academic writing
- **Diagram support** - Mermaid for flowcharts and stuff
- **Export to Word** - .docx export, probably need pandoc for this

## Philosophy

The goal is to keep it simple. Not trying to compete with full IDEs or bloated editors. Just want a clean markdown editor that doesn't get in the way.

If you want something specific, open an issue. Or submit a PR if you're feeling adventurous.
