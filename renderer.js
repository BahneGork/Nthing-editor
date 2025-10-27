const { ipcRenderer, shell } = require('electron');
const { marked } = require('marked');

// CodeMirror imports
const cmView = require('@codemirror/view');
const cmState = require('@codemirror/state');
const langMarkdown = require('@codemirror/lang-markdown');
const cmLanguage = require('@codemirror/language');

// Debug: See what's available in each package
console.log('view exports:', Object.keys(cmView).join(', '));
console.log('state exports:', Object.keys(cmState).join(', '));
console.log('lang-markdown exports:', Object.keys(langMarkdown).join(', '));
console.log('language exports:', Object.keys(cmLanguage).join(', '));

const { EditorView, highlightSpecialChars, drawSelection, highlightActiveLine, keymap } = cmView;
const { EditorState } = cmState;
const { markdown } = langMarkdown;
const { syntaxHighlighting, HighlightStyle, defaultHighlightStyle } = cmLanguage;

// Check if tags are available
console.log('Trying to import tags from language...');
let tags;
try {
  tags = require('@lezer/highlight').tags;
  console.log('Tags imported from @lezer/highlight');
} catch (e) {
  console.log('Could not import from @lezer/highlight, checking cmLanguage...');
  // tags might be in cmLanguage
  if (cmLanguage.tags) {
    tags = cmLanguage.tags;
    console.log('Tags found in cmLanguage');
  } else {
    console.log('Tags not available, will use defaultHighlightStyle');
  }
}

// Create custom highlight style for headers with font sizing
let customHighlightStyle;
if (tags) {
  console.log('Creating custom HighlightStyle with tags...');
  customHighlightStyle = HighlightStyle.define([
    {tag: tags.heading1, fontSize: "2em", fontWeight: "bold"},
    {tag: tags.heading2, fontSize: "1.5em", fontWeight: "bold"},
    {tag: tags.heading3, fontSize: "1.3em", fontWeight: "bold"},
    {tag: tags.heading4, fontSize: "1.1em", fontWeight: "bold"},
    {tag: tags.heading5, fontSize: "1em", fontWeight: "bold"},
    {tag: tags.heading6, fontSize: "1em", fontWeight: "bold"},
    {tag: tags.strong, fontWeight: "bold"},
    {tag: tags.emphasis, fontStyle: "italic"}
  ]);
} else {
  console.log('Tags not available, will use CSS fallback');
}

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const status = document.getElementById('status');
const wordCount = document.getElementById('word-count');
const charCount = document.getElementById('char-count');
const lineCount = document.getElementById('line-count');
const lineNumbers = document.getElementById('line-numbers');
const container = document.querySelector('.container');
const paneTitle = document.getElementById('pane-title');
const syncScrollToggle = document.getElementById('sync-scroll-toggle');
const showFormattingToggle = document.getElementById('show-formatting-toggle');
const showPreviewToggle = document.getElementById('show-preview-toggle');
const codemirrorContainer = document.getElementById('codemirror-container');

let currentFilePath = null;
let currentMode = 'editor'; // 'editor' or 'writing'
let syncScrollEnabled = true; // Scroll sync state
let showFormatting = false; // Formatting display state
let showPreview = true; // Preview visibility state
let codemirrorView = null; // CodeMirror instance

// Configure marked options
marked.setOptions({
  breaks: true,
  gfm: true
});

// Add wikilink support (Obsidian-style [[links]])
marked.use({
  extensions: [{
    name: 'wikilink',
    level: 'inline',
    start(src) { return src.indexOf('[['); },
    tokenizer(src) {
      // Match [[page name]] or [[page name|display text]]
      const match = src.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
      if (match) {
        return {
          type: 'wikilink',
          raw: match[0],
          page: match[1].trim(),
          text: match[2] ? match[2].trim() : match[1].trim()
        };
      }
    },
    renderer(token) {
      return `<a href="#" class="wikilink" title="${token.page}">${token.text}</a>`;
    }
  }]
});

// Update preview and stats on input
editor.addEventListener('input', () => {
  updatePreview();
  updateStats();
  updateLineNumbers();
});

// Scroll synchronization
let isEditorScrolling = false;
let isPreviewScrolling = false;

editor.addEventListener('scroll', () => {
  // Sync line numbers in editor mode
  if (currentMode === 'editor' && lineNumbers) {
    lineNumbers.scrollTop = editor.scrollTop;
  }

  // Sync preview in editor mode only if sync is enabled
  if (currentMode !== 'editor' || !syncScrollEnabled) return;

  if (isPreviewScrolling) {
    isPreviewScrolling = false;
    return;
  }

  isEditorScrolling = true;

  // Calculate scroll percentage
  const scrollPercentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);

  // Apply to preview
  const previewScrollTop = scrollPercentage * (preview.scrollHeight - preview.clientHeight);
  preview.scrollTop = previewScrollTop;

  setTimeout(() => {
    isEditorScrolling = false;
  }, 50);
});

// Bidirectional sync: Allow preview to scroll editor
function handlePreviewScroll() {
  if (currentMode !== 'editor' || !syncScrollEnabled) return;

  if (isEditorScrolling) {
    isEditorScrolling = false;
    return;
  }

  isPreviewScrolling = true;

  // Calculate scroll percentage
  const scrollPercentage = preview.scrollTop / (preview.scrollHeight - preview.clientHeight);

  // Apply to editor
  const editorScrollTop = scrollPercentage * (editor.scrollHeight - editor.clientHeight);
  editor.scrollTop = editorScrollTop;

  setTimeout(() => {
    isPreviewScrolling = false;
  }, 50);
}

preview.addEventListener('scroll', handlePreviewScroll);

// Sync scroll toggle handler
syncScrollToggle.addEventListener('change', (e) => {
  syncScrollEnabled = e.target.checked;
  // Save preference to localStorage
  localStorage.setItem('syncScrollEnabled', syncScrollEnabled);
});

// Load sync scroll preference from localStorage
const savedSyncPref = localStorage.getItem('syncScrollEnabled');
if (savedSyncPref !== null) {
  syncScrollEnabled = savedSyncPref === 'true';
  syncScrollToggle.checked = syncScrollEnabled;
}

// Preview toggle handler
showPreviewToggle.addEventListener('change', (e) => {
  showPreview = e.target.checked;
  if (showPreview) {
    container.classList.remove('hide-preview');
  } else {
    container.classList.add('hide-preview');
  }
  // Save preference to localStorage
  localStorage.setItem('showPreview', showPreview);
});

// Load preview preference from localStorage
const savedPreviewPref = localStorage.getItem('showPreview');
if (savedPreviewPref !== null) {
  showPreview = savedPreviewPref === 'true';
  showPreviewToggle.checked = showPreview;
  if (!showPreview) {
    container.classList.add('hide-preview');
  }
}

function updatePreview() {
  const markdown = editor.value;
  preview.innerHTML = marked.parse(markdown);
}

function updateStats() {
  const text = editor.value;

  // Count words (split by whitespace, filter empty strings)
  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  const wordCountValue = text.trim().length === 0 ? 0 : words.length;

  // Count characters
  const charCountValue = text.length;

  // Count lines
  const lineCountValue = text.split('\n').length;

  wordCount.textContent = `Words: ${wordCountValue}`;
  charCount.textContent = `Characters: ${charCountValue}`;
  lineCount.textContent = `Lines: ${lineCountValue}`;
}

// Update line numbers for Editor mode
function updateLineNumbers() {
  if (currentMode !== 'editor') return;

  const lines = editor.value.split('\n').length;
  let lineNumbersHtml = '';

  for (let i = 1; i <= lines; i++) {
    lineNumbersHtml += i + '\n';
  }

  lineNumbers.textContent = lineNumbersHtml;
}

// Mode switching
function switchMode(mode) {
  currentMode = mode;
  container.setAttribute('data-mode', mode);

  if (mode === 'writing') {
    paneTitle.textContent = 'Writing Focus';
    // Disable scroll sync for preview in writing mode
    preview.removeEventListener('scroll', handlePreviewScroll);
    // Apply formatting if enabled
    if (showFormatting) {
      toggleFormatting(true);
    }
  } else {
    paneTitle.textContent = 'Editor';
    updateLineNumbers();
    // Re-enable scroll sync for preview in editor mode
    preview.addEventListener('scroll', handlePreviewScroll);
    // Disable formatting when leaving writing mode
    if (showFormatting) {
      toggleFormatting(false);
      showFormattingToggle.checked = false;
    }
  }
}

// Listen for mode switch from menu
ipcRenderer.on('switch-mode', (event, mode) => {
  switchMode(mode);
});

// Custom theme for Typora-style markdown rendering
const markdownTheme = EditorView.theme({
  ".cm-content": {
    fontFamily: "'Georgia', 'Times New Roman', serif",
    fontSize: "18px",
    lineHeight: "1.8"
  },
  ".cm-line": {
    padding: "2px 0"
  }
});

// Base markdown style tags - using CodeMirror 6 defaultHighlightStyle class names
const markdownBaseTheme = EditorView.baseTheme({
  // Headers - using cmt- prefix (CodeMirror tags)
  ".cmt-heading1": {
    fontSize: "2em !important",
    fontWeight: "bold !important",
    lineHeight: "1.4"
  },
  ".cmt-heading2": {
    fontSize: "1.5em !important",
    fontWeight: "bold !important",
    lineHeight: "1.4"
  },
  ".cmt-heading3": {
    fontSize: "1.3em !important",
    fontWeight: "bold !important",
    lineHeight: "1.4"
  },
  ".cmt-heading4": {
    fontSize: "1.1em !important",
    fontWeight: "bold !important",
    lineHeight: "1.4"
  },
  ".cmt-heading5, .cmt-heading6": {
    fontSize: "1em",
    fontWeight: "bold !important",
    lineHeight: "1.4"
  },
  // Text formatting
  ".cmt-strong": {
    fontWeight: "bold !important"
  },
  ".cmt-emphasis": {
    fontStyle: "italic !important"
  },
  ".cmt-strikethrough": {
    textDecoration: "line-through !important"
  },
  ".cmt-link": {
    color: "#0066cc !important",
    textDecoration: "underline"
  },
  // Inline code
  ".cmt-monospace": {
    fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace !important",
    backgroundColor: "#f5f5f5",
    padding: "2px 4px",
    borderRadius: "3px",
    fontSize: "0.9em"
  },
  // Quotes
  ".cmt-quote": {
    borderLeft: "4px solid #ddd",
    paddingLeft: "1em",
    color: "#666",
    fontStyle: "italic"
  },
  // YAML frontmatter - reset to normal styling
  ".cmt-meta": {
    fontSize: "14px !important",
    fontWeight: "normal !important",
    fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace !important",
    color: "#666",
    backgroundColor: "#f9f9f9",
    display: "block"
  },
  // Keep markdown syntax marks visible but dimmed
  ".cmt-processingInstruction": {
    color: "#999"
  }
});

// CodeMirror initialization
function initializeCodeMirror() {
  if (codemirrorView) {
    console.log('CodeMirror already initialized, skipping');
    return;
  }

  console.log('Creating CodeMirror state...');
  console.log('Editor content length:', editor.value.length);
  console.log('Container element:', codemirrorContainer);

  const state = EditorState.create({
    doc: editor.value,
    extensions: [
      // Markdown support with syntax highlighting
      markdown(),
      syntaxHighlighting(customHighlightStyle || defaultHighlightStyle),
      // Line wrapping
      EditorView.lineWrapping,
      // Custom themes
      markdownTheme,
      markdownBaseTheme,
      // Content change listener
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          // Sync content back to textarea
          editor.value = update.state.doc.toString();
          updatePreview();
          updateStats();
          updateLineNumbers();
        }
      })
    ]
  });

  console.log('Creating CodeMirror view...');
  codemirrorView = new EditorView({
    state,
    parent: codemirrorContainer
  });
  console.log('CodeMirror view created:', codemirrorView);
  console.log('CodeMirror DOM:', codemirrorView.dom);

  // Debug: Log the actual HTML after a short delay to see class names
  setTimeout(() => {
    console.log('CodeMirror HTML structure:');
    console.log(codemirrorContainer.innerHTML.substring(0, 2000));
  }, 500);
}

// Toggle between plain textarea and CodeMirror formatted view
function toggleFormatting(enabled) {
  console.log('toggleFormatting called:', enabled, 'currentMode:', currentMode);
  showFormatting = enabled;

  if (enabled && currentMode === 'writing') {
    // Show CodeMirror, hide textarea
    editor.classList.add('hidden');
    codemirrorContainer.classList.remove('hidden');

    // Initialize CodeMirror if not already done
    if (!codemirrorView) {
      console.log('Initializing CodeMirror...');
      try {
        initializeCodeMirror();
        console.log('CodeMirror initialized successfully');
      } catch (error) {
        console.error('Error initializing CodeMirror:', error);
      }
    } else {
      // Update CodeMirror with current textarea content
      console.log('Updating existing CodeMirror view');
      codemirrorView.dispatch({
        changes: {
          from: 0,
          to: codemirrorView.state.doc.length,
          insert: editor.value
        }
      });
    }
  } else {
    // Show textarea, hide CodeMirror
    editor.classList.remove('hidden');
    codemirrorContainer.classList.add('hidden');

    // Sync content from CodeMirror to textarea if it exists
    if (codemirrorView) {
      editor.value = codemirrorView.state.doc.toString();
    }
  }

  // Save preference
  localStorage.setItem('showFormatting', enabled);
}

// Formatting toggle handler
showFormattingToggle.addEventListener('change', (e) => {
  toggleFormatting(e.target.checked);
});

// Load formatting preference
const savedFormattingPref = localStorage.getItem('showFormatting');
if (savedFormattingPref !== null) {
  showFormatting = savedFormattingPref === 'true';
  showFormattingToggle.checked = showFormatting;
  if (showFormatting && currentMode === 'writing') {
    toggleFormatting(true);
  }
}

// Listen for file opened
ipcRenderer.on('file-opened', (event, { content, filePath }) => {
  editor.value = content;
  currentFilePath = filePath;
  updatePreview();
  updateStats();
  updateLineNumbers();
  updateStatus(`Opened: ${filePath}`);
});

// Listen for new file
ipcRenderer.on('new-file', () => {
  editor.value = '';
  currentFilePath = null;
  updatePreview();
  updateStats();
  updateLineNumbers();
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

// Find & Replace functionality
const dialog = document.getElementById('find-replace-dialog');
const findInput = document.getElementById('find-input');
const replaceInput = document.getElementById('replace-input');
const caseSensitive = document.getElementById('case-sensitive');
const wholeWord = document.getElementById('whole-word');
const findNextBtn = document.getElementById('find-next-btn');
const findPrevBtn = document.getElementById('find-prev-btn');
const replaceBtn = document.getElementById('replace-btn');
const replaceAllBtn = document.getElementById('replace-all-btn');
const closeDialogBtn = document.getElementById('close-dialog');
const matchCountDisplay = document.getElementById('match-count');

let matches = [];
let currentMatchIndex = -1;
let showReplace = false;

// Listen for show find dialog
ipcRenderer.on('show-find-dialog', (event, withReplace) => {
  showReplace = withReplace;
  if (withReplace) {
    replaceInput.parentElement.style.display = 'flex';
    replaceBtn.style.display = 'inline-block';
    replaceAllBtn.style.display = 'inline-block';
  } else {
    replaceInput.parentElement.style.display = 'none';
    replaceBtn.style.display = 'none';
    replaceAllBtn.style.display = 'none';
  }
  dialog.classList.remove('hidden');
  findInput.focus();
  findInput.select();

  // If there's selected text, use it as the search term
  const selectedText = editor.value.substring(editor.selectionStart, editor.selectionEnd);
  if (selectedText) {
    findInput.value = selectedText;
  }

  if (findInput.value) {
    performFind();
  }
});

closeDialogBtn.addEventListener('click', () => {
  dialog.classList.add('hidden');
  clearHighlights();
});

// Close dialog on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !dialog.classList.contains('hidden')) {
    dialog.classList.add('hidden');
    clearHighlights();
  }
});

findInput.addEventListener('input', performFind);
caseSensitive.addEventListener('change', performFind);
wholeWord.addEventListener('change', performFind);

findNextBtn.addEventListener('click', () => findNext());
findPrevBtn.addEventListener('click', () => findPrevious());
replaceBtn.addEventListener('click', replaceCurrentMatch);
replaceAllBtn.addEventListener('click', replaceAllMatches);

// Enter key in find input = find next
findInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    findNext();
  }
});

// Enter key in replace input = replace current
replaceInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    replaceCurrentMatch();
  }
});

function performFind() {
  const searchText = findInput.value;
  matches = [];
  currentMatchIndex = -1;

  if (!searchText) {
    matchCountDisplay.textContent = '';
    return;
  }

  const text = editor.value;
  const flags = caseSensitive.checked ? 'g' : 'gi';
  let pattern = searchText;

  // Escape special regex characters
  pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  if (wholeWord.checked) {
    pattern = `\\b${pattern}\\b`;
  }

  const regex = new RegExp(pattern, flags);
  let match;

  while ((match = regex.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length
    });
  }

  if (matches.length > 0) {
    matchCountDisplay.textContent = `Found ${matches.length} match${matches.length > 1 ? 'es' : ''}`;
    currentMatchIndex = -1; // Don't auto-select, wait for user to click Find Next
  } else {
    matchCountDisplay.textContent = 'No matches found';
  }
}

function highlightMatches() {
  if (matches.length === 0) return;

  const match = matches[currentMatchIndex];
  editor.focus();
  editor.setSelectionRange(match.start, match.end);

  matchCountDisplay.textContent = `Match ${currentMatchIndex + 1} of ${matches.length}`;
}

function findNext() {
  if (matches.length === 0) {
    performFind();
    return;
  }

  // If no match is selected yet, start at the first one
  if (currentMatchIndex === -1) {
    currentMatchIndex = 0;
  } else {
    currentMatchIndex = (currentMatchIndex + 1) % matches.length;
  }
  highlightMatches();
}

function findPrevious() {
  if (matches.length === 0) {
    performFind();
    return;
  }

  // If no match is selected yet, start at the last one
  if (currentMatchIndex === -1) {
    currentMatchIndex = matches.length - 1;
  } else {
    currentMatchIndex = (currentMatchIndex - 1 + matches.length) % matches.length;
  }
  highlightMatches();
}

function replaceCurrentMatch() {
  if (matches.length === 0 || currentMatchIndex < 0) return;

  const match = matches[currentMatchIndex];
  const text = editor.value;
  const replaceText = replaceInput.value;

  const newText = text.substring(0, match.start) + replaceText + text.substring(match.end);
  editor.value = newText;

  // Update cursor position
  editor.setSelectionRange(match.start, match.start + replaceText.length);

  updatePreview();
  updateStats();

  // Re-perform find to update matches
  performFind();
}

function replaceAllMatches() {
  if (matches.length === 0) return;

  const searchText = findInput.value;
  const replaceText = replaceInput.value;
  const flags = caseSensitive.checked ? 'g' : 'gi';
  let pattern = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  if (wholeWord.checked) {
    pattern = `\\b${pattern}\\b`;
  }

  const regex = new RegExp(pattern, flags);
  const newText = editor.value.replace(regex, replaceText);

  const replaceCount = matches.length;
  editor.value = newText;

  updatePreview();
  updateStats();

  matchCountDisplay.textContent = `Replaced ${replaceCount} match${replaceCount > 1 ? 'es' : ''}`;
  matches = [];
  currentMatchIndex = -1;

  setTimeout(() => {
    if (findInput.value) {
      performFind();
    }
  }, 1000);
}

function clearHighlights() {
  matches = [];
  currentMatchIndex = -1;
  matchCountDisplay.textContent = '';
}

// Handle link clicks in preview
preview.addEventListener('click', (e) => {
  if (e.target.tagName === 'A') {
    e.preventDefault();

    // Wikilinks (internal links) - don't open anywhere, just prevent default
    if (e.target.classList.contains('wikilink')) {
      console.log('Wikilink clicked:', e.target.title || e.target.textContent);
      // Could add functionality here later (e.g., search for file, show tooltip, etc.)
      return;
    }

    // Regular links - open in external browser
    if (e.target.href && !e.target.href.startsWith('#')) {
      shell.openExternal(e.target.href);
    }
  }
});

// Initial preview and stats
updatePreview();
updateStats();
updateLineNumbers();
