const { ipcRenderer } = require('electron');
const { marked } = require('marked');

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const status = document.getElementById('status');

let currentFilePath = null;

// Configure marked options
marked.setOptions({
  breaks: true,
  gfm: true
});

// Update preview on input
editor.addEventListener('input', () => {
  updatePreview();
});

function updatePreview() {
  const markdown = editor.value;
  preview.innerHTML = marked.parse(markdown);
}

// Listen for file opened
ipcRenderer.on('file-opened', (event, { content, filePath }) => {
  editor.value = content;
  currentFilePath = filePath;
  updatePreview();
  updateStatus(`Opened: ${filePath}`);
});

// Listen for new file
ipcRenderer.on('new-file', () => {
  editor.value = '';
  currentFilePath = null;
  updatePreview();
  updateStatus('New file');
});

// Listen for save request
ipcRenderer.on('save-file-request', () => {
  const content = editor.value;
  ipcRenderer.send('save-content', content);
});

// Listen for file saved
ipcRenderer.on('file-saved', (event, filePath) => {
  currentFilePath = filePath;
  updateStatus(`Saved: ${filePath}`);
});

function updateStatus(message) {
  status.textContent = message;
  setTimeout(() => {
    if (currentFilePath) {
      status.textContent = currentFilePath;
    } else {
      status.textContent = 'Ready';
    }
  }, 2000);
}

// Initial preview
updatePreview();
