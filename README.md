# Markdown Editor

A desktop markdown editor built with Electron. Features live preview, file operations, and a clean interface.

## Features

- **Two editing modes**: Editor Mode (split-pane with preview) and Writing Focus Mode (distraction-free)
- **Editor Mode**: Line numbers, raw source code, live preview with synchronized scrolling
- **Writing Focus Mode**: Wider margins, larger serif font, distraction-free writing
- Open and read markdown files (.md, .markdown, .txt)
- Save and Save As functionality
- **Open Recent** - Quick access to your last 10 opened files
- **Find & Replace** with case-sensitive and whole-word options
- **Real-time word, character, and line count**
- Keyboard shortcuts for all major operations
- Native File, Edit, and View menus
- Clean, modern UI

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
- `Ctrl+N` - New file
- `Ctrl+O` - Open file
- `Ctrl+1-9` - Open recent file (1 = most recent)
- `Ctrl+S` - Save file
- `Ctrl+Shift+S` - Save As
- `Ctrl+F` - Find
- `Ctrl+H` - Find & Replace
- `Ctrl+Q` - Quit application
- `Esc` - Close Find & Replace dialog

### Menu Options
Use the **File** menu to:
- Create a new file
- Open existing markdown files
- **Open Recent** - Access your last 10 opened files with one click
- Save your work
- Save to a new file location

### Open Recent Files
The editor remembers your last 10 opened files:
- Access via **File > Open Recent** menu
- Use keyboard shortcuts `Ctrl+1` through `Ctrl+9` for quick access
- Files are automatically added when opened or saved
- Clear the list with **File > Open Recent > Clear Recent Files**
- Files that no longer exist are automatically removed from the list

The **Edit** menu provides:
- Undo/Redo
- Cut/Copy/Paste
- Select All
- Find
- Find & Replace

The **View** menu provides:
- **Editor Mode** - Split-pane with preview and line numbers
- **Writing Focus Mode** - Distraction-free writing

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
markdown-editor/
├── main.js           # Electron main process
├── index.html        # Application UI
├── styles.css        # Styling
├── renderer.js       # UI logic and markdown rendering
├── package.json      # Project configuration
└── README.md         # This file
```

## Building for Distribution

This project is pre-configured with electron-builder to create Windows installers.

### Quick Build

```bash
npm install
npm run build
```

This will create a Windows installer at `dist/Markdown Editor Setup 1.0.0.exe`

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
- **Node.js** - File system operations

## License

MIT
