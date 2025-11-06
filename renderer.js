/**
 * renderer.js - Electron Renderer Process (Main Window)
 *
 * This file runs in the browser/renderer context with DOM access.
 * Responsibilities:
 * - UI interactions and updates
 * - Markdown rendering with marked.js
 * - Editor mode switching (Editor Mode vs Writing Focus Mode)
 * - Search & Replace functionality
 * - Synchronized scrolling between editor and preview
 * - Image handling (paste and drag & drop)
 * - Autosave UI updates
 * - Backup sidebar management
 * - CodeMirror integration for Writing Focus mode with formatting
 * - Resizable pane separator
 *
 * Communicates with main process via IPC for file operations and window management.
 * Cannot directly access file system - must ask main process via ipcRenderer.send().
 */

const { ipcRenderer, shell } = require('electron');
const { marked } = require('marked');

// ==========================================
// DOM Element References
// ==========================================

// Custom title bar controls
const minimizeBtn = document.getElementById('minimize-btn');
const maximizeBtn = document.getElementById('maximize-btn');
const closeBtn = document.getElementById('close-btn');
const menuBtn = document.getElementById('menu-btn');
const titlebarText = document.getElementById('titlebar-text');
const toggleViewBtn = document.getElementById('toggle-view-btn');

minimizeBtn.addEventListener('click', () => {
  ipcRenderer.send('minimize-window');
});

maximizeBtn.addEventListener('click', () => {
  ipcRenderer.send('maximize-window');
});

closeBtn.addEventListener('click', () => {
  ipcRenderer.send('close-window');
});

// Menu button - shows application menu
menuBtn.addEventListener('click', () => {
  ipcRenderer.send('show-menu');
});

// Toggle view mode button
toggleViewBtn.addEventListener('click', () => {
  toggleViewMode();
});

// Alt key shows menu
document.addEventListener('keydown', (e) => {
  if (e.altKey && !e.ctrlKey && !e.shiftKey && e.key === 'Alt') {
    ipcRenderer.send('show-menu');
  }

  // Ctrl+1 through Ctrl+9 for recent files
  if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
    const num = parseInt(e.key);
    if (num >= 1 && num <= 9) {
      e.preventDefault();
      ipcRenderer.send('open-recent-file-by-index', num - 1);
    }
  }

  // F9 to toggle view mode
  if (e.key === 'F9' && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
    e.preventDefault();
    toggleViewMode();
  }
});

// Listen for title updates from main process
ipcRenderer.on('update-title', (event, titleText) => {
  titlebarText.textContent = titleText;
});

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
    {tag: tags.emphasis, fontStyle: "italic"},
    // YAML frontmatter - grey monospace styling
    {tag: tags.meta, fontSize: "13px", fontWeight: "normal", fontFamily: "Consolas, Monaco, monospace", color: "#6b7280", backgroundColor: "#f9fafb"},
    {tag: tags.processingInstruction, color: "#999"}
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
const focusModeToggle = document.getElementById('focus-mode-toggle');
const typewriterModeToggle = document.getElementById('typewriter-mode-toggle');
const showPreviewToggle = document.getElementById('show-preview-toggle');
const codemirrorContainer = document.getElementById('codemirror-container');
const autosaveStatus = document.getElementById('autosave-status');

let currentFilePath = null;
let currentMode = 'editor'; // 'editor' or 'writing'
let syncScrollEnabled = true; // Scroll sync state
let showFormatting = false; // Formatting display state
let showPreview = true; // Preview visibility state
let codemirrorView = null; // CodeMirror instance
let contentChangedSinceLastSave = false; // Track unsaved changes
let contentChangeTimeout = null; // Debounce timer
let focusModeEnabled = false; // Focus mode state - dims non-active lines
let currentActiveLine = null; // Track the currently active line for focus mode
let typewriterModeEnabled = false; // Typewriter mode state - keeps cursor vertically centered

// Configure marked options
marked.setOptions({
  breaks: true,
  gfm: true
});

// Add custom markdown extensions
marked.use({
  extensions: [
    // Wikilink support (Obsidian-style [[links]])
    {
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
    },
    // Hashtag support (#tag)
    {
      name: 'hashtag',
      level: 'inline',
      start(src) { return src.indexOf('#'); },
      tokenizer(src) {
        // Match #tag (word boundary before and after)
        const match = src.match(/^#([a-zA-Z0-9_-]+)/);
        if (match && (src === match[0] || src[match[0].length].match(/[\s.,;!?)]|$/))) {
          return {
            type: 'hashtag',
            raw: match[0],
            tag: match[1]
          };
        }
      },
      renderer(token) {
        return `<span class="hashtag">#${token.tag}</span>`;
      }
    }
  ]
});

// Custom renderer to handle YAML frontmatter
const defaultRenderer = new marked.Renderer();
marked.use({
  renderer: {
    code(code, language) {
      // Check if this is YAML frontmatter
      if (language === 'yaml' && code.trim().startsWith('---')) {
        return `<pre class="frontmatter"><code>${code}</code></pre>`;
      }
      // Regular code blocks
      return `<pre><code class="language-${language || 'plaintext'}">${code}</code></pre>`;
    }
  }
});

// Pre-process to detect YAML frontmatter at document start
const originalParse = marked.parse.bind(marked);
marked.parse = function(src, options) {
  // Detect YAML frontmatter (--- at start, --- at end)
  const frontmatterMatch = src.match(/^---\n([\s\S]*?)\n---\n/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const content = src.slice(frontmatterMatch[0].length);
    const frontmatterHtml = `<pre class="frontmatter"><code>${frontmatter}</code></pre>`;
    return frontmatterHtml + originalParse(content, options);
  }
  return originalParse(src, options);
};

// Update preview and stats on input
editor.addEventListener('input', () => {
  updatePreview();
  updateStats();
  updateLineNumbers();

  // Clear find highlights when content changes
  clearHighlightOverlay();
  matches = [];
  currentMatchIndex = -1;

  // Mark content as changed and notify main process (debounced)
  if (!contentChangedSinceLastSave) {
    contentChangedSinceLastSave = true;
    // Clear existing timeout
    if (contentChangeTimeout) {
      clearTimeout(contentChangeTimeout);
    }
    // Debounce: wait 300ms before sending the message
    contentChangeTimeout = setTimeout(() => {
      ipcRenderer.send('content-changed');
    }, 300);
  }
});

// Auto-continue lists on Enter
editor.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
    const cursorPos = editor.selectionStart;
    const text = editor.value;

    // Find the current line
    const lineStart = text.lastIndexOf('\n', cursorPos - 1) + 1;
    const lineEnd = text.indexOf('\n', cursorPos);
    const currentLine = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd);

    // Check for bullet list (-, *, +)
    const bulletMatch = currentLine.match(/^(\s*)([-*+])\s+(.*)$/);
    if (bulletMatch) {
      e.preventDefault();
      const indent = bulletMatch[1];
      const bullet = bulletMatch[2];
      const content = bulletMatch[3];

      // If line is empty (just the bullet), remove it and create normal line
      if (content.trim() === '') {
        const newText = text.substring(0, lineStart) + indent + text.substring(cursorPos);
        editor.value = newText;
        editor.setSelectionRange(lineStart + indent.length, lineStart + indent.length);
      } else {
        // Continue the bullet list
        const newBullet = `\n${indent}${bullet} `;
        const newText = text.substring(0, cursorPos) + newBullet + text.substring(cursorPos);
        editor.value = newText;
        editor.setSelectionRange(cursorPos + newBullet.length, cursorPos + newBullet.length);
      }

      updatePreview();
      updateStats();
      updateLineNumbers();
      return;
    }

    // Check for numbered list (1., 2., etc.)
    const numberMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (numberMatch) {
      e.preventDefault();
      const indent = numberMatch[1];
      const number = parseInt(numberMatch[2]);
      const content = numberMatch[3];

      // If line is empty (just the number), remove it and create normal line
      if (content.trim() === '') {
        const newText = text.substring(0, lineStart) + indent + text.substring(cursorPos);
        editor.value = newText;
        editor.setSelectionRange(lineStart + indent.length, lineStart + indent.length);
      } else {
        // Continue the numbered list
        const newNumber = `\n${indent}${number + 1}. `;
        const newText = text.substring(0, cursorPos) + newNumber + text.substring(cursorPos);
        editor.value = newText;
        editor.setSelectionRange(cursorPos + newNumber.length, cursorPos + newNumber.length);
      }

      updatePreview();
      updateStats();
      updateLineNumbers();
      return;
    }
  }
});

// Handle image paste from clipboard
editor.addEventListener('paste', async (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();

      const file = item.getAsFile();
      if (!file) continue;

      // Read file as base64
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = event.target.result;

        // Send to main process to save image
        ipcRenderer.send('save-pasted-image', {
          data: base64Data,
          type: file.type
        });
      };
      reader.readAsDataURL(file);
      break;
    }
  }
});

// Handle drag and drop for images
editor.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
});

editor.addEventListener('drop', async (e) => {
  e.preventDefault();
  e.stopPropagation();

  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) return;

  // Check if it's a markdown/text file first
  const firstFile = files[0];
  const fileName = firstFile.name.toLowerCase();
  const isTextFile = fileName.endsWith('.md') ||
                     fileName.endsWith('.markdown') ||
                     fileName.endsWith('.txt');

  if (isTextFile) {
    // Handle text file drop - open the file
    const filePath = firstFile.path;
    ipcRenderer.send('open-dropped-file', filePath);
    return;
  }

  // Handle image drops
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = event.target.result;

        // Send to main process to save image
        ipcRenderer.send('save-dropped-image', {
          data: base64Data,
          type: file.type,
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  }
});

// Listen for image saved response
ipcRenderer.on('image-saved', (event, imagePath) => {
  // Insert markdown image syntax at cursor
  const cursorPos = editor.selectionStart;
  const textBefore = editor.value.substring(0, cursorPos);
  const textAfter = editor.value.substring(cursorPos);

  const imageMarkdown = `![image](${imagePath})`;
  editor.value = textBefore + imageMarkdown + textAfter;

  // Place cursor after inserted image
  const newCursorPos = cursorPos + imageMarkdown.length;
  editor.setSelectionRange(newCursorPos, newCursorPos);
  editor.focus();

  updatePreview();
  updateStats();
  updateLineNumbers();

  // Update CodeMirror if in writing mode with formatting
  if (currentMode === 'writing' && showFormatting && codemirrorView) {
    codemirrorView.dispatch({
      changes: {
        from: 0,
        to: codemirrorView.state.doc.length,
        insert: editor.value
      }
    });
  }
});

// Scroll synchronization
let isEditorScrolling = false;
let isPreviewScrolling = false;

// ==========================================
// Synchronized Scrolling (Editor ↔ Preview)
// ==========================================
// When scrolling either pane, the other pane scrolls to maintain relative position.
// Uses percentage-based scrolling so it works regardless of content length differences.
//
// To prevent infinite loops:
// - Set isEditorScrolling = true before updating preview scroll
// - Set isPreviewScrolling = true before updating editor scroll
// - Check these flags at the start of each handler to break the loop
// - Reset flags after 50ms timeout

editor.addEventListener('scroll', () => {
  // Keep line numbers in sync with editor scroll position
  if (currentMode === 'editor' && lineNumbers) {
    lineNumbers.scrollTop = editor.scrollTop;
  }

  // Update find/replace highlight overlay position
  if (currentMatchIndex >= 0 && matches.length > 0) {
    drawHighlightOverlay(matches[currentMatchIndex]);
  }

  // Only sync in Editor Mode when sync is enabled
  if (currentMode !== 'editor' || !syncScrollEnabled) return;

  // Break infinite loop: if preview triggered this, ignore
  if (isPreviewScrolling) {
    isPreviewScrolling = false;
    return;
  }

  isEditorScrolling = true;

  // Calculate scroll position as percentage (0.0 to 1.0)
  const scrollPercentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);

  // Apply same percentage to preview
  const previewScrollTop = scrollPercentage * (preview.scrollHeight - preview.clientHeight);
  preview.scrollTop = previewScrollTop;

  // Reset flag after brief delay
  setTimeout(() => {
    isEditorScrolling = false;
  }, 50);
});

// Bidirectional sync: Allow preview to scroll editor
function handlePreviewScroll() {
  // Only sync in Editor Mode when sync is enabled
  if (currentMode !== 'editor' || !syncScrollEnabled) return;

  // Break infinite loop: if editor triggered this, ignore
  if (isEditorScrolling) {
    isEditorScrolling = false;
    return;
  }

  isPreviewScrolling = true;

  // Calculate scroll position as percentage (0.0 to 1.0)
  const scrollPercentage = preview.scrollTop / (preview.scrollHeight - preview.clientHeight);

  // Apply same percentage to editor
  const editorScrollTop = scrollPercentage * (editor.scrollHeight - editor.clientHeight);
  editor.scrollTop = editorScrollTop;

  // Reset flag after brief delay
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
    // Re-enable sync scroll checkbox
    syncScrollToggle.disabled = false;
  } else {
    container.classList.add('hide-preview');
    // Disable sync scroll when preview is hidden (no preview to sync with)
    syncScrollEnabled = false;
    syncScrollToggle.checked = false;
    syncScrollToggle.disabled = true;
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
    // Also disable sync scroll if preview is hidden
    syncScrollEnabled = false;
    syncScrollToggle.checked = false;
    syncScrollToggle.disabled = true;
  }
}

function updatePreview() {
  const markdown = editor.value;
  preview.innerHTML = marked.parse(markdown);

  // Apply syntax highlighting to code blocks
  if (typeof hljs !== 'undefined') {
    preview.querySelectorAll('pre code').forEach((block) => {
      // Skip frontmatter blocks
      if (!block.parentElement.classList.contains('frontmatter')) {
        hljs.highlightElement(block);
      }
    });
  }
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
    // Disable focus mode and typewriter mode when switching to editor mode
    if (focusModeEnabled) {
      toggleFocusMode(false);
    }
    if (typewriterModeEnabled) {
      toggleTypewriterMode(false);
    }
    codemirrorContainer.classList.remove('focus-mode-enabled');
  }
}

// Toggle between Editor and Writing Focus modes
function toggleViewMode() {
  const newMode = currentMode === 'editor' ? 'writing' : 'editor';
  switchMode(newMode);
}

// Toggle Focus Mode - dims non-active lines in Writing Focus mode
function toggleFocusMode(enabled) {
  focusModeEnabled = enabled;

  // Update checkbox to match
  if (focusModeToggle) {
    focusModeToggle.checked = enabled;
  }

  // Only apply focus mode when in writing mode with CodeMirror active
  if (codemirrorView && currentMode === 'writing' && showFormatting) {
    if (enabled) {
      codemirrorContainer.classList.add('focus-mode-enabled');

      // Debug: Check what classes are on the lines
      console.log('Focus mode enabled. Checking line classes...');
      setTimeout(() => {
        const lines = codemirrorContainer.querySelectorAll('.cm-line');
        console.log('Total lines:', lines.length);
        lines.forEach((line, i) => {
          if (line.classList.contains('cm-activeLine') || line.classList.contains('cm-active-line')) {
            console.log('Active line found at index', i, 'with classes:', line.className);
          }
        });
      }, 100);
    } else {
      codemirrorContainer.classList.remove('focus-mode-enabled');
    }
  }
}

// Toggle Typewriter Mode - keeps cursor vertically centered
function toggleTypewriterMode(enabled) {
  typewriterModeEnabled = enabled;

  // Update checkbox to match
  if (typewriterModeToggle) {
    typewriterModeToggle.checked = enabled;
  }

  // Center the cursor immediately if enabling
  if (enabled && codemirrorView && currentMode === 'writing' && showFormatting) {
    centerCursor();
  }
}

// Center the cursor in the viewport
function centerCursor() {
  if (!codemirrorView) return;

  const selection = codemirrorView.state.selection.main;
  codemirrorView.dispatch({
    effects: EditorView.scrollIntoView(selection.head, {
      y: 'center',
      yMargin: 0
    })
  });
}

// Listen for mode switch from menu
ipcRenderer.on('switch-mode', (event, mode) => {
  switchMode(mode);
});

// Listen for toggle mode from menu
ipcRenderer.on('toggle-mode', () => {
  toggleViewMode();
});

// Listen for focus mode toggle from menu
ipcRenderer.on('toggle-focus-mode', (event, enabled) => {
  toggleFocusMode(enabled);
});

// Listen for typewriter mode toggle from menu
ipcRenderer.on('toggle-typewriter-mode', (event, enabled) => {
  toggleTypewriterMode(enabled);
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
  // YAML frontmatter - grey styling to match preview
  ".cmt-meta": {
    fontSize: "13px !important",
    fontWeight: "normal !important",
    fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace !important",
    color: "#6b7280 !important",
    backgroundColor: "#f9fafb !important",
    display: "inline-block",
    padding: "0 2px"
  },
  // Keep markdown syntax marks visible but dimmed
  ".cmt-processingInstruction": {
    color: "#999 !important"
  },
  // Additional YAML frontmatter line styling
  ".cm-line:has(.cmt-meta)": {
    backgroundColor: "#f9fafb"
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
      // Highlight active line for focus mode
      highlightActiveLine(),
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

          // Mark content as changed and notify main process (debounced)
          if (!contentChangedSinceLastSave) {
            contentChangedSinceLastSave = true;
            // Clear existing timeout
            if (contentChangeTimeout) {
              clearTimeout(contentChangeTimeout);
            }
            // Debounce: wait 300ms before sending the message
            contentChangeTimeout = setTimeout(() => {
              ipcRenderer.send('content-changed');
            }, 300);
          }
        }

        // Typewriter mode - center cursor when selection changes
        if (update.selectionSet && typewriterModeEnabled && currentMode === 'writing' && showFormatting) {
          centerCursor();
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

    // Apply focus mode if it's enabled
    if (focusModeEnabled) {
      codemirrorContainer.classList.add('focus-mode-enabled');
    }
  } else {
    // Show textarea, hide CodeMirror
    editor.classList.remove('hidden');
    codemirrorContainer.classList.add('hidden');

    // Remove focus mode when disabling formatting
    codemirrorContainer.classList.remove('focus-mode-enabled');

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

// Focus mode toggle handler
focusModeToggle.addEventListener('change', (e) => {
  toggleFocusMode(e.target.checked);
});

// Typewriter mode toggle handler
typewriterModeToggle.addEventListener('change', (e) => {
  toggleTypewriterMode(e.target.checked);
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
  contentChangedSinceLastSave = false; // Reset unsaved flag

  // CRITICAL: Update CodeMirror view if active (Show Formatting enabled)
  if (codemirrorView) {
    codemirrorView.dispatch({
      changes: {
        from: 0,
        to: codemirrorView.state.doc.length,
        insert: content
      }
    });
  }

  updatePreview();
  updateStats();
  updateLineNumbers();
  updateStatus(`Opened: ${filePath}`);
});

// Listen for new file
ipcRenderer.on('new-file', () => {
  editor.value = '';
  currentFilePath = null;
  contentChangedSinceLastSave = false; // Reset unsaved flag for new file

  // CRITICAL: Update CodeMirror view if active (Show Formatting enabled)
  if (codemirrorView) {
    codemirrorView.dispatch({
      changes: {
        from: 0,
        to: codemirrorView.state.doc.length,
        insert: ''
      }
    });
  }

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
  contentChangedSinceLastSave = false; // Reset unsaved flag after save
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
const dialogTitle = document.getElementById('dialog-title');
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
const highlightOverlay = document.getElementById('highlight-overlay');

// Make dialog draggable
let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;

const dialogHeader = dialog.querySelector('.dialog-header');

dialogHeader.addEventListener('mousedown', (e) => {
  isDragging = true;

  // If dialog hasn't been moved yet, calculate position from getBoundingClientRect
  // to account for the CSS transform: translate(-50%, -50%)
  const rect = dialog.getBoundingClientRect();

  // Calculate offset from mouse position to dialog's current position
  initialX = e.clientX - rect.left;
  initialY = e.clientY - rect.top;

  dialogHeader.style.cursor = 'grabbing';
});

document.addEventListener('mousemove', (e) => {
  if (isDragging) {
    e.preventDefault();

    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;

    // Keep dialog within viewport bounds
    const maxX = window.innerWidth - dialog.offsetWidth;
    const maxY = window.innerHeight - dialog.offsetHeight;

    currentX = Math.max(0, Math.min(currentX, maxX));
    currentY = Math.max(0, Math.min(currentY, maxY));

    dialog.style.left = currentX + 'px';
    dialog.style.top = currentY + 'px';
    dialog.style.transform = 'none';
  }
});

document.addEventListener('mouseup', () => {
  if (isDragging) {
    isDragging = false;
    dialogHeader.style.cursor = 'grab';
  }
});

let matches = [];
let currentMatchIndex = -1;
let showReplace = false;

// Listen for show find dialog
ipcRenderer.on('show-find-dialog', (event, withReplace) => {
  showReplace = withReplace;

  // Update dialog title
  dialogTitle.textContent = withReplace ? 'Find & Replace' : 'Find';

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
  clearHighlightOverlay();
});

// Close dialog on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !dialog.classList.contains('hidden')) {
    dialog.classList.add('hidden');
    clearHighlights();
    clearHighlightOverlay();
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

  // Select the matched text in the editor (this highlights it visually)
  editor.setSelectionRange(match.start, match.end);

  // Calculate exact position of the match using the same method as overlay
  const coords = getTextCoordinates(editor, match.start, match.end);

  if (coords) {
    // Calculate the absolute position of the match in the textarea
    const matchTop = coords.top + editor.scrollTop;
    const matchBottom = matchTop + coords.height;

    // Check if match is below the visible area
    if (matchBottom > editor.scrollTop + editor.clientHeight) {
      // Scroll so the match is near the bottom with some padding
      editor.scrollTop = matchBottom - editor.clientHeight + coords.height * 2;
    }
    // Check if match is above the visible area
    else if (matchTop < editor.scrollTop) {
      // Scroll so the match is near the top with some padding
      editor.scrollTop = Math.max(0, matchTop - coords.height * 2);
    }
  }

  // Keep focus on the find input, not the editor
  // This way the text stays highlighted but typing goes to find input
  findInput.focus();

  // Draw yellow highlight overlay
  drawHighlightOverlay(match);

  matchCountDisplay.textContent = `Match ${currentMatchIndex + 1} of ${matches.length}`;
}

function drawHighlightOverlay(match) {
  // Clear previous highlights
  highlightOverlay.innerHTML = '';

  // Get text coordinates
  const coords = getTextCoordinates(editor, match.start, match.end);

  if (coords) {
    const mark = document.createElement('div');
    mark.className = 'highlight-mark';
    mark.style.left = coords.left + 'px';
    mark.style.top = coords.top + 'px';
    mark.style.width = coords.width + 'px';
    mark.style.height = coords.height + 'px';
    highlightOverlay.appendChild(mark);
  }
}

function getTextCoordinates(textarea, start, end) {
  // Create a mirror div to measure text position
  const mirror = document.createElement('div');
  const computed = window.getComputedStyle(textarea);

  // Copy all relevant styles
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.wordWrap = 'break-word';
  mirror.style.font = computed.font;
  mirror.style.fontSize = computed.fontSize;
  mirror.style.fontFamily = computed.fontFamily;
  mirror.style.lineHeight = computed.lineHeight;
  mirror.style.padding = computed.padding;
  mirror.style.border = computed.border;
  mirror.style.width = textarea.clientWidth + 'px';
  mirror.style.left = '-9999px';
  mirror.style.top = '0';

  document.body.appendChild(mirror);

  // Get text before the match
  const textBefore = textarea.value.substring(0, start);
  const matchedText = textarea.value.substring(start, end);

  // Add text before and a span for the matched text
  mirror.textContent = textBefore;
  const matchSpan = document.createElement('span');
  matchSpan.textContent = matchedText;
  mirror.appendChild(matchSpan);

  const matchSpanRect = matchSpan.getBoundingClientRect();
  const mirrorRect = mirror.getBoundingClientRect();

  // Calculate position relative to the mirror
  const relativeLeft = matchSpanRect.left - mirrorRect.left;
  const relativeTop = matchSpanRect.top - mirrorRect.top;
  const width = matchSpan.offsetWidth;
  const lineHeight = parseInt(computed.lineHeight) || 24;

  document.body.removeChild(mirror);

  // Get textarea's position relative to the editor-wrapper (overlay's parent)
  const textareaRect = textarea.getBoundingClientRect();
  const overlayRect = highlightOverlay.parentElement.getBoundingClientRect();

  // Calculate final position accounting for textarea position and scroll
  const left = textareaRect.left - overlayRect.left + relativeLeft;
  const top = textareaRect.top - overlayRect.top + relativeTop - textarea.scrollTop;

  return {
    left: left,
    top: top,
    width: width,
    height: lineHeight
  };
}

function clearHighlightOverlay() {
  highlightOverlay.innerHTML = '';
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

// List formatting functions
function toggleBulletList() {
  formatList('bullet');
}

function toggleNumberedList() {
  formatList('numbered');
}

// Insert table template
function insertTable() {
  const cursorPos = editor.selectionStart;

  // Default 3x3 table template
  const tableTemplate = `| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
`;

  // Focus editor first
  editor.focus();

  // Use execCommand to insert text, which preserves undo history
  document.execCommand('insertText', false, tableTemplate);

  // Place cursor at first cell content
  const newCursorPos = cursorPos + '| '.length;
  editor.setSelectionRange(newCursorPos, newCursorPos + 'Column 1'.length);

  updatePreview();
  updateStats();
  updateLineNumbers();

  // If in writing mode with formatting enabled, update CodeMirror
  if (currentMode === 'writing' && showFormatting && codemirrorView) {
    codemirrorView.dispatch({
      changes: {
        from: 0,
        to: codemirrorView.state.doc.length,
        insert: editor.value
      }
    });
  }
}

function formatList(type) {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const text = editor.value;

  // Get the lines that are selected
  const beforeSelection = text.substring(0, start);
  const selection = text.substring(start, end);
  const afterSelection = text.substring(end);

  // Find the start of the first selected line
  const lineStart = beforeSelection.lastIndexOf('\n') + 1;
  // Find the end of the last selected line
  let lineEnd = end;
  const nextNewline = text.indexOf('\n', end);
  if (nextNewline !== -1) {
    lineEnd = nextNewline;
  } else {
    lineEnd = text.length;
  }

  // Get the full lines
  const fullSelection = text.substring(lineStart, lineEnd);
  const lines = fullSelection.split('\n');

  // Check if all lines are already formatted as the requested list type
  const bulletRegex = /^[\s]*[-*+]\s+/;
  const numberedRegex = /^[\s]*\d+\.\s+/;

  let allBullets = true;
  let allNumbered = true;

  for (const line of lines) {
    if (line.trim().length === 0) continue; // Skip empty lines
    if (!bulletRegex.test(line)) allBullets = false;
    if (!numberedRegex.test(line)) allNumbered = false;
  }

  let newLines;
  if (type === 'bullet') {
    if (allBullets) {
      // Remove bullet formatting
      newLines = lines.map(line => line.replace(bulletRegex, ''));
    } else {
      // Add bullet formatting
      newLines = lines.map(line => {
        if (line.trim().length === 0) return line;
        // Remove existing list markers first
        const cleaned = line.replace(bulletRegex, '').replace(numberedRegex, '');
        return '- ' + cleaned;
      });
    }
  } else if (type === 'numbered') {
    if (allNumbered) {
      // Remove numbered formatting
      newLines = lines.map(line => line.replace(numberedRegex, ''));
    } else {
      // Add numbered formatting
      let number = 1;
      newLines = lines.map(line => {
        if (line.trim().length === 0) return line;
        // Remove existing list markers first
        const cleaned = line.replace(bulletRegex, '').replace(numberedRegex, '');
        return `${number++}. ` + cleaned;
      });
    }
  }

  // Replace the text
  const newText = text.substring(0, lineStart) + newLines.join('\n') + text.substring(lineEnd);
  editor.value = newText;

  // Update cursor position - select the modified lines
  const newLineEnd = lineStart + newLines.join('\n').length;
  editor.setSelectionRange(lineStart, newLineEnd);

  updatePreview();
  updateStats();
  updateLineNumbers();

  // If in writing mode with formatting enabled, update CodeMirror
  if (currentMode === 'writing' && showFormatting && codemirrorView) {
    codemirrorView.dispatch({
      changes: {
        from: 0,
        to: codemirrorView.state.doc.length,
        insert: editor.value
      }
    });
  }
}

// Listen for list formatting commands
ipcRenderer.on('toggle-bullet-list', () => {
  toggleBulletList();
});

ipcRenderer.on('toggle-numbered-list', () => {
  toggleNumberedList();
});

// Listen for insert table command
ipcRenderer.on('insert-table', () => {
  insertTable();
});

// Listen for autosave status updates
ipcRenderer.on('autosave-status', (event, { enabled, interval }) => {
  if (enabled) {
    autosaveStatus.textContent = `Autosave: ${interval} min`;
  } else {
    autosaveStatus.textContent = '';
  }
});

// Listen for autosave saving notification
ipcRenderer.on('autosave-saving', () => {
  // Show prominent notification in status
  const originalStatus = status.textContent;
  status.textContent = 'Autosaving...';
  status.classList.add('autosave-notification');
  setTimeout(() => {
    status.textContent = originalStatus;
    status.classList.remove('autosave-notification');
  }, 5000); // Show for 5 seconds
});

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

// ====================================
// VERSION HISTORY SIDEBAR
// ====================================

const versionSidebar = document.getElementById('version-history-sidebar');
const closeVersionSidebar = document.getElementById('close-version-sidebar');
const versionList = document.getElementById('version-list');
const versionEmpty = document.getElementById('version-empty');
const currentStats = document.getElementById('current-stats');

let versionSidebarOpen = false;
let currentVersions = [];

// Toggle version sidebar
function toggleVersionSidebar(show) {
  versionSidebarOpen = show !== undefined ? show : !versionSidebarOpen;

  if (versionSidebarOpen) {
    versionSidebar.classList.remove('hidden');
    document.body.classList.add('version-sidebar-open');
    loadVersions();
  } else {
    versionSidebar.classList.add('hidden');
    document.body.classList.remove('version-sidebar-open');
  }
}

// Close sidebar button
closeVersionSidebar.addEventListener('click', () => {
  toggleVersionSidebar(false);
});

// Load versions from main process
function loadVersions() {
  ipcRenderer.send('get-versions');
  updateCurrentStats();
}

// Update current file stats
function updateCurrentStats() {
  const content = editor.value || '';
  const words = content.trim().split(/\s+/).filter(w => w.length > 0).length;
  const size = new Blob([content]).size;
  const lines = content.split('\n').length;

  currentStats.textContent = `${formatSize(size)} · ${words} words · ${lines} lines`;
}

// Format file size
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Format timestamp
function formatTimestamp(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  // Format as date
  const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return date.toLocaleDateString('en-US', options);
}

// Render version list
function renderVersions(versions) {
  currentVersions = versions || [];

  if (currentVersions.length === 0) {
    versionList.style.display = 'none';
    versionEmpty.style.display = 'block';
    return;
  }

  versionList.style.display = 'block';
  versionEmpty.style.display = 'none';

  // Render in reverse order (newest first)
  const reversedVersions = [...currentVersions].reverse();

  versionList.innerHTML = reversedVersions.map(version => `
    <div class="version-item" data-version-id="${version.id}" data-timestamp="${formatTimestamp(version.timestamp)}">
      <div class="version-icon">🕐</div>
      <div class="version-info">
        <div class="version-timestamp">${formatTimestamp(version.timestamp)}</div>
        <div class="version-stats">${formatSize(version.size)} · ${version.words} words</div>
      </div>
      <div class="version-actions">
        <button class="version-action-btn preview" data-action="preview" data-version-id="${version.id}">
          👁 Preview
        </button>
        <button class="version-action-btn restore" data-action="restore" data-version-id="${version.id}">
          ↻ Restore
        </button>
        <button class="version-action-btn delete" data-action="delete" data-version-id="${version.id}">
          × Delete
        </button>
      </div>
    </div>
  `).join('');

  // Add event listeners
  versionList.querySelectorAll('.version-action-btn').forEach(btn => {
    btn.addEventListener('click', handleVersionAction);
  });
}

// Handle version actions
function handleVersionAction(e) {
  e.stopPropagation();
  const action = e.target.dataset.action;
  const versionId = e.target.dataset.versionId;

  if (action === 'preview') {
    previewVersion(versionId, e.target);
  } else if (action === 'restore') {
    restoreVersion(versionId);
  } else if (action === 'delete') {
    deleteVersion(versionId);
  }
}

// Preview a version in compare window
function previewVersion(versionId, buttonElement) {
  // Get timestamp from parent version-item
  const versionItem = buttonElement.closest('.version-item');
  const timestamp = versionItem ? versionItem.dataset.timestamp : '';

  ipcRenderer.send('open-compare-window', versionId, timestamp);
}

// Restore a version
function restoreVersion(versionId) {
  const confirmed = confirm('Restore this version? Your current unsaved changes will be lost.');
  if (!confirmed) return;

  ipcRenderer.send('restore-version', versionId);
}

// Delete a version
function deleteVersion(versionId) {
  const confirmed = confirm('Delete this version? This action cannot be undone.');
  if (!confirmed) return;

  ipcRenderer.send('delete-version', versionId);
}

// Listen for version list from main process
ipcRenderer.on('versions-list', (event, versions) => {
  renderVersions(versions);
});

// Listen for version restored
ipcRenderer.on('version-restored', (event, content) => {
  editor.value = content;

  // Update CodeMirror if active
  if (codemirrorView) {
    codemirrorView.dispatch({
      changes: {
        from: 0,
        to: codemirrorView.state.doc.length,
        insert: content
      }
    });
  }

  updatePreview();
  updateStats();
  updateLineNumbers();

  // Notify user
  status.textContent = 'Version restored successfully';
  setTimeout(() => {
    status.textContent = 'Ready';
  }, 3000);

  // Reload versions to update list
  loadVersions();
});

// Listen for version restore error
ipcRenderer.on('version-restore-error', (event, error) => {
  status.textContent = `Error: ${error}`;
  setTimeout(() => {
    status.textContent = 'Ready';
  }, 3000);
});

// Update versions when file is saved
ipcRenderer.on('file-saved', () => {
  if (versionSidebarOpen) {
    // Slight delay to ensure version is created
    setTimeout(() => {
      loadVersions();
    }, 100);
  }
});

// Listen for toggle version sidebar from menu
ipcRenderer.on('toggle-version-sidebar', () => {
  toggleVersionSidebar();
});

// Listen for create backup request from menu
ipcRenderer.on('create-snapshot-request', () => {
  const content = editor.value || '';
  ipcRenderer.send('create-snapshot', content);

  status.textContent = 'Backup created';
  setTimeout(() => {
    status.textContent = 'Ready';
  }, 2000);
});

// Handle request for current content (for compare window)
ipcRenderer.on('get-current-content-for-compare', () => {
  const content = editor.value || '';
  ipcRenderer.send('current-content-response', content);
});

// Handle restored content from compare window
ipcRenderer.on('restore-content', (event, content) => {
  editor.value = content;

  // Update CodeMirror if active
  if (codemirrorView) {
    codemirrorView.dispatch({
      changes: {
        from: 0,
        to: codemirrorView.state.doc.length,
        insert: content
      }
    });
  }

  updatePreview();
  updateStats();
  updateLineNumbers();

  // Notify user
  status.textContent = 'Content restored successfully';
  setTimeout(() => {
    status.textContent = 'Ready';
  }, 3000);

  // Reload versions to update list
  loadVersions();
});

// Window-level drag-and-drop for opening files (anywhere in window)
document.addEventListener('dragover', (e) => {
  // Prevent default to allow drop
  e.preventDefault();
  e.stopPropagation();

  // Only allow file drops
  if (e.dataTransfer.types.includes('Files')) {
    e.dataTransfer.dropEffect = 'copy';
  }
});

document.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();

  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) return;

  // Check if it's a text file (markdown or txt)
  const firstFile = files[0];
  const fileName = firstFile.name.toLowerCase();
  const isTextFile = fileName.endsWith('.md') ||
                     fileName.endsWith('.markdown') ||
                     fileName.endsWith('.txt');

  if (isTextFile) {
    // Handle text file drop - open the file
    const filePath = firstFile.path;
    ipcRenderer.send('open-dropped-file', filePath);
  }
  // Note: Image drops are handled by editor-specific listener above
});

// ==========================================
// Draggable Separator (Editor/Preview Split)
// ==========================================

const separator = document.getElementById('separator');
const editorPane = document.querySelector('.editor-pane');
const container = document.querySelector('.container');
let isDragging = false;

// Only set up separator dragging if separator exists (Editor Mode only)
if (separator && editorPane && container) {
  // Load saved split position from localStorage
  function loadSplitPosition() {
    const savedPosition = localStorage.getItem('editorSplitPosition');
    if (savedPosition) {
      const percentage = parseFloat(savedPosition);
      if (percentage >= 20 && percentage <= 80) { // Sanity check
        editorPane.style.flexBasis = `${percentage}%`;
      }
    }
  }

  // Save split position to localStorage
  function saveSplitPosition(percentage) {
    localStorage.setItem('editorSplitPosition', percentage);
  }

  // Handle separator mousedown
  separator.addEventListener('mousedown', (e) => {
    isDragging = true;
    separator.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none'; // Prevent text selection during drag
    e.preventDefault();
  });

  // Handle mouse move for dragging
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const mouseX = e.clientX - containerRect.left;

    // Calculate percentage (with min/max limits)
    let percentage = (mouseX / containerWidth) * 100;
    percentage = Math.max(20, Math.min(80, percentage)); // Limit between 20% and 80%

    editorPane.style.flexBasis = `${percentage}%`;
  });

  // Handle mouseup to stop dragging
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      separator.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      // Save the current position
      const containerWidth = container.getBoundingClientRect().width;
      const editorWidth = editorPane.getBoundingClientRect().width;
      const percentage = (editorWidth / containerWidth) * 100;
      saveSplitPosition(percentage);
    }
  });

  // Load saved position on startup
  loadSplitPosition();
}
