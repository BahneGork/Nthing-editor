# Nthing Editor - Project Memory

Last Updated: 2025-11-21

## Project Overview
Nthing is a markdown editor built with Electron focused on distraction-free writing and editing. Current version: 1.13.0

## GitHub Repository
https://github.com/BahneGork/Nthing-editor

## GitHub Token
- Token saved at: `~/.github_token`
- Token name: `claude-nthing`
- Expires: December 20, 2025
- Token value: (stored in ~/.github_token file, not in version control)

## Recent Session Work (2025-11-21)

### Completed
1. ✅ Implemented .docx File Viewer Support
   - Added mammoth.browser.min.js (standalone browser build) to project root
   - Modified renderer.js to convert .docx files to HTML using mammoth
   - Files are read as base64 in main process, converted to HTML in renderer
   - Auto-switches to reader mode when opening .docx files
   - Added .docx file associations for Windows double-click opening

2. ✅ Fixed Multiple UI and Functionality Issues
   - Fixed missing .title span in preview pane header (index.html:166)
   - Fixed reader mode startup issue (prevented reader as default mode)
   - Fixed file association command line argument parsing
   - Fixed duplicate variable declaration causing menu unresponsiveness
   - Fixed outline parsing to work with .docx HTML content
   - Fixed minimap to visualize .docx content using element positions

3. ✅ Enhanced File Tree
   - Added tooltips showing full file paths on hover
   - Improves usability for long filenames that get truncated

### Technical Decisions Made
- **Mammoth Integration**: Used browser build (mammoth.browser.min.js) instead of npm package
  - Node modules can be problematic in packaged Electron apps
  - Browser build loaded via script tag is more reliable
- **Base64 Transfer**: .docx files read as binary buffer in main process, sent as base64 to renderer
- **Reader Mode Auto-Switch**: .docx files automatically switch to reader mode to hide base64 data
- **Startup Mode**: Never allow reader mode as default startup (hides all controls when no file open)

### Files Modified This Session
- `index.html` - Added .title span wrapper, added mammoth.browser.min.js script tag
- `main.js` - Fixed startup mode logic, added .docx to file associations
- `renderer.js` - Mammoth integration, outline/minimap updates for .docx
- `package.json` - Removed mammoth npm dependency, added .docx file association
- `mammoth.browser.min.js` - Added standalone browser library (621KB)
- `PROJECT_MEMORY.md` - This file

### Known Issues from This Session
- Minimap visualization for .docx files works but user is "not satisfied" with density/accuracy
- Functional but could be improved in future iterations

## Current Project State

### Completed Features (v1.13.0)
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
- ✅ **Word document (.docx) viewer** - New in v1.13.0
- ✅ Resizable editor/preview panes
- ✅ File tree tooltips for long filenames

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
- mammoth.browser.min.js (Word document conversion - standalone browser build)
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
- ✅ User tests in Windows environment using built exe
- Development cycle:
  1. Make code changes in WSL
  2. Commit changes with descriptive message
  3. Push to remote repository
  4. User pulls, runs `npm run build`, and tests the built exe in Windows

## Electron Packaging Considerations
**CRITICAL: When adding new Node modules**
- Always consider how electron-builder will package the module
- Some modules need `asarUnpack` configuration to work in packaged apps
- Test in built exe, not just development mode
- Add to `asarUnpack` in package.json if module has runtime file access needs
- **Lesson learned**: Browser builds (loaded via script tag) are more reliable than npm packages for complex modules
- Example: mammoth.browser.min.js works perfectly; npm mammoth package had packaging issues

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

### 2025-11-21
- Implemented .docx file viewer using mammoth.browser.min.js
- Fixed reader mode startup issue
- Added .docx file associations for Windows
- Fixed outline and minimap to work with .docx content
- Added file tree tooltips for long filenames
- Multiple bug fixes (duplicate variables, missing UI elements)
- Merged feature/docx-viewer branch into main
- Bumped version to 1.13.0

### 2025-11-20
- Added screenshots to README
- Created 5 new GitHub issues
- Updated roadmap with sidebar organization features
- Saved GitHub token for future sessions
- Aligned all roadmap items with GitHub issues
