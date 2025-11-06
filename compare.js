/**
 * compare.js - Backup Comparison Window (Renderer Process)
 *
 * This file runs in a separate window for comparing current file vs backup.
 * Responsibilities:
 * - Perform line-by-line diff between current and backup content
 * - Display color-coded diff (red=removed, green=added, white=unchanged)
 * - Interactive line restoration (click arrows to select lines)
 * - Preview selected lines in left pane
 * - Send restored content back to main window
 * - Full backup restoration
 *
 * Diff Algorithm:
 * Simple line-by-line comparison (not using Myers or LCS algorithms).
 * Classifies each line as: unchanged, removed, added, or modified.
 * Modified lines are shown as removed+added for clarity.
 */

const { ipcRenderer } = require('electron');

// ==========================================
// DOM Element References
// ==========================================

const currentContent = document.getElementById('current-content');
const backupContent = document.getElementById('backup-content');
const backupVersion = document.getElementById('backup-version');
const backupTime = document.getElementById('backup-time');
const removedCount = document.getElementById('removed-count');
const addedCount = document.getElementById('added-count');
const selectionCount = document.getElementById('selection-count');
const finalizeBtn = document.getElementById('finalize-btn');
const restoreFullBtn = document.getElementById('restore-full-btn');
const closeWindowBtn = document.getElementById('close-window-btn');

// Title bar controls
const minimizeBtn = document.getElementById('minimize-btn');
const maximizeBtn = document.getElementById('maximize-btn');
const closeBtn = document.getElementById('close-btn');

// ==========================================
// State
// ==========================================

let currentText = '';        // Current file content
let backupText = '';         // Backup file content
let currentLines = [];       // Current file split into lines
let backupLines = [];        // Backup file split into lines
let diffData = [];           // Array of diff objects {type, currentLine, backupLine, index}
let selectedLines = new Set(); // Indexes of backup lines user has selected to restore
let versionId = '';          // Backup version ID (e.g., "v003")

// Title bar functionality
minimizeBtn.addEventListener('click', () => {
  ipcRenderer.send('minimize-compare-window');
});

maximizeBtn.addEventListener('click', () => {
  ipcRenderer.send('maximize-compare-window');
});

closeBtn.addEventListener('click', () => {
  window.close();
});

closeWindowBtn.addEventListener('click', () => {
  window.close();
});

// Receive comparison data from main process
ipcRenderer.on('compare-data', (event, data) => {
  currentText = data.current;
  backupText = data.backup;
  versionId = data.versionId;

  backupVersion.textContent = data.versionId;
  backupTime.textContent = data.timestamp ? `(${data.timestamp})` : '';

  performDiff();
  renderDiff();
  updateSummary();
});

/**
 * Perform line-by-line diff between current and backup content
 *
 * Algorithm:
 * 1. Split both files into arrays of lines
 * 2. Compare line-by-line at each index position
 * 3. Classify each line pair:
 *    - unchanged: both lines exist and are identical
 *    - modified: both lines exist but differ
 *    - removed: line exists in current but not backup (will be lost on restore)
 *    - added: line exists in backup but not current (will be restored)
 *
 * Note: This is a simple positional diff, not a smart LCS (Longest Common Subsequence)
 * algorithm. It works well for small edits but may not optimally align heavily
 * rearranged content. The advantage is simplicity and speed.
 */
function performDiff() {
  currentLines = currentText.split('\n');
  backupLines = backupText.split('\n');

  diffData = [];

  // Compare up to the longest file's line count
  const maxLines = Math.max(currentLines.length, backupLines.length);

  for (let i = 0; i < maxLines; i++) {
    const currentLine = i < currentLines.length ? currentLines[i] : null;
    const backupLine = i < backupLines.length ? backupLines[i] : null;

    if (currentLine === backupLine) {
      // Lines match - unchanged
      diffData.push({
        type: 'unchanged',
        current: currentLine,
        backup: backupLine,
        lineNum: i
      });
    } else if (currentLine !== null && backupLine !== null) {
      // Both exist but differ - modified
      // Shown as red (current) and green (backup) in UI
      diffData.push({
        type: 'modified',
        current: currentLine,
        backup: backupLine,
        lineNum: i
      });
    } else if (currentLine !== null && backupLine === null) {
      // Only in current file - will be removed on restore
      diffData.push({
        type: 'removed',
        current: currentLine,
        backup: null,
        lineNum: i
      });
    } else if (currentLine === null && backupLine !== null) {
      // Only in backup - will be added on restore
      diffData.push({
        type: 'added',
        current: null,
        backup: backupLine,
        lineNum: i
      });
    }
  }
}

// Render the diff in both panes
function renderDiff() {
  const currentHTML = [];
  const backupHTML = [];

  diffData.forEach((diff, index) => {
    if (diff.type === 'unchanged') {
      // Show in both panes
      currentHTML.push(`<div class="diff-line unchanged"><span class="line-text">${escapeHtml(diff.current)}</span></div>`);
      backupHTML.push(`<div class="diff-line unchanged"><span class="line-text">${escapeHtml(diff.backup)}</span></div>`);
    } else if (diff.type === 'modified') {
      // Current shows what will be lost (red)
      currentHTML.push(`<div class="diff-line removed"><span class="line-text">${escapeHtml(diff.current)}</span></div>`);
      // Backup shows what will replace it (green) with restore button
      backupHTML.push(`<div class="diff-line added">
        <button class="restore-arrow" data-index="${index}">←</button>
        <span class="line-text">${escapeHtml(diff.backup)}</span>
      </div>`);
    } else if (diff.type === 'removed') {
      // Only in current (red) - will be deleted on full restore
      currentHTML.push(`<div class="diff-line removed"><span class="line-text">${escapeHtml(diff.current)}</span></div>`);
      backupHTML.push(`<div class="diff-line unchanged"><span class="line-text">&nbsp;</span></div>`);
    } else if (diff.type === 'added') {
      // Only in backup (green) - will be added on full restore
      currentHTML.push(`<div class="diff-line unchanged"><span class="line-text">&nbsp;</span></div>`);
      backupHTML.push(`<div class="diff-line added">
        <button class="restore-arrow" data-index="${index}">←</button>
        <span class="line-text">${escapeHtml(diff.backup)}</span>
      </div>`);
    }
  });

  currentContent.innerHTML = currentHTML.join('');
  backupContent.innerHTML = backupHTML.join('');

  // Attach click handlers to restore arrows
  backupContent.querySelectorAll('.restore-arrow').forEach(arrow => {
    arrow.addEventListener('click', handleRestoreArrowClick);
  });

  // Synchronize scrolling
  setupScrollSync();
}

// Handle clicking restore arrow
function handleRestoreArrowClick(e) {
  const index = parseInt(e.target.dataset.index);
  const diff = diffData[index];

  if (!diff) return;

  if (selectedLines.has(index)) {
    // Deselect
    selectedLines.delete(index);
    e.target.classList.remove('selected');
    e.target.textContent = '←';
  } else {
    // Select
    selectedLines.add(index);
    e.target.classList.add('selected');
    e.target.textContent = '✓';
  }

  updatePreview();
  updateSelectionCount();
}

// Update the current pane to show preview of restoration
function updatePreview() {
  const previewLines = [...currentLines];

  // Apply selected changes
  selectedLines.forEach(index => {
    const diff = diffData[index];
    if (diff.type === 'modified') {
      // Replace current line with backup line
      previewLines[diff.lineNum] = diff.backup;
    } else if (diff.type === 'added') {
      // Insert backup line
      previewLines.splice(diff.lineNum, 0, diff.backup);
    }
  });

  // Re-render current pane
  const currentHTML = [];
  previewLines.forEach((line, i) => {
    const isRestored = Array.from(selectedLines).some(idx => {
      const diff = diffData[idx];
      return diff && diff.lineNum === i && (diff.type === 'modified' || diff.type === 'added');
    });

    if (isRestored) {
      currentHTML.push(`<div class="diff-line added"><span class="line-text">${escapeHtml(line)}</span></div>`);
    } else {
      currentHTML.push(`<div class="diff-line unchanged"><span class="line-text">${escapeHtml(line)}</span></div>`);
    }
  });

  currentContent.innerHTML = currentHTML.join('');
}

// Update summary statistics
function updateSummary() {
  let removedLines = 0;
  let addedLines = 0;

  diffData.forEach(diff => {
    if (diff.type === 'removed' || diff.type === 'modified') {
      removedLines++;
    }
    if (diff.type === 'added' || diff.type === 'modified') {
      addedLines++;
    }
  });

  removedCount.textContent = removedLines;
  addedCount.textContent = addedLines;
}

// Update selection count and button state
function updateSelectionCount() {
  if (selectedLines.size === 0) {
    selectionCount.textContent = 'No lines selected';
    finalizeBtn.disabled = true;
  } else {
    selectionCount.textContent = `${selectedLines.size} line${selectedLines.size > 1 ? 's' : ''} selected for restoration`;
    finalizeBtn.disabled = false;
  }
}

// Finalize restoration (apply selected lines)
finalizeBtn.addEventListener('click', () => {
  if (selectedLines.size === 0) return;

  // Build the restored content
  const restoredLines = [...currentLines];

  // Apply selected changes
  const sortedSelections = Array.from(selectedLines).sort((a, b) => a - b);
  sortedSelections.forEach(index => {
    const diff = diffData[index];
    if (diff.type === 'modified') {
      restoredLines[diff.lineNum] = diff.backup;
    } else if (diff.type === 'added') {
      restoredLines.splice(diff.lineNum, 0, diff.backup);
    }
  });

  const restoredContent = restoredLines.join('\n');

  // Send to main window
  ipcRenderer.send('apply-partial-restore', restoredContent);
  window.close();
});

// Restore full backup
restoreFullBtn.addEventListener('click', () => {
  const confirmed = confirm(
    'Restore entire backup?\n\n' +
    'This will replace your current content with the backup version.\n' +
    (selectedLines.size > 0 ? 'Your individual line selections will be ignored.\n\n' : '\n') +
    'Are you sure?'
  );

  if (!confirmed) return;

  // Send backup content to main window
  ipcRenderer.send('apply-full-restore', backupText);
  window.close();
});

// Setup synchronized scrolling
function setupScrollSync() {
  let isCurrentScrolling = false;
  let isBackupScrolling = false;

  currentContent.parentElement.addEventListener('scroll', () => {
    if (isBackupScrolling) {
      isBackupScrolling = false;
      return;
    }
    isCurrentScrolling = true;

    const scrollPercent = currentContent.parentElement.scrollTop /
                         (currentContent.parentElement.scrollHeight - currentContent.parentElement.clientHeight);

    backupContent.parentElement.scrollTop = scrollPercent *
                                            (backupContent.parentElement.scrollHeight - backupContent.parentElement.clientHeight);
  });

  backupContent.parentElement.addEventListener('scroll', () => {
    if (isCurrentScrolling) {
      isCurrentScrolling = false;
      return;
    }
    isBackupScrolling = true;

    const scrollPercent = backupContent.parentElement.scrollTop /
                         (backupContent.parentElement.scrollHeight - backupContent.parentElement.clientHeight);

    currentContent.parentElement.scrollTop = scrollPercent *
                                             (currentContent.parentElement.scrollHeight - currentContent.parentElement.clientHeight);
  });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
