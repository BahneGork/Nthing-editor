# Nthing

A distraction-free markdown editor where nothing else matters. Built with Electron for a clean, focused writing experience.

## Features

### Core Editing
- **Two editing modes**: Editor Mode (split-pane with preview) and Writing Focus Mode (distraction-free)
- **Editor Mode**: Line numbers, raw source code, live preview with synchronized scrolling
- **Writing Focus Mode**: Wider margins, larger serif font, distraction-free writing
- **Focus Mode**: Dim all paragraphs except the active one for better concentration
- **Typewriter Mode**: Keep cursor vertically centered while typing
- **Show Formatting**: Toggle between rendered markdown and source code in Writing Focus mode
- Open and read markdown files (.md, .markdown, .txt)
- Save and Save As functionality
- **Autosave**: Configurable intervals (1, 5, 15, or 30 minutes)
- **Real-time statistics**: Word count, character count, and line count

### File Management
- **Open Recent** - Quick access to your last 10 opened files
- **File Associations** - Double-click .md, .markdown, or .txt files to open in Nthing
- **Drag & Drop Files** - Drag text files from Explorer directly into the window to open them
- Unsaved changes warning when opening/creating new files

### Search & Replace
- **Find & Replace** with case-sensitive and whole-word options
- Movable, draggable find dialog
- Match count and navigation
- Visual highlighting of search results

### Note Backup System
- **Automatic Backups** - Created on save with MD5 hash deduplication
- **Backup History** - Keep up to 10 versions with timestamps
- **Backup Comparison** - Visual diff window showing changes
- **Color-Coded Diff**: 🔴 Red (will be lost) / 🟢 Green (will be restored)
- **Interactive Restoration** - Select individual lines to restore or restore full backup
- **Storage**: Local `.nthing-history/` folder next to each file
- **Manual Snapshots** - Create backups on demand

### Formatting Tools
- **Table Insertion** - Quick table template (Ctrl+T)
- **List Formatting** - Toggle bullet and numbered lists
- **Auto-Continue Lists** - Automatically continue lists on new lines
- **Image Support** - Paste from clipboard or drag & drop images (auto-saves to `images/` folder)

### User Interface
- Clean, modern UI with custom title bar
- Native File, Edit, Format, View, and Help menus
- Keyboard shortcuts for all major operations
- Synchronized scrolling between editor and preview
- Distraction-free, minimal interface

## Installation & Running

### Prerequisites
- Node.js (version 14 or higher)
- npm (comes with Node.js)

### Setup on Windows

1. Clone this repository or download the files
2. Open Command Prompt or PowerShell in the project directory
3. Install dependencies:
   ```
   npm install
   ```
4. Run the application:
   ```
   npm start
   ```

## Usage

### Keyboard Shortcuts

**File:**
- `Ctrl+N` - New file
- `Ctrl+O` - Open file
- `Ctrl+1-9` - Open recent file (1 = most recent)
- `Ctrl+S` - Save file
- `Ctrl+Shift+S` - Save As
- `Ctrl+Q` - Quit application

**Edit:**
- `Ctrl+Z` - Undo
- `Ctrl+Y` - Redo
- `Ctrl+X` - Cut
- `Ctrl+C` - Copy
- `Ctrl+V` - Paste
- `Ctrl+A` - Select All
- `Ctrl+F` - Find
- `Ctrl+H` - Find & Replace
- `Esc` - Close Find & Replace dialog

**Format:**
- `Ctrl+T` - Insert table
- `Ctrl+Shift+8` - Toggle bullet list
- `Ctrl+Shift+7` - Toggle numbered list

**View:**
- `F9` - Toggle between Editor and Writing Focus modes
- `F12` - Toggle Developer Tools

**Backups:**
- `Ctrl+Shift+H` - Open Note Backups sidebar

### Menu Options

**File Menu:**
- New - Create a new file
- Open - Open existing markdown files
- **Open Recent** - Access your last 10 opened files
- Save / Save As
- **Autosave** - Enable for this session or always, with configurable intervals
- **Note Backups** - View backup history (Ctrl+Shift+H)
- **Create Backup** - Manually create a backup snapshot
- Exit

**Edit Menu:**
- Undo/Redo
- Cut/Copy/Paste
- Select All
- Find
- Find & Replace

**Format Menu:**
- Toggle Bullet List (Ctrl+Shift+8)
- Toggle Numbered List (Ctrl+Shift+7)
- Insert Table (Ctrl+T)

**View Menu:**
- Toggle View Mode (F9)
- **Editor Mode** - Split-pane with preview and line numbers
- **Writing Focus Mode** - Distraction-free writing
- **Focus Mode** - Highlight active paragraph only
- **Typewriter Mode** - Keep cursor centered
- Toggle Developer Tools (F12)

**Help Menu:**
- **About Note Backups** - Complete backup system documentation
- Keyboard Shortcuts - Full shortcut reference
- About Nthing - Version and app information

### Editing Modes

The editor supports two modes optimized for different workflows:

**Editor Mode** (default):
- Split-pane layout with live preview
- Line numbers in the editor
- Monospace font (Consolas, Monaco)
- Raw markdown source code
- Synchronized scrolling between editor and preview
- Perfect for technical writing and precise editing

**Writing Focus Mode**:
- Full-width editor (no preview)
- Wider margins (120px on each side)
- Larger serif font (Georgia, 18px)
- Increased line spacing for comfortable reading
- Distraction-free writing environment
- Perfect for drafting and creative writing

Switch between modes via **View > Editor Mode** or **View > Writing Focus Mode**.

### Find & Replace Features
- **Find Next/Previous**: Navigate through all matches
- **Case Sensitive**: Toggle case-sensitive search
- **Whole Word**: Match whole words only
- **Replace**: Replace current match
- **Replace All**: Replace all matches at once
- Auto-fills with selected text when opened
- Shows match count and current position

### Statistics
The status bar displays real-time statistics:
- **Word Count**: Number of words in your document
- **Character Count**: Total characters including spaces
- **Line Count**: Total number of lines

### Synchronized Scrolling (Editor Mode)
The editor and preview panes stay in sync as you scroll in Editor Mode:
- **Scroll the editor** - Preview automatically scrolls to match
- **Scroll the preview** - Editor automatically scrolls to match
- **Line numbers** - Scroll with editor position
- **Bidirectional** - Works both ways for maximum flexibility
- **Proportional** - Maintains relative position regardless of content length

### Note Backup System

Nthing automatically protects your work with an intelligent backup system:

**Automatic Backups:**
- Created automatically when you save your notes
- MD5 hash deduplication prevents duplicate backups
- Keeps up to 10 versions by default
- Stored in `.nthing-history/` folder next to your file

**Viewing Backups:**
- Open the sidebar: File > Note Backups (Ctrl+Shift+H)
- Each backup shows: timestamp, file size, and word count
- Click **👁 Preview** to compare versions

**Comparing Versions:**
- Opens a split-pane comparison window
- **Left pane**: Your current note (live preview)
- **Right pane**: Selected backup version
- **Color coding**:
  - 🔴 **Red** (left) = Lines you will LOSE if you restore
  - 🟢 **Green** (right) = Lines you will GET BACK
  - ⚪ **White** = Unchanged lines

**Restoring Options:**

1. **Interactive Line Restoration** (Advanced):
   - Click **←** arrows next to green lines to select them
   - Selected lines appear in the preview (left pane)
   - Click **✓** to deselect
   - Click **Finalize Restoration** to apply your selections
   - Only the selected lines will be restored

2. **Full Backup Restoration**:
   - Click **Restore Full Backup** button
   - Confirmation dialog appears
   - Entire backup replaces your current note

**Safety Features:**
- Visual preview before restoration
- Color-coded diff shows exactly what will change
- Confirmation dialogs for destructive actions
- Manual backup creation anytime

## Supported Markdown Features

- Headings (# H1, ## H2, etc.)
- Bold and italic text
- Links and images
- Lists (ordered and unordered)
- Code blocks and inline code
- Blockquotes
- Tables
- Horizontal rules

## File Structure

```
nthing/
├── main.js           # Electron main process, backup system
├── index.html        # Main application UI
├── styles.css        # Main application styling
├── renderer.js       # UI logic and markdown rendering
├── compare.html      # Backup comparison window UI
├── compare.css       # Comparison window styling
├── compare.js        # Diff algorithm and restoration logic
├── package.json      # Project configuration
├── README.md         # This file
└── .nthing-history/  # Local backup storage (auto-created)
    └── [filename]/
        ├── v001.md
        ├── v002.md
        └── metadata.json
```

## Building for Distribution

This project is pre-configured with electron-builder to create Windows installers.

### Quick Build

```bash
npm install
npm run build
```

This will create a Windows installer at `dist/Nthing Setup 1.9.0.exe`

### Windows Defender False Positive Warning

**Important**: Windows Defender may flag the built .exe file as a trojan (typically "Trojan:Win32/Wacatac.C!ml"). This is a **false positive** that commonly occurs with unsigned Electron applications.

**Why this happens**:
- The executable is not code-signed (code signing certificates cost $100-400/year)
- Windows Defender's machine learning flags new/unknown executables as suspicious
- This affects many legitimate Electron applications

**How to fix**:

1. **Add exclusion in Windows Security**:
   - Open Windows Security (search for it in Start menu)
   - Go to "Virus & threat protection"
   - Click "Manage settings" under "Virus & threat protection settings"
   - Scroll down to "Exclusions" and click "Add or remove exclusions"
   - Click "Add an exclusion" > "Folder"
   - Add your project's `dist` folder (e.g., `C:\Users\YourName\markdowneditor1\dist`)

2. **For distribution**: Consider purchasing a code signing certificate from providers like:
   - DigiCert
   - Sectigo
   - SignPath (free for open source projects)

3. **Submit to Microsoft**: You can report the false positive to Microsoft at https://www.microsoft.com/en-us/wdsi/filesubmission

### Build Options

- `npm run build` - Create NSIS installer (recommended)
- `npm run build:portable` - Create portable .exe (no installation required)

### Detailed Instructions

For complete build instructions, customization options, and troubleshooting, see [BUILD.md](BUILD.md).

The installer includes:
- Desktop shortcut creation
- Start Menu integration
- Custom installation directory option
- Proper uninstaller

## Technologies Used

- **Electron** - Desktop app framework
- **marked.js** - Markdown parsing and rendering
- **CodeMirror 6** - Advanced text editing in Writing Focus mode
- **highlight.js** - Syntax highlighting for code blocks
- **Node.js** - File system operations and backup management
- **crypto** (Node.js) - MD5 hashing for backup deduplication

## License

MIT
