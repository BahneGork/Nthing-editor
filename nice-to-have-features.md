# Nice-to-Have Features

This document tracks potential features for Nthing, inspired by Typora and other popular markdown editors.

## Tier 1 - Must Have (Essential Features)

### ✅ Tables
- **Status**: Implemented (Ctrl+T)
- GitHub Flavored Markdown table syntax
- Insert table template with keyboard shortcut

### ✅ Images
- **Status**: Implemented
- Paste from clipboard (Ctrl+V)
- Drag & drop from file explorer
- Auto-saves to `images/` folder
- Inline image display in preview

### ❌ Export Functionality
- **Priority**: High
- Export to PDF
- Export to HTML
- Export to Word (.docx)
- Export to other formats (Markdown, plain text)
- Users need to share/publish their work

---

## Tier 2 - Very Useful (Competitive Features)

### ❌ Outline/TOC Panel
- **Priority**: High
- Automatic document outline from headers
- Click headers to jump to sections
- Essential for navigating long documents
- Could be a collapsible sidebar

### ❌ File Tree Sidebar
- **Priority**: Medium-High
- Browse multiple markdown files in a folder
- Multi-file workspace
- Quick file switching
- Currently only handles one file at a time

### ❌ Task Lists
- **Priority**: Medium
- Checkbox support: `- [ ]` and `- [x]`
- Interactive checkboxes in preview
- Very popular feature in modern markdown editors
- Used for todo lists, project tracking

### ❌ Strikethrough
- **Priority**: Low-Medium
- Support `~~strikethrough~~` syntax
- Standard GFM feature
- Simple to implement

---

## Tier 3 - Nice to Have (Quality of Life)

### ❌ Custom Themes
- **Priority**: Medium
- Light/dark mode toggle
- User-selectable color schemes
- CSS customization
- We briefly discussed dark theme for title bar

### ✅ Focus Mode
- **Status**: Implemented
- Dim/hide all paragraphs except current one
- Different from our Writing Focus mode
- Reduces distractions
- Good for writers
- Available in both Editor and Writing Focus modes

### ✅ Typewriter Mode
- **Status**: Implemented
- Keep current line vertically centered
- Reduces eye movement up/down
- Popular with long-form writers
- Available in both Editor and Writing Focus modes

### ❌ Math Support (LaTeX)
- **Priority**: Low (unless targeting academic users)
- Inline math: `$E=mc^2$`
- Block math: `$$...$$`
- Important for academic/technical writing
- Requires KaTeX or MathJax integration

### ❌ Diagrams (Mermaid)
- **Priority**: Low
- Flowcharts, sequence diagrams, etc.
- Mermaid diagram syntax support
- Useful for technical documentation
- Requires mermaid.js integration

### ❌ Footnotes
- **Priority**: Low
- Footnote syntax support
- Automatic numbering
- Jump to footnote references

### ❌ Definition Lists
- **Priority**: Very Low
- Markdown extension for definitions
- Not commonly used

### ❌ Superscript/Subscript
- **Priority**: Very Low
- `H~2~O` for subscript
- `x^2^` for superscript
- Useful for scientific writing

### ✅ File Versioning / Local History (Note Backups)
- **Status**: Implemented (v1.9.0)
- Keeps up to 10 versions per file
- Backups created automatically on save (with MD5 deduplication)
- Stored in `.nthing-history/` folder next to markdown file
- UI sidebar to browse versions (Ctrl+Shift+H)
- Shows timestamp, file size, and word count for each backup
- Visual diff window with color-coded changes (red/green/white)
- Two restoration modes: full backup or interactive line-by-line
- Manual snapshot creation via File menu
- Safety net against accidental deletions/overwrites

---

## Feature Comparison with Typora

**What Nthing has that Typora doesn't:**
- ✅ Wikilinks `[[internal links]]` (Obsidian-style)
- ✅ Hashtags `#tags` with styling
- ✅ YAML frontmatter support
- ✅ Dual mode: Editor (split) + Writing Focus (single pane)
- ✅ F9 quick toggle between modes
- ✅ Code syntax highlighting (highlight.js)
- ✅ Custom title bar
- ✅ Draggable Find dialog

**What Typora has that we're missing:**
- Export functionality (PDF, HTML, Word)
- Outline panel for navigation
- File tree sidebar
- Math support
- Diagram support
- Themes/customization

**What we've added since:**
- ✅ Focus Mode (dim other paragraphs)
- ✅ Typewriter Mode
- ✅ Note backup system with visual diff and restoration
- ✅ Draggable separator for resizing editor/preview panes

---

## Implementation Notes

### Quick Wins (Easy to Implement)
1. **Strikethrough** - Already supported by GFM, just needs CSS
2. **Task lists** - Marked.js supports this, needs checkbox styling
3. **Footnotes** - Marked.js extension available

### Medium Complexity
1. **Export to HTML** - We already render HTML, just need to save it
2. **Export to PDF** - Can use Electron's print-to-PDF API
3. **Outline panel** - Parse headers from markdown, create sidebar
4. **Light/dark themes** - CSS variables and theme switching

### High Complexity
1. **File tree sidebar** - File system watching, state management
2. **Math support** - Integrate KaTeX library
3. **Diagrams** - Integrate Mermaid.js
4. **Export to Word** - Requires pandoc or similar conversion tool

---

## Recommended Implementation Order

1. **Export to HTML/PDF** (completes Tier 1 essentials)
2. **Task lists** (quick win, very popular)
3. **Outline panel** (major UX improvement for long docs)
4. **Light/dark theme** (polish, user preference)
5. **File tree sidebar** (bigger project, enables multi-file workflow)
6. Everything else based on user feedback

---

## Notes

- Focus should remain on **distraction-free writing**
- Don't bloat the UI - keep it clean and minimal
- Features should be discoverable but not intrusive
- Consider user preferences/settings for toggling features
- Obsidian compatibility is a unique selling point - maintain it
