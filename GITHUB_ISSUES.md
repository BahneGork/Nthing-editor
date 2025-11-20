# GitHub Issues for Roadmap

Copy-paste these into GitHub Issues. Assign labels: `enhancement` and the appropriate term label.

---

## Issue 1: Export to PDF/HTML

**Labels:** `enhancement`, `short-term`

**Description:**
Add the ability to export documents to PDF and HTML formats using Electron's print API.

This should be straightforward since Electron provides native printing capabilities. Users should be able to export their rendered markdown to:
- PDF files
- HTML files (with CSS styling preserved)

**Acceptance Criteria:**
- File menu has "Export to PDF" option
- File menu has "Export to HTML" option
- PDF export includes proper formatting and styling
- HTML export is standalone (CSS embedded)

---

## Issue 2: Outline/TOC Sidebar ✅ COMPLETED

**Labels:** `enhancement`, `short-term`
**Status:** Completed in v1.11.0

**Description:**
Add a collapsible sidebar that displays an outline/table of contents parsed from markdown headers (H1-H6).

Clicking a header in the outline should jump to that section in both the editor and preview panes.

**Acceptance Criteria:**
- Sidebar shows all headers in hierarchical structure
- Clicking a header scrolls to that section
- Outline updates in real-time as user types
- Sidebar can be toggled on/off

---

## Issue 3: Interactive Task Lists

**Labels:** `enhancement`, `short-term`

**Description:**
Make markdown task list checkboxes (`- [ ]` and `- [x]`) actually clickable in the preview pane.

Clicking a checkbox should update the markdown source automatically.

**Acceptance Criteria:**
- Task list checkboxes are clickable in preview
- Clicking updates the markdown source
- Changes are reflected immediately
- Works with nested task lists

---

## Issue 4: Dark Theme

**Labels:** `enhancement`, `medium-term`

**Description:**
Add a dark theme option - people keep asking for this.

Should include:
- Dark editor background
- Dark preview pane
- Proper syntax highlighting colors for dark mode
- Dark title bar and menus
- Toggle between light/dark mode

**Acceptance Criteria:**
- View menu has "Dark Mode" toggle
- All UI elements support dark theme
- Theme preference is saved
- Smooth transition between themes

---

## Issue 5: File Tree Sidebar ✅ COMPLETED

**Labels:** `enhancement`, `medium-term`
**Status:** Completed in v1.12.0

**Description:**
Add a file tree sidebar for working with multiple markdown files in a folder.

Users should be able to:
- Browse markdown files in current folder
- Switch between files quickly
- See folder structure
- Open files by clicking

**Acceptance Criteria:**
- Sidebar shows folder structure
- Filters to .md, .markdown, .txt files
- Double-click to open file
- Shows current file highlighted
- Can be toggled on/off

---

## Issue 6: Strikethrough Support

**Labels:** `enhancement`, `medium-term`

**Description:**
Add rendering support for markdown strikethrough syntax: `~~text~~`

This is part of GitHub Flavored Markdown and commonly requested.

**Acceptance Criteria:**
- `~~text~~` renders as strikethrough in preview
- Works inline and in paragraphs
- Uses proper HTML `<del>` or `<s>` tags

---

## Issue 7: Math Equations (LaTeX/KaTeX)

**Labels:** `enhancement`, `long-term`

**Description:**
Add support for math equations using LaTeX syntax rendered with KaTeX.

Useful for academic writing, technical documentation, and scientific notes.

Syntax could be:
- Inline: `$equation$`
- Block: `$$equation$$`

**Acceptance Criteria:**
- Inline math renders correctly
- Block math renders correctly
- Uses KaTeX for fast rendering
- Fallback for syntax errors

---

## Issue 8: Diagram Support (Mermaid)

**Labels:** `enhancement`, `long-term`

**Description:**
Add support for Mermaid diagrams - flowcharts, sequence diagrams, gantt charts, etc.

Users can write diagram definitions in code blocks and see them rendered in the preview.

**Acceptance Criteria:**
- Mermaid code blocks render as diagrams
- Supports flowcharts, sequence diagrams, etc.
- Syntax errors shown gracefully
- Diagrams are properly styled

---

## Issue 9: Export to Word (.docx)

**Labels:** `enhancement`, `long-term`

**Description:**
Add ability to export documents to Microsoft Word format (.docx).

This will likely require integrating pandoc or similar conversion tool.

**Acceptance Criteria:**
- File menu has "Export to Word" option
- Markdown formatting is preserved
- Images are embedded
- Tables render correctly
- Headings use Word heading styles

---

## Issue 10: Smart Formatting Wrapping

**Labels:** `enhancement`, `short-term`

**Description:**
When text is selected and the user types formatting characters like `**`, `*`, `_`, `~~`, or `` ` ``, the selection should be wrapped with those characters instead of being replaced.

This is standard behavior in modern editors and makes formatting much faster.

**Example:**
- User selects "hello world"
- User types `**`
- Result: `**hello world**` (instead of replacing the selection)

**Acceptance Criteria:**
- Typing `**` wraps selection with bold syntax
- Typing `*` or `_` wraps selection with italic syntax
- Typing `~~` wraps selection with strikethrough syntax
- Typing `` ` `` wraps selection with inline code syntax
- Works in both Editor Mode and Writing Focus Mode (with formatting shown)

---

## Issue 11: Move Lines with Keyboard

**Labels:** `enhancement`, `short-term`

**Description:**
Add keyboard shortcuts to move selected lines up or down, similar to VS Code and other modern editors.

**Shortcuts:**
- `Ctrl+Arrow Up` - Move current line or selection up
- `Ctrl+Arrow Down` - Move current line or selection down

**Acceptance Criteria:**
- Ctrl+Arrow Up moves line(s) up one position
- Ctrl+Arrow Down moves line(s) down one position
- Works with single line (cursor anywhere on line)
- Works with multiple selected lines
- Maintains selection after move
- Works in both Editor Mode and Writing Focus Mode

---

## Issue 12: File Tree Enhancements

**Labels:** `enhancement`, `medium-term`

**Description:**
Enhance the existing file tree sidebar with additional functionality to improve file management workflow.

**Features:**
1. **Search/Filter** - Search box at top of file tree to filter visible files
2. **Real-time file system watching** - Automatically detect when files are added/removed/renamed (using chokidar)
3. **Right-click context menu**:
   - Reveal in Explorer
   - Copy file path
   - Copy relative path
   - Rename file
   - Delete file (with confirmation)

**Acceptance Criteria:**
- Search box filters files in real-time
- File tree updates automatically when files change on disk
- Right-click shows context menu with all options
- "Reveal in Explorer" opens file location
- Copy commands copy to clipboard
- Rename and delete operations work safely

---

## Issue 13: Left Sidebar Organization

**Labels:** `enhancement`, `medium-term`

**Description:**
Currently, the file tree and outline sidebars occupy the same left-side space and overlap when both are toggled on. Improve this with better organization.

**Proposed Solutions (user setting decides):**
1. **Tabbed interface** - File tree and outline as tabs (like VS Code)
2. **Stacked interface** - One above the other in the same sidebar
3. **Auto-exclusive** - Opening one automatically closes the other (document this clearly)

**Acceptance Criteria:**
- User can choose preferred layout in settings
- No overlapping sidebars
- Smooth transitions when switching
- Layout preference persists across sessions
- Clear visual indication of which sidebar is active

---

## Issue 14: Right Sidebar Organization

**Labels:** `enhancement`, `medium-term`

**Description:**
Currently, the minimap and backup history sidebars occupy the same right-side space and overlap when both are toggled on. Apply the same organizational improvements as the left sidebar.

**Proposed Solutions (user setting decides):**
1. **Tabbed interface** - Minimap and backups as tabs
2. **Stacked interface** - One above the other in the same sidebar
3. **Auto-exclusive** - Opening one automatically closes the other (document this clearly)

**Acceptance Criteria:**
- User can choose preferred layout in settings
- No overlapping sidebars
- Smooth transitions when switching
- Layout preference persists across sessions
- Clear visual indication of which sidebar is active
