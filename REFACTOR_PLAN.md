# Single-Process Multiple-Windows Refactor Plan

## Objective
Convert Nthing from multiple Electron processes (one per file) to a single process with multiple windows. This will eliminate the 5-7 second loading delay for additional windows.

## Current Status: Phase 2 Complete
Branch: `feature/single-process-multiple-windows`

### ✅ Completed:
1. **State Management Infrastructure** (Phase 1)
   - Added `windows` Map to track per-window state
   - Created helper functions: `getWindowState`, `getWindowStateFromEvent`, `createWindowState`, `destroyWindowState`
   - Updated `updateWindowTitle` to use window state

2. **Autosave Functions** (Phase 2)
   - Updated `startAutosave(win)` to use per-window state
   - Updated `stopAutosave(win)` to use per-window state
   - Updated `toggleAutosave` to apply to all windows
   - Updated `setAutosaveInterval` to restart all windows
   - Updated `sendAutosaveStatus(win)` to use window state
   - Updated `createWindow` to initialize state and accept `filePathToOpen` parameter

### 🚧 TODO - Remaining Phases:

## Phase 3: File Operation Functions
All file operation functions need to accept a `win` parameter and use window state instead of globals.

### Functions to Update:
- `newFile()` → `newFile(win)`
- `createNewFile()` → `createNewFile(win)`
- `openFile()` → `openFile(win)`
- `showOpenDialog()` → `showOpenDialog(win)`
- `openRecentFile(filePath)` → `openRecentFile(win, filePath)`
- `openRecentFileAfterCheck(filePath)` → `openRecentFileAfterCheck(win, filePath)`
- `openFileByPath(filePath)` → `openFileByPath(win, filePath)`
- `saveFile()` → `saveFile(win)`
- `saveFileAs()` → `saveFileAs(win)`

### Pattern to Follow:
```javascript
// OLD:
function saveFile() {
  if (currentFilePath) {
    mainWindow.webContents.send('save-file-request');
  } else {
    saveFileAs();
  }
}

// NEW:
function saveFile(win) {
  const state = getWindowState(win);
  if (!state) return;

  if (state.currentFilePath) {
    win.webContents.send('save-file-request');
  } else {
    saveFileAs(win);
  }
}
```

## Phase 4: IPC Handlers
All IPC handlers need to get the window from `event.sender` and use window state.

### Handlers to Update:
1. `ipcMain.on('save-content', ...)` - Use `getWindowStateFromEvent(event)`
2. `ipcMain.on('content-changed', ...)` - Use window state
3. `ipcMain.on('get-versions', ...)` - Use window state
4. `ipcMain.on('restore-version', ...)` - Use window state
5. `ipcMain.on('delete-version', ...)` - Use window state
6. `ipcMain.on('create-snapshot', ...)` - Use window state
7. `ipcMain.on('open-compare-window', ...)` - Use window state
8. `ipcMain.on('apply-partial-restore', ...)` - Use window from event
9. `ipcMain.on('apply-full-restore', ...)` - Use window from event
10. `ipcMain.on('minimize-window', ...)` - Use window from event
11. `ipcMain.on('maximize-window', ...)` - Use window from event
12. `ipcMain.on('close-window', ...)` - Use window from event
13. `ipcMain.on('show-menu', ...)` - Use window from event
14. `ipcMain.on('open-recent-file-by-index', ...)` - Use window from event
15. `ipcMain.on('save-pasted-image', ...)` - Use window from event
16. `ipcMain.on('save-dropped-image', ...)` - Use window from event
17. `ipcMain.on('open-dropped-file', ...)` - Use window from event
18. Compare window IPC handlers

### Pattern to Follow:
```javascript
// OLD:
ipcMain.on('save-content', (event, content) => {
  if (currentFilePath) {
    fs.writeFileSync(currentFilePath, content, 'utf-8');
    lastSaveTime = Date.now();
    hasUnsavedChanges = false;
    // ...
  }
});

// NEW:
ipcMain.on('save-content', (event, content) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const state = getWindowState(win);
  if (!state) return;

  if (state.currentFilePath) {
    fs.writeFileSync(state.currentFilePath, content, 'utf-8');
    state.lastSaveTime = Date.now();
    state.hasUnsavedChanges = false;
    // ...
  }
});
```

## Phase 5: Menu System
Update menu clicks to determine which window they should operate on.

### Strategy:
- Menu commands should operate on the **focused window**
- Use `BrowserWindow.getFocusedWindow()` to get the active window
- Update all menu click handlers to pass the focused window to functions

### Example:
```javascript
{
  label: 'New',
  accelerator: 'CmdOrCtrl+N',
  click: () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) newFile(win);
  }
}
```

## Phase 6: Single Instance Lock with Multiple Window Support
Re-enable `app.requestSingleInstanceLock()` to use one process with multiple windows.

### Implementation:
```javascript
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // When double-clicking a new .md file, open it in a NEW window
    const filePath = commandLine[commandLine.length - 1];
    if (filePath && (filePath.endsWith('.md') || filePath.endsWith('.markdown'))) {
      createWindow(filePath); // Open in new window
    } else {
      // Just focus the most recent window if no file specified
      const allWindows = BrowserWindow.getAllWindows();
      if (allWindows.length > 0) {
        const lastWindow = allWindows[allWindows.length - 1];
        if (lastWindow.isMinimized()) lastWindow.restore();
        lastWindow.focus();
      }
    }
  });

  app.whenReady().then(() => {
    // ... existing code
  });
}
```

## Phase 7: Testing Checklist
After refactor is complete, test:

- [ ] Open first .md file - should be fast
- [ ] Open second .md file - should be **much faster** (no new process)
- [ ] Open third .md file - should be fast
- [ ] Edit and save in each window independently
- [ ] Autosave works per-window
- [ ] Recent files list shared across windows
- [ ] Each window has its own backup history
- [ ] Closing one window doesn't affect others
- [ ] Close all windows - app quits
- [ ] Menu commands work on focused window
- [ ] Compare backup window works correctly

## File References
- Main file: `/home/exit/dev/projects/Nthing markdown editor/markdowneditor1/main.js` (1615 lines)
- Current branch: `feature/single-process-multiple-windows`
- Last commit: "WIP: Phase 1 & 2 - State management infrastructure and autosave functions"

## Next Steps
1. Continue with Phase 3 (File Operations)
2. Then Phase 4 (IPC Handlers)
3. Then Phase 5 (Menu System)
4. Then Phase 6 (Single Instance Lock)
5. Then Phase 7 (Testing)

## Important Notes
- Each phase should be committed separately
- Test compiles after each phase if possible
- The refactor is large but systematic - follow the patterns above
- All references to `mainWindow`, `currentFilePath`, `lastSaveTime`, `hasUnsavedChanges`, `autosaveTimer`, `titleUpdateTimer` need to be updated to use window state
