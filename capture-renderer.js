/**
 * capture-renderer.js - Quick Capture Window Renderer Process
 *
 * Handles the quick capture window UI and editor functionality
 */

const { ipcRenderer } = require('electron');
const { EditorView, keymap } = require('@codemirror/view');
const { EditorState } = require('@codemirror/state');
const { markdown } = require('@codemirror/lang-markdown');
const { defaultKeymap } = require('@codemirror/commands');

// ==========================================
// Global State
// ==========================================

let editor = null;
let vaults = [];
let clearAfterSend = true;
let showFilenamePreview = true;
let currentFilename = 'untitled.md';
let filenameLocked = false;
let customFilename = null;

// ==========================================
// Editor Initialization
// ==========================================

function initializeEditor() {
  const editorContainer = document.getElementById('capture-editor');

  const state = EditorState.create({
    doc: '',
    extensions: [
      markdown(),
      EditorView.lineWrapping,
      keymap.of(defaultKeymap),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onEditorChange();
        }
      })
    ]
  });

  editor = new EditorView({
    state,
    parent: editorContainer
  });

  // Focus editor on load
  editor.focus();
}

// ==========================================
// Filename Preview Logic
// ==========================================

function onEditorChange() {
  if (!filenameLocked) {
    updateFilenamePreview();
  }
}

function sanitizeFilename(text) {
  if (!text || typeof text !== 'string') {
    return 'untitled';
  }

  return text
    .split('\n')[0]
    .trim()
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '-')
    .replace(/\.+$/g, '')
    .substring(0, 100)
    .replace(/-+$/g, '')
    || 'untitled';
}

function updateFilenamePreview() {
  const content = editor.state.doc.toString();
  const firstLine = content.split('\n')[0].trim();

  const filenameText = document.getElementById('filename-text');

  if (customFilename) {
    // User set custom filename
    currentFilename = customFilename;
    filenameText.textContent = customFilename;
    filenameText.classList.add('locked');
    filenameText.classList.remove('untitled');
  } else if (firstLine) {
    // Auto-generate from first line
    const sanitized = sanitizeFilename(firstLine);
    currentFilename = `${sanitized}.md`;
    filenameText.textContent = currentFilename;
    filenameText.classList.remove('untitled', 'locked');
  } else {
    // Empty - show untitled
    const timestamp = Date.now();
    currentFilename = `untitled-${timestamp}.md`;
    filenameText.textContent = currentFilename;
    filenameText.classList.add('untitled');
    filenameText.classList.remove('locked');
  }
}

// ==========================================
// Vault Buttons
// ==========================================

function generateVaultButtons() {
  const container = document.getElementById('vault-buttons-container');
  container.innerHTML = '';

  if (vaults.length === 0) {
    container.innerHTML = '<span style="color: #999; font-size: 12px;">No vaults configured</span>';
    return;
  }

  vaults.forEach((vault) => {
    if (!vault.enabled) return;

    const button = document.createElement('button');
    button.className = 'vault-btn';
    button.setAttribute('data-vault-id', vault.id);
    button.setAttribute('title', `${vault.name} - ${vault.hotkey}`);

    const icon = document.createElement('span');
    icon.className = 'vault-icon';
    icon.textContent = vault.icon || '📓';
    button.appendChild(icon);

    button.addEventListener('click', () => {
      sendToVault(vault.id);
    });

    container.appendChild(button);
  });
}

// ==========================================
// Send to Vault
// ==========================================

function sendToVault(vaultId) {
  const content = editor.state.doc.toString();

  if (!content.trim()) {
    showToast('Cannot send empty note', 'error');
    return;
  }

  // Get vault configuration
  const vault = vaults.find(v => v.id === vaultId);
  if (!vault) {
    showToast('Vault not found', 'error');
    return;
  }

  // Process filename template
  const filename = processFilenameTemplate(vault, content);

  // Send to main process
  ipcRenderer.send('send-to-vault', {
    vaultId,
    content,
    filename
  });
}

function processFilenameTemplate(vault, content) {
  // If user set custom filename, use it
  if (customFilename) {
    return customFilename;
  }

  // Get filename pattern from vault
  let pattern = vault.filenamePattern || '{{title}}.md';

  // Process template variables
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  const firstLine = content.split('\n')[0].trim();
  const title = sanitizeFilename(firstLine);

  return pattern
    .replace(/\{\{date\}\}/g, `${year}-${month}-${day}`)
    .replace(/\{\{time\}\}/g, `${hours}-${minutes}-${seconds}`)
    .replace(/\{\{datetime\}\}/g, `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`)
    .replace(/\{\{timestamp\}\}/g, `${year}${month}${day}${hours}${minutes}${seconds}`)
    .replace(/\{\{title\}\}/g, title);
}

// ==========================================
// IPC Event Handlers
// ==========================================

// Receive configuration from main process
ipcRenderer.on('capture-config', (event, config) => {
  vaults = config.vaults || [];
  clearAfterSend = config.clearAfterSend;
  showFilenamePreview = config.showFilenamePreview;

  // Regenerate vault buttons
  generateVaultButtons();

  // Update filename preview visibility
  const filenamePreview = document.querySelector('.filename-preview');
  if (showFilenamePreview) {
    filenamePreview.style.display = 'flex';
  } else {
    filenamePreview.style.display = 'none';
  }
});

// Handle send success
ipcRenderer.on('send-to-vault-success', (event, data) => {
  showToast(`Sent to ${data.vaultName} ✓`, 'success');

  // Clear editor if setting enabled
  if (clearAfterSend) {
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: '' }
    });
    customFilename = null;
    filenameLocked = false;
    updateFilenamePreview();
  }

  // Focus editor
  editor.focus();
});

// Handle send error
ipcRenderer.on('send-to-vault-error', (event, data) => {
  showToast(data.error, 'error');
});

// ==========================================
// Toast Notifications
// ==========================================

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast-notification');
  const toastMessage = document.getElementById('toast-message');

  toastMessage.textContent = message;
  toast.className = `toast-notification ${type}`;
  toast.classList.remove('hidden');

  // Auto-hide after 3 seconds
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

// ==========================================
// Filename Editing
// ==========================================

function openFilenameEditDialog() {
  const dialog = document.getElementById('filename-edit-dialog');
  const input = document.getElementById('filename-input');

  input.value = currentFilename;
  dialog.classList.remove('hidden');
  input.focus();
  input.select();
}

function closeFilenameEditDialog() {
  const dialog = document.getElementById('filename-edit-dialog');
  dialog.classList.add('hidden');
}

function saveCustomFilename() {
  const input = document.getElementById('filename-input');
  let value = input.value.trim();

  if (value) {
    // Ensure .md extension
    if (!value.endsWith('.md')) {
      value += '.md';
    }

    customFilename = value;
    filenameLocked = true;
    updateFilenamePreview();
  }

  closeFilenameEditDialog();
  editor.focus();
}

// ==========================================
// Window Controls
// ==========================================

document.getElementById('minimize-btn').addEventListener('click', () => {
  ipcRenderer.send('minimize-window');
});

document.getElementById('close-btn').addEventListener('click', () => {
  ipcRenderer.send('close-window');
});

// ==========================================
// Filename Edit Dialog Handlers
// ==========================================

document.getElementById('edit-filename-btn').addEventListener('click', () => {
  openFilenameEditDialog();
});

document.getElementById('close-filename-dialog').addEventListener('click', () => {
  closeFilenameEditDialog();
});

document.getElementById('cancel-filename-btn').addEventListener('click', () => {
  closeFilenameEditDialog();
});

document.getElementById('save-filename-btn').addEventListener('click', () => {
  saveCustomFilename();
});

// Enter to save, Escape to cancel
document.getElementById('filename-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    saveCustomFilename();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    closeFilenameEditDialog();
  }
});

// ==========================================
// Keyboard Shortcuts
// ==========================================

document.addEventListener('keydown', (e) => {
  // Escape to close window
  if (e.key === 'Escape' && !document.getElementById('filename-edit-dialog').classList.contains('hidden')) {
    // Close dialog if open
    closeFilenameEditDialog();
    return;
  }

  if (e.key === 'Escape') {
    ipcRenderer.send('close-window');
    return;
  }

  // Ctrl+1-9 to send to vault
  if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
    e.preventDefault();
    const index = parseInt(e.key) - 1;

    // Find vault with matching hotkey
    const vault = vaults.find(v => v.hotkey === `Ctrl+${e.key}` && v.enabled);
    if (vault) {
      sendToVault(vault.id);
    }
  }
});

// ==========================================
// Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  initializeEditor();
  generateVaultButtons();
  updateFilenamePreview();
});
