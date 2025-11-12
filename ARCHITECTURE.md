# Nthing Architecture

This document explains how Nthing is structured and how the pieces fit together.

## File Structure

```
main.js         - Electron main process (file I/O, menus, backups, windows)
renderer.js     - UI logic (editor, preview, markdown rendering, user interactions)
index.html      - Main window layout
styles.css      - Main window styling
compare.html    - Backup comparison window layout
compare.js      - Diff algorithm and line restoration
compare.css     - Comparison window styling
```

## Electron Architecture

Nthing uses Electron which has two process types:

**Main Process (main.js)**:
- Runs Node.js with full system access
- Handles file system operations (open, save, backups)
- Creates and manages windows
- Builds application menus
- No direct DOM access

**Renderer Process (renderer.js, compare.js)**:
- Runs in browser context with DOM access
- Handles UI interactions and updates
- Limited system access (must ask main process via IPC)
- Each window has its own renderer process

They communicate via IPC (Inter-Process Communication):
```javascript
// Renderer sends message to main
ipcRenderer.send('save-file', content);

// Main receives and responds
ipcMain.on('save-file', (event, content) => { ... });

// Main sends message to renderer
mainWindow.webContents.send('file-opened', content);

// Renderer receives
ipcRenderer.on('file-opened', (event, content) => { ... });
```

## Key Systems

### Editing Modes

**Editor Mode** (default):
- Split pane with textarea on left, preview on right
- Textarea (`#editor`) is a plain HTML textarea with line numbers overlay
- Preview (`#preview`) renders markdown via marked.js
- Synchronized scrolling tracks scroll position ratio

**Writing Focus Mode**:
- Single pane editor
- When "Show Formatting" is OFF: renders markdown in preview div
- When "Show Formatting" is ON: uses CodeMirror 6 for advanced text editing
- CodeMirror provides better editing features (syntax highlighting, etc.)

**Reader Mode**:
- Preview-only display without editor
- Full-width rendered preview
- No editing functionality - strictly for reading finished documents
- Editor pane and separator hidden via CSS

The mode is controlled by `data-mode` attribute on `.container` div (`data-mode="editor"`, `data-mode="writing"`, or `data-mode="reader"`).

**Default Startup Mode**:
- User-configurable setting that determines initial mode for new windows
- Persisted in `settings.json` in userData directory
- Sent to renderer via IPC on window load (`set-initial-mode` message)
- Configurable via View → Default Startup Mode menu

### File Management

**Opening files** (5 methods):
1. File menu → main.js opens dialog → sends content to renderer
2. Recent files menu → main.js loads file → sends to renderer
3. Drag & drop → renderer detects drop → asks main to open
4. Double-click in Explorer → OS passes file path → main opens it
5. Command line arg → main.js checks `process.argv[2]` on startup

**Saving files**:
- Renderer sends content to main via IPC
- Main writes file to disk
- Main creates backup after successful save
- Main updates recent files list

### Backup System

Located in main.js (lines ~200-550):

**Creating backups**:
1. Calculate MD5 hash of file content
2. Check if hash exists in metadata.json
3. If new hash, save backup as `.nthing-history/[filename]/v###.md`
4. Update metadata.json with timestamp, size, word count
5. Keep only last 10 backups (delete oldest if needed)

**Storage structure**:
```
myfile.md
.nthing-history/
  myfile.md/
    v001.md
    v002.md
    v003.md
    metadata.json
```

**metadata.json format**:
```json
{
  "v001": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "hash": "abc123...",
    "size": 1234,
    "wordCount": 567
  }
}
```

**Viewing backups**:
- Sidebar shows list from metadata.json
- Click "Preview" button → opens compare.html in new window
- Main sends both current and backup content to compare window

### Backup Comparison & Restoration

Located in compare.js:

**Diff algorithm**:
- Split both files into lines
- Compare line-by-line from start to end
- Classify each line: unchanged, removed, added, or modified
- Display with color coding: red (removed), green (added), white (unchanged)

**Interactive restoration**:
- Click arrow next to green lines to select them
- Selected lines appear in left pane (preview of what you'll get)
- "Finalize Restoration" button sends selected lines back to main window
- Main window reconstructs content with selected lines inserted

**Full restoration**:
- "Restore Full Backup" replaces entire file
- Shows confirmation dialog first

### Search & Replace

Located in renderer.js (lines ~500-700):

**Finding matches**:
- Uses regex search on textarea content
- Builds regex from search text + options (case sensitive, whole word)
- Finds all matches and stores positions
- Highlights matches using an overlay div positioned over textarea

**Draggable dialog**:
- Mousedown on header starts drag
- Mousemove updates position (within window bounds)
- Position stored in memory (not persisted)

### Synchronized Scrolling

Located in renderer.js (lines ~750-900):

**How it works**:
- Calculate scroll percentage: `scrollTop / (scrollHeight - clientHeight)`
- Apply same percentage to other pane
- Works bidirectionally (editor → preview and preview → editor)
- Uses throttling to prevent scroll loops
- Line numbers scroll with editor

### Images

Located in renderer.js (lines ~300-400):

**Paste from clipboard**:
- Listen for paste event on textarea
- Check `event.clipboardData` for image items
- Convert to blob → save to `images/` folder with timestamp
- Insert markdown: `![](images/image-timestamp.png)`

**Drag & drop**:
- Listen for drop event on textarea
- Check if dragged file is an image
- Copy to `images/` folder
- Insert markdown

### Autosave

Located in renderer.js (lines ~1200-1300):

**How it works**:
- When enabled, sets interval timer (60000ms for 1 min, etc.)
- On each tick, checks if content has changed since last save
- If changed, sends save request to main
- Status indicator shows "Autosaving..." then "Autosaved"
- Settings stored in localStorage to persist between sessions

### Resizable Panes

Located in renderer.js (lines ~1885-1951):

**Draggable separator**:
- 5px div between editor and preview panes
- Mousedown on separator starts drag
- Mousemove calculates percentage based on mouse X position
- Updates editor pane's `flex-basis` CSS property
- Constrained to 20%-80% (prevent panes from getting too small)
- Position saved to localStorage, restored on startup

### Markdown Rendering

Located in renderer.js (lines ~100-200):

**Rendering pipeline**:
1. Get textarea content
2. Pass to marked.js parser
3. Marked returns HTML string
4. Scan for code blocks and apply highlight.js
5. Insert HTML into preview div

**Why marked.js?**:
- Lightweight GitHub Flavored Markdown (GFM) parser
- Supports tables, strikethrough, task lists
- Extensible with custom renderers

## Important Code Locations

### main.js
- File operations: lines 50-150
- Backup system: lines 200-550
- Menu creation: lines 600-850
- IPC handlers: lines 900-1250
- Recent files: lines 150-200

### renderer.js
- Markdown rendering: lines 100-200
- Image handling: lines 300-400
- Search & replace: lines 500-700
- Scroll sync: lines 750-900
- Editor mode switching: lines 1000-1100
- Autosave: lines 1200-1300
- Backup sidebar: lines 1400-1600
- Drag & drop files: lines 1850-1880
- Resizable panes: lines 1885-1951

### compare.js
- Diff algorithm: lines 50-150
- Line restoration UI: lines 150-250
- IPC communication: lines 10-50

## State Management

Nthing doesn't use a formal state management library. State is tracked in:

**Global variables in renderer.js**:
```javascript
let currentFilePath = null;      // Currently open file
let hasUnsavedChanges = false;   // Dirty flag
let codemirrorView = null;       // CodeMirror instance (if active)
let syncScrolling = true;        // Scroll sync enabled?
let autosaveInterval = null;     // Autosave timer
```

**localStorage** (persists between sessions):
- `recentFiles` - Array of recent file paths
- `autosaveEnabled` - Boolean
- `autosaveInterval` - Number (minutes)
- `editorSplitPosition` - Number (percentage)

**settings.json** (in Electron userData directory):
- `defaultStartupMode` - String ("editor", "writing", or "reader")
- `autosave` - Object with enabled/interval/persistent settings
- `versioning` - Object with backup system configuration

**DOM data attributes**:
- `.container[data-mode]` - Current editing mode ("editor", "writing", or "reader")

## Adding New Features

**To add a file operation** (open, save, export):
1. Add IPC handler in main.js to do the file operation
2. Add IPC sender in renderer.js triggered by UI
3. Update menu in main.js if needed

**To add a UI feature**:
1. Add HTML elements to index.html
2. Add CSS styling to styles.css
3. Add event listeners in renderer.js
4. If needs file system, communicate with main via IPC

**To add a markdown feature**:
1. Check if marked.js supports it (it probably does)
2. If not, add marked.js extension
3. Update CSS for preview styling if needed

## Common Pitfalls

**Don't access file system from renderer**:
❌ `fs.readFileSync()` in renderer.js won't work in packaged app
✅ Send IPC message to main.js to read file

**CodeMirror memory leak**:
When switching from "Show Formatting" to rendered view, must call `codemirrorView.destroy()` to clean up properly.

**Scroll sync infinite loop**:
When updating scroll position programmatically, disable scroll listeners temporarily to prevent feedback loop.

**Backup hash collision**:
MD5 hashes are used for deduplication. Extremely unlikely to collide for text files, but technically possible.

## Performance Notes

**Large files**:
- Markdown rendering is synchronous and can freeze UI on very large files (>10MB)
- Consider debouncing preview updates for large documents
- Backup system keeps full copies (not diffs), so large files = large backups

**Memory usage**:
- CodeMirror instance stays in memory even when not visible
- Destroyed and recreated on mode switch to save memory
- Preview HTML kept in DOM at all times in Editor mode

## Security Considerations

**No input sanitization**:
Nthing is a local desktop app, not a web app. Users control all input (files, text).
HTML injection in preview is safe since it's just displaying your own markdown.

**File permissions**:
Electron app runs with full user permissions. Can read/write any file the user can access.

## Testing

Currently no automated tests. Testing is manual:
1. Open various markdown files
2. Test each feature (save, backups, search, modes, etc.)
3. Test edge cases (very long lines, special characters, etc.)
4. Test on Windows (primary target platform)

Could add:
- Unit tests for diff algorithm (compare.js)
- Unit tests for backup system (main.js)
- Integration tests with Spectron (Electron testing framework)
