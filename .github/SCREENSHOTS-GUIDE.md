# Screenshots Guide for README

This guide explains what screenshots to capture and where to save them.

## Required Screenshots

The README now has placeholders for these screenshots. Save them in `.github/screenshots/` with these exact filenames:

### 1. Hero Image (`hero-image.png`)
- **What to capture**: The main interface showing the editor in its best light
- **Recommended**: Editor Mode with a nice sample document open
- **Tips**:
  - Use a clean, readable sample document
  - Make sure the window is at a good size (around 1200-1400px wide)
  - Consider showing some of the preview pane

### 2. Editor Mode (`editor-mode.png`)
- **What to capture**: Split-pane view with markdown source and preview
- **Show**:
  - Line numbers visible
  - Both editor and preview panes
  - Some meaningful sample content
  - Synchronized scrolling if possible

### 3. Writing Focus Mode (`writing-mode.png`)
- **What to capture**: Single-pane writing view
- **Show**:
  - Wider margins
  - Serif font (Georgia)
  - Clean, distraction-free interface
  - A paragraph or two of sample text

### 4. Reader Mode (`reader-mode.png`)
- **What to capture**: Preview-only mode
- **Show**:
  - Full-width rendered preview
  - No editor interface
  - Well-formatted rendered document

### 5. Backup Comparison (`backup-comparison.png`)
- **What to capture**: The backup comparison window (compare.html)
- **Show**:
  - Split diff view
  - Color-coded changes (red/green/white)
  - Both "Restore Full Backup" and line selection options visible
  - The backup sidebar if possible

### 6. File Tree Sidebar (`file-tree-sidebar.png`)
- **What to capture**: Editor with file tree sidebar open (Ctrl+Shift+E)
- **Show**:
  - Hierarchical folder structure
  - Multiple .md files
  - Current file highlighted
  - Both editor and file tree visible

### 7. Outline Sidebar (`outline-sidebar.png`)
- **What to capture**: Editor with outline sidebar open (Ctrl+Shift+O)
- **Show**:
  - Document structure with multiple header levels (H1-H6)
  - Hierarchical indentation showing header hierarchy
  - Active section highlighted
  - Clickable header list
  - Both editor and outline sidebar visible
- **Tips**:
  - Use a document with varied header levels for better demonstration
  - Make sure the active section is highlighted

## Taking Screenshots

### Windows (Built-in)
1. **Snipping Tool** (Windows 10/11):
   - Press `Win + Shift + S`
   - Select area to capture
   - Screenshot copies to clipboard
   - Open Paint and paste (Ctrl+V)
   - Save to `.github/screenshots/`

2. **Full Window Capture**:
   - Press `Alt + Print Screen` to capture active window
   - Paste into Paint or image editor
   - Crop if needed
   - Save to `.github/screenshots/`

### Third-Party Tools
- **ShareX** (free, recommended): https://getsharex.com/
  - Can capture windows, regions, full screen
  - Auto-saves with custom filenames
  - Can add annotations

- **Greenshot** (free): https://getgreenshot.org/
  - Similar to Snipping Tool but more features
  - Quick editing capabilities
i h 
## Image Guidelines

- **Format**: PNG (better for screenshots with text)
- **Size**: Keep under 2MB per image if possible
- **Resolution**:
  - Full width shots: 1200-1600px wide
  - Detail shots: 800-1000px wide
- **Content**: Use clean, professional-looking sample documents
- **Avoid**: Personal information, messy/cluttered content

## Sample Document Suggestions

For screenshots, use sample content like:
- Technical documentation
- A README or guide
- Poetry or prose (public domain)
- Generic tutorial content
- Avoid: Personal notes, sensitive information

## After Capturing Screenshots

1. Save each screenshot with the exact filename listed above
2. Place in `.github/screenshots/` directory
3. The README already references them - they'll show up automatically
4. Test by viewing the README on GitHub after pushing

## Workflow

```bash
# After saving all screenshots to .github/screenshots/:
cd markdowneditor1
git add .github/screenshots/
git add README.md
git commit -m "Add screenshots to README"
git push
```

## Optional: Additional Screenshots

If you want to showcase more features, consider adding:
- Find & Replace dialog
- Focus Mode (dimmed paragraphs)
- Typewriter Mode
- Outline sidebar
- Table insertion
- Image paste functionality

Add these to a "Screenshots" section at the end of the README.
