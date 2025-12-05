# Nthing Markdown Editor - Claude Instructions

This document extends the general Claude instructions with project-specific requirements.

## Project Context

Nthing is an Electron-based markdown editor with three view modes (Editor, Writing Focus, Reader), backup system, autosave, and various UI features including sidebars, file tree, outline, and minimap.

**Key Files:**
- `main.js` - Electron main process (window management, file I/O, IPC handlers)
- `renderer.js` - Renderer process (UI logic, editor, preview, CodeMirror)
- `index.html` - Main window layout
- `styles.css` - All styling
- `PROJECT_MEMORY.md` - Recent decisions and context
- `Roadmap.md` - Planned features
- `ARCHITECTURE.md` - Technical architecture documentation

## Protocol for Starting Work on Issues/Features

**MANDATORY: Before starting any issue or feature implementation:**

1. **Check Documentation First** (in this order):
   - `PROJECT_MEMORY.md` - Recent decisions, completed features, known context
   - `Roadmap.md` - Planned features, agreed-upon approaches
   - `ARCHITECTURE.md` - Technical decisions, patterns, file structure
   - GitHub issue description - Specific requirements and acceptance criteria

2. **Only After Documentation Review:**
   - Design implementation based on documented decisions
   - Follow established patterns from ARCHITECTURE.md
   - Use existing code patterns for consistency

3. **Only Ask Questions When:**
   - Documentation is unclear or contradictory
   - Documentation is missing critical information
   - Multiple valid interpretations exist

**DO NOT:**
- Ask questions that are already answered in documentation
- Propose alternatives to decisions already documented
- Start implementation before checking documentation

## Development Workflow

### Testing
- **DO NOT run `npm start` in WSL** - Electron doesn't work properly in this environment
- User tests on Windows via GitHub Desktop + npm
- Workflow: Commit → Push → User pulls → User tests on Windows

### Version Management
- Bump version in package.json for releases
- Follow semantic versioning (MAJOR.MINOR.PATCH)
- Create git tags for releases: `git tag v1.X.0`

### Commit Standards
- Clear, descriptive commit messages
- Reference issue numbers when applicable
- Group related changes in single commits

## Project-Specific Patterns

### IPC Communication
- Main process sends to renderer: `win.webContents.send('event-name', data)`
- Renderer sends to main: `ipcRenderer.send('event-name', data)`
- Use descriptive event names following existing patterns

### Window State Management
- Use `windows` Map to track per-window state
- Helper functions: `getWindowState(win)`, `getWindowStateFromEvent(event)`

### Settings Persistence
- Global settings: `settings.json` in userData directory
- Per-document UI state: localStorage
- Window-specific: window state in `windows` Map

### CSS Organization
- Component-based organization
- State classes: `.hidden`, `.focus-mode-enabled`, etc.
- Mode-specific: `[data-mode="editor|writing|reader"]`

## Code Quality Standards

- Follow existing code style and patterns
- Use existing helper functions where available
- Maintain consistency with current architecture
- Add comments for complex logic only
- Keep functions focused and single-purpose

## Documentation Requirements

When making significant changes:
- Update PROJECT_MEMORY.md with decisions
- Update Roadmap.md if features completed
- Update ARCHITECTURE.md if patterns change
- Keep GitHub issues synchronized

---

*This file follows the template from /home/exit/dev/projects/CLAUDE.md*
