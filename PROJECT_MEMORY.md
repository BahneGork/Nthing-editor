# Nthing Editor - Project Memory

Last Updated: 2025-11-20

## Project Overview
Nthing is a markdown editor built with Electron focused on distraction-free writing and editing. Current version: 1.12.0

## GitHub Repository
https://github.com/BahneGork/Nthing-editor

## GitHub Token
- Token saved at: `~/.github_token`
- Token name: `claude-nthing`
- Expires: December 20, 2025
- Token value: (stored in ~/.github_token file, not in version control)

## Recent Session Work (2025-11-20)

### Completed
1. ✅ Added screenshots to README
   - Created `.github/screenshots/` directory
   - Added 7 screenshots: hero-image, editor-mode, writing-mode, reader-mode, backup-comparison, file-tree-sidebar, outline-sidebar
   - Created SCREENSHOTS-GUIDE.md for future reference
   - Committed and pushed to GitHub

2. ✅ Updated Roadmap and Bug Tracking
   - Marked completed bugs as fixed (file mixing bug, draggable separator)
   - Added sidebar organization features to roadmap
   - Updated GITHUB_ISSUES.md with new issue templates

3. ✅ GitHub Issues Management
   - Compared roadmap with existing GitHub issues
   - Created 5 new issues:
     - #15: Smart Formatting Wrapping
     - #16: Move Lines with Keyboard
     - #18: File Tree Enhancements
     - #19: Left Sidebar Organization
     - #20: Right Sidebar Organization
   - All roadmap items now have corresponding GitHub issues

### Files Modified This Session
- `README.md` - Added screenshot references
- `Roadmap.md` - Added sidebar organization and keyboard shortcuts
- `Bugs and features.md` - Marked fixed issues
- `GITHUB_ISSUES.md` - Added new issue templates
- `.github/SCREENSHOTS-GUIDE.md` - Created screenshot guide
- `.github/screenshots/` - Added 7 screenshot files
- `PROJECT_MEMORY.md` - This file

## Current Project State

### Completed Features (v1.12.0)
- ✅ Three view modes: Editor, Writing Focus, Reader
- ✅ File tree sidebar (Ctrl+Shift+E)
- ✅ Outline/TOC sidebar (Ctrl+Shift+O)
- ✅ Backup system with comparison and restoration
- ✅ Autosave with configurable intervals
- ✅ Find & Replace with draggable dialog
- ✅ Image paste and drag-drop support
- ✅ Multiple windows support
- ✅ Recent files (Ctrl+1-9)
- ✅ Workspace folder support
- ✅ HTML file support
- ✅ Resizable editor/preview panes

### Open GitHub Issues (11 total)

**Short-term (5 issues):**
- #1: Export to PDF/HTML
- #3: Interactive Task Lists
- #4: Dark Theme
- #15: Smart Formatting Wrapping (NEW)
- #16: Move Lines with Keyboard (NEW)

**Medium-term (3 issues):**
- #18: File Tree Enhancements (NEW)
- #19: Left Sidebar Organization (NEW)
- #20: Right Sidebar Organization (NEW)

**Long-term (3 issues):**
- #8: Math Equations (LaTeX/KaTeX)
- #9: Diagram Support (Mermaid)
- #10: Export to Word (.docx)

### Known Issues

**UI Overlap:**
- Left sidebar: File tree and outline overlap when both open
- Right sidebar: Minimap and backups overlap when both open
- Solution: Issues #19 and #20 track implementing tabs/stacked layout

**Pending Features from Bugs and features.md:**
- Line 23: Smart formatting wrapping (tracked in #15)
- Line 24: Move lines with Ctrl+Arrow (tracked in #16)

### Technical Stack
- Electron (main framework)
- marked.js (markdown parsing)
- CodeMirror 6 (text editor in Writing Focus mode)
- highlight.js (code syntax highlighting)
- Node.js crypto module (MD5 for backup deduplication)

## Important Files

### Documentation
- `README.md` - Main documentation with screenshots
- `ARCHITECTURE.md` - Technical architecture
- `BUILD.md` - Build instructions
- `Roadmap.md` - Feature roadmap
- `GITHUB_ISSUES.md` - Issue templates for GitHub
- `CREATE_ISSUES_INSTRUCTIONS.md` - How to create GitHub issues
- `SCREENSHOTS-GUIDE.md` - Screenshot capture guide

### Code Structure
```
main.js         # Electron main process, backup system, menus
renderer.js     # Editor logic, markdown rendering
index.html      # Main UI
styles.css      # Main styles
compare.html    # Backup comparison window
compare.js      # Diff algorithm and line restoration
compare.css     # Comparison styles
```

### Build & Distribution
- `package.json` - Project configuration and build scripts
- `installer.nsh` - NSIS installer configuration
- `dist/` - Build output directory

## Build Commands
```bash
npm start              # Run in development
npm run build          # Create Windows installer
npm run build:portable # Create portable exe
```

## Git Workflow
- Main branch: `main`
- Remote: https://github.com/BahneGork/Nthing-editor.git
- Uses HTTPS (not SSH)

## Development & Testing Workflow
**IMPORTANT: We work in WSL but test in Windows**
- ⚠️ **DO NOT** run `npm start` or test locally in WSL (missing dependencies)
- ✅ **ALWAYS** commit and push changes to GitHub
- ✅ User tests in Windows environment
- Development cycle:
  1. Make code changes in WSL
  2. Commit changes with descriptive message
  3. Push to remote repository
  4. User pulls and tests in Windows

## Windows Defender False Positive
The built exe triggers Windows Defender (Trojan:Win32/Wacatac.C!ml) because it's unsigned. This is expected for unsigned Electron apps. Code signing certificates cost $100-400/year.

## Future Session Notes

### If GitHub CLI is needed:
- Token is saved in `~/.github_token`
- Use: `export GITHUB_TOKEN=$(cat ~/.github_token)`
- Or use curl with: `-H "Authorization: token $(cat ~/.github_token)"`

### Before creating GitHub issues:
1. Always check existing issues first with WebFetch or API
2. Avoid creating duplicates
3. Use the token from `~/.github_token`

### Screenshots:
- All screenshots in `.github/screenshots/`
- Guide available in `.github/SCREENSHOTS-GUIDE.md`
- Update screenshots when UI changes significantly

---

## Session History

### 2025-11-20
- Added screenshots to README
- Created 5 new GitHub issues
- Updated roadmap with sidebar organization features
- Saved GitHub token for future sessions
- Aligned all roadmap items with GitHub issues
