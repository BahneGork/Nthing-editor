# .docx Viewer Feature - Implementation Guide

**Branch:** `feature/docx-viewer`
**Status:** Implementation Complete - Ready for Testing
**Started:** 2025-11-21
**Completed:** 2025-11-21

## Feature Overview
Add read-only .docx file viewing to Nthing. Uses mammoth.js to convert .docx to HTML for display. Files open in reader mode (like HTML files currently do).

## Key Architecture Insights
- Nthing already handles read-only files (HTML) perfectly
- Same pattern works for .docx: detect extension → switch to reader mode → convert and display
- Editor pane hidden via CSS (data-mode="reader")
- No editing functionality needed

## Implementation Checklist

### Phase 1: Dependencies & Setup
- [x] Add mammoth to package.json dependencies
- [x] Run npm install

### Phase 2: Main Process (main.js)
- [x] Add .docx to file dialog filters (line 1287-1290)
- [x] Add .docx to accepted extensions array (line 1426)
- [x] Modify openFileByPath() to handle binary files (line 1357-1390)
  - Detect .docx extension
  - Read as buffer (not utf-8)
  - Send as base64 to renderer

### Phase 3: Renderer Process (renderer.js)
- [x] Import mammoth (line 23)
- [x] Add isDocxFile flag variable (line 165)
- [x] Add .docx detection in file-opened handler (line 1111-1168)
  - Set isDocxFile = true
  - Switch to reader mode
  - Add docx-viewer class
  - Update pane title to "Read-Only: Word Document"
- [x] Add .docx conversion in updatePreview() (line 595-650)
  - Convert base64 → buffer
  - Call mammoth.convertToHtml()
  - Handle async with .then()
  - Add comprehensive error handling
- [x] Reset isDocxFile on new file (line 1193-1204)

### Phase 4: Styling (Optional)
- [ ] Add .docx-viewer CSS class (styles.css ~1507) - Optional

### Phase 5: Testing
- [ ] Open .docx via File > Open
- [ ] Open .docx via drag & drop
- [ ] Open .docx via recent files
- [ ] Test complex documents (images, tables, formatting)
- [ ] Test error handling (corrupted file)
- [ ] Test mode switching (.docx → .md)
- [ ] Verify save operations disabled

## Code Snippets

### Main Process Binary File Handling
```javascript
// In openFileByPath() function
function openFileByPath(win, filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.docx') {
    // Read as binary buffer
    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString('base64');
    state.currentFilePath = filePath;
    win.webContents.send('file-opened', {
      content: base64,
      filePath,
      isDocx: true
    });
  } else {
    // Existing text file handling
    const content = fs.readFileSync(filePath, 'utf-8');
    state.currentFilePath = filePath;
    win.webContents.send('file-opened', { content, filePath });
  }
}
```

### Renderer .docx Detection
```javascript
// In file-opened IPC handler
ipcRenderer.on('file-opened', (event, { content, filePath, isDocx }) => {
  editor.value = content;
  currentFilePath = filePath;

  isHtmlFile = filePath && filePath.toLowerCase().endsWith('.html');
  isDocxFile = isDocx || (filePath && filePath.toLowerCase().endsWith('.docx'));

  if (isDocxFile) {
    switchMode('reader');
    container.classList.add('docx-viewer');
    document.querySelector('.pane-header .title').textContent = 'Read-Only: Word Document';
  } else if (isHtmlFile) {
    switchMode('reader');
    container.classList.add('html-viewer');
  }

  updatePreview();
  updateStats();
});
```

### Renderer .docx Conversion
```javascript
// In updatePreview() function
async function updatePreview() {
  if (isDocxFile) {
    try {
      // Convert base64 back to buffer
      const buffer = Buffer.from(editor.value, 'base64');
      const result = await mammoth.convertToHtml({ buffer: buffer });
      preview.innerHTML = result.value;

      // Log warnings if any
      if (result.messages.length > 0) {
        console.warn('Mammoth conversion warnings:', result.messages);
      }
    } catch (err) {
      preview.innerHTML = `<div style="padding: 20px; color: #d32f2f;">
        <h3>Error Loading Document</h3>
        <p>${err.message}</p>
      </div>`;
      console.error('Failed to convert .docx:', err);
    }
    return;
  }

  if (isHtmlFile) {
    // Existing HTML handling...
  } else {
    // Existing markdown handling...
  }
}
```

## Important Notes

1. **Binary File Handling**: .docx files are ZIP archives (binary). Must read as Buffer, not text.

2. **Async Conversion**: mammoth.js returns Promises. Need to make updatePreview() async or handle Promise properly.

3. **Editor Content**: For .docx, editor contains base64 data (not user-friendly). Editor is hidden in reader mode anyway.

4. **Error Handling**: Show graceful error messages for:
   - Corrupted files
   - Password-protected docs
   - Unsupported .docx features

5. **Save Prevention**: .docx files should NOT be editable. May need to disable save when isDocxFile is true.

## File Locations Reference

- **main.js:1287** - File dialog filters
- **main.js:1424** - Accepted extensions array
- **main.js:1355-1375** - openFileByPath() function
- **renderer.js:22** - Imports section
- **renderer.js:163** - Global variables
- **renderer.js:593-613** - updatePreview() function
- **renderer.js:1109-1170** - file-opened IPC handler
- **renderer.js:1140** - File type detection
- **renderer.js:1176** - New file handler
- **styles.css:1507** - HTML viewer styles (template for .docx)
- **package.json:25-30** - Dependencies

## Testing Scenarios

1. **Basic Open**: File > Open → select .docx → should display in reader mode
2. **Drag & Drop**: Drag .docx into window → should open and display
3. **Complex Doc**: Open .docx with images, tables, lists → verify formatting
4. **Error**: Open corrupted .docx → should show error message
5. **Mode Switch**: Open .docx, then open .md → should switch back to editor mode
6. **Recent Files**: Open .docx, close, reopen via recent files → should work

## Future Enhancements (Post-MVP)

- [ ] Add "Convert to Markdown" button for .docx files
- [ ] Add "Convert to HTML" button (save converted version)
- [ ] Show conversion warnings/info in UI
- [ ] Add loading indicator for large files
- [ ] Support .doc (older format) - may need different library
- [ ] Add .docx to Windows file associations in installer

## Resources

- mammoth.js docs: https://github.com/mwilliamson/mammoth.js
- Existing HTML viewer: renderer.js:1140-1148, styles.css:1507-1520
- File opening flow: main.js:1280-1375

## Session Notes

### 2025-11-21 - Initial Planning
- Created feature branch: feature/docx-viewer
- Completed codebase research
- Identified HTML viewer as perfect template
- Plan approved, ready to implement

### 2025-11-21 - Implementation Complete
- Added mammoth@1.6.0 dependency
- Modified main.js to handle binary .docx files
- Modified renderer.js to detect and convert .docx files
- Implemented read-only mode with "Read-Only: Word Document" indicator
- Added comprehensive error handling
- Ready for testing

### Files Modified
1. package.json - Added mammoth dependency and .docx file association
2. main.js - Added .docx to filters, accepted extensions, and binary file handling
3. renderer.js - Added mammoth import, isDocxFile flag, detection, and conversion logic
4. DOCX_VIEWER_IMPLEMENTATION.md - This implementation guide

### Next Steps
1. Test with sample .docx files
2. Verify all open methods work (dialog, drag-drop, recent files)
3. Test error handling with corrupted/password-protected files
4. Consider adding optional .docx-specific CSS styling
5. Consider adding "Convert to Markdown" or "Convert to HTML" buttons
6. Commit changes to feature branch
7. Create pull request to main
