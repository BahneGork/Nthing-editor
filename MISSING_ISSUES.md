# Missing GitHub Issues - Copy & Paste These

Go to: https://github.com/BahneGork/Nthing-editor/issues/new

Copy each issue below and paste into GitHub.

---

## Issue: Strikethrough Support

**Labels:** `enhancement`, `medium-term`

**Body:**
```
Add rendering support for markdown strikethrough syntax: `~~text~~`

This is part of GitHub Flavored Markdown and commonly requested.

## Acceptance Criteria
- `~~text~~` renders as strikethrough in preview
- Works inline and in paragraphs
- Uses proper HTML `<del>` or `<s>` tags
```

---

## Issue: Smart Formatting Wrapping

**Labels:** `enhancement`, `short-term`

**Body:**
```
When text is selected and the user types formatting characters like `**`, `*`, `_`, `~~`, or `` ` ``, the selection should be wrapped with those characters instead of being replaced.

This is standard behavior in modern editors and makes formatting much faster.

## Example
- User selects "hello world"
- User types `**`
- Result: `**hello world**` (instead of replacing the selection)

## Acceptance Criteria
- Typing `**` wraps selection with bold syntax
- Typing `*` or `_` wraps selection with italic syntax
- Typing `~~` wraps selection with strikethrough syntax
- Typing `` ` `` wraps selection with inline code syntax
- Works in both Editor Mode and Writing Focus Mode (with formatting shown)
```

---

## Issue: Move Lines with Keyboard

**Labels:** `enhancement`, `short-term`

**Body:**
```
Add keyboard shortcuts to move selected lines up or down, similar to VS Code and other modern editors.

## Shortcuts
- `Ctrl+Arrow Up` - Move current line or selection up
- `Ctrl+Arrow Down` - Move current line or selection down

## Acceptance Criteria
- Ctrl+Arrow Up moves line(s) up one position
- Ctrl+Arrow Down moves line(s) down one position
- Works with single line (cursor anywhere on line)
- Works with multiple selected lines
- Maintains selection after move
- Works in both Editor Mode and Writing Focus Mode
```

---

## Issue: File Tree Enhancements

**Labels:** `enhancement`, `medium-term`

**Body:**
```
Enhance the existing file tree sidebar with additional functionality to improve file management workflow.

## Features
1. **Search/Filter** - Search box at top of file tree to filter visible files
2. **Real-time file system watching** - Automatically detect when files are added/removed/renamed (using chokidar)
3. **Right-click context menu**:
   - Reveal in Explorer
   - Copy file path
   - Copy relative path
   - Rename file
   - Delete file (with confirmation)

## Acceptance Criteria
- Search box filters files in real-time
- File tree updates automatically when files change on disk
- Right-click shows context menu with all options
- "Reveal in Explorer" opens file location
- Copy commands copy to clipboard
- Rename and delete operations work safely
```

---

## Issue: Left Sidebar Organization

**Labels:** `enhancement`, `medium-term`

**Body:**
```
Currently, the file tree and outline sidebars occupy the same left-side space and overlap when both are toggled on. Improve this with better organization.

## Proposed Solutions (user setting decides)
1. **Tabbed interface** - File tree and outline as tabs (like VS Code)
2. **Stacked interface** - One above the other in the same sidebar
3. **Auto-exclusive** - Opening one automatically closes the other (document this clearly)

## Acceptance Criteria
- User can choose preferred layout in settings
- No overlapping sidebars
- Smooth transitions when switching
- Layout preference persists across sessions
- Clear visual indication of which sidebar is active
```

---

## Issue: Right Sidebar Organization

**Labels:** `enhancement`, `medium-term`

**Body:**
```
Currently, the minimap and backup history sidebars occupy the same right-side space and overlap when both are toggled on. Apply the same organizational improvements as the left sidebar.

## Proposed Solutions (user setting decides)
1. **Tabbed interface** - Minimap and backups as tabs
2. **Stacked interface** - One above the other in the same sidebar
3. **Auto-exclusive** - Opening one automatically closes the other (document this clearly)

## Acceptance Criteria
- User can choose preferred layout in settings
- No overlapping sidebars
- Smooth transitions when switching
- Layout preference persists across sessions
- Clear visual indication of which sidebar is active
```

---

# Quick Create Instructions

For each issue above:
1. Go to https://github.com/BahneGork/Nthing-editor/issues/new
2. Copy the issue title
3. Copy the body (without the triple backticks if GitHub doesn't support them)
4. Add the labels shown
5. Click "Submit new issue"
6. Repeat for next issue

Should take about 5 minutes total.
