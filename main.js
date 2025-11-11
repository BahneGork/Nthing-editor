/**
 * main.js - Electron Main Process
 *
 * This file runs in the Electron main process with full Node.js access.
 * Responsibilities:
 * - Window management (creating and managing app windows)
 * - File I/O operations (open, save, read, write files)
 * - Backup system (creating and managing file versions)
 * - Menu creation and handling
 * - IPC communication with renderer processes
 * - Recent files tracking
 * - Autosave management
 *
 * The main process has no direct DOM access - all UI updates are sent
 * to renderer processes via IPC (Inter-Process Communication).
 */

const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// ==========================================
// Global State
// ==========================================

// Per-window state management
const windows = new Map(); // Map of window.id -> window state

// Window state structure:
// {
//   window: BrowserWindow,
//   compareWindow: BrowserWindow or null,
//   currentFilePath: string or null,
//   lastSaveTime: number or null,
//   hasUnsavedChanges: boolean,
//   autosaveEnabled: boolean,
//   autosaveTimer: timer or null,
//   titleUpdateTimer: timer or null
// }

// Shared state (across all windows)
let recentFiles = [];            // Array of recently opened file paths
const MAX_RECENT_FILES = 10;    // Maximum recent files to track
let autosaveInterval = 5 * 60 * 1000; // Autosave interval (default: 5 minutes)
let autosavePersistent = false;  // Whether autosave setting persists across sessions

// Backup system configuration
let versioningEnabled = true;     // Enable/disable backup creation on save
let versionsToKeep = 10;          // Maximum backups to keep per file
let versionStorageMode = 'local'; // 'local' = .nthing-history/ folder next to file
let versionGlobalPath = '';       // Path for global storage (if not using local)
let versionAutoCleanup = false;   // Auto-delete backups older than X days
let versionCleanupDays = 30;      // Days before auto-cleanup kicks in
const crypto = require('crypto'); // For MD5 hashing (backup deduplication)

// Persistent storage paths
const recentFilesPath = path.join(app.getPath('userData'), 'recent-files.json');
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

// ==========================================
// Window State Management Helper Functions
// ==========================================

// Get window state by BrowserWindow
function getWindowState(win) {
  if (!win) return null;
  return windows.get(win.id);
}

// Get window state from event sender
function getWindowStateFromEvent(event) {
  const win = BrowserWindow.fromWebContents(event.sender);
  return getWindowState(win);
}

// Create initial state for a new window
function createWindowState(win) {
  const state = {
    window: win,
    compareWindow: null,
    currentFilePath: null,
    lastSaveTime: null,
    hasUnsavedChanges: false,
    autosaveEnabled: autosavePersistent,
    autosaveTimer: null,
    titleUpdateTimer: null
  };
  windows.set(win.id, state);
  return state;
}

// Clean up window state
function destroyWindowState(win) {
  const state = getWindowState(win);
  if (state) {
    // Clean up timers
    if (state.titleUpdateTimer) {
      clearInterval(state.titleUpdateTimer);
    }
    if (state.autosaveTimer) {
      clearInterval(state.autosaveTimer);
    }
    // Clean up compare window
    if (state.compareWindow && !state.compareWindow.isDestroyed()) {
      state.compareWindow.close();
    }
    windows.delete(win.id);
  }
}

// Update window title with filename and save status
function updateWindowTitle(win, unsaved = false) {
  const state = getWindowState(win);
  if (!state) return;

  let titleText = '';

  if (state.currentFilePath) {
    // Get filename without extension
    const filename = path.basename(state.currentFilePath, path.extname(state.currentFilePath));
    titleText = filename;
  } else {
    titleText = 'Untitled';
  }

  // Add save status
  if (unsaved) {
    titleText += ' - Not saved';
  } else if (state.lastSaveTime) {
    const now = new Date();
    const savedDate = new Date(state.lastSaveTime);
    const diffMs = now - savedDate;
    const diffMins = Math.floor(diffMs / 60000);

    let timeStr;
    if (diffMins < 1) {
      timeStr = 'just now';
    } else if (diffMins === 1) {
      timeStr = '1 minute ago';
    } else if (diffMins < 60) {
      timeStr = `${diffMins} minutes ago`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours === 1) {
        timeStr = '1 hour ago';
      } else if (diffHours < 24) {
        timeStr = `${diffHours} hours ago`;
      } else {
        // Show date/time for older saves
        timeStr = savedDate.toLocaleString();
      }
    }

    titleText += ` - Last saved ${timeStr}`;
  } else {
    titleText += ' - Not saved';
  }

  // Send to renderer to update custom title bar
  if (win && !win.isDestroyed() && win.webContents) {
    try {
      win.webContents.send('update-title', titleText);
    } catch (err) {
      console.error('Error updating title:', err);
    }
  }
}

// Load recent files from disk
function loadRecentFiles() {
  try {
    if (fs.existsSync(recentFilesPath)) {
      const data = fs.readFileSync(recentFilesPath, 'utf-8');
      recentFiles = JSON.parse(data);
      // Filter out files that no longer exist
      recentFiles = recentFiles.filter(filePath => fs.existsSync(filePath));
    }
  } catch (err) {
    console.error('Error loading recent files:', err);
    recentFiles = [];
  }
}

// Save recent files to disk
function saveRecentFiles() {
  try {
    fs.writeFileSync(recentFilesPath, JSON.stringify(recentFiles, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving recent files:', err);
  }
}

// Add file to recent files list
function addToRecentFiles(filePath) {
  // Remove if already exists
  recentFiles = recentFiles.filter(f => f !== filePath);
  // Add to beginning
  recentFiles.unshift(filePath);
  // Limit to MAX_RECENT_FILES
  if (recentFiles.length > MAX_RECENT_FILES) {
    recentFiles = recentFiles.slice(0, MAX_RECENT_FILES);
  }
  saveRecentFiles();
  // Rebuild menu to show updated recent files
  createMenu();
}

// Clear recent files
function clearRecentFiles() {
  recentFiles = [];
  saveRecentFiles();
  createMenu();
}

// Load app settings from disk
function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(data);

      // Load autosave settings
      if (settings.autosave) {
        autosaveEnabled = settings.autosave.enabled || false;
        autosaveInterval = settings.autosave.interval || (5 * 60 * 1000);
        autosavePersistent = settings.autosave.persistent || false;
      }

      // Load versioning settings
      if (settings.versioning) {
        versioningEnabled = settings.versioning.enabled !== undefined ? settings.versioning.enabled : true;
        versionsToKeep = settings.versioning.versionsToKeep || 10;
        versionStorageMode = settings.versioning.storageMode || 'local';
        versionGlobalPath = settings.versioning.globalPath || '';
        versionAutoCleanup = settings.versioning.autoCleanup || false;
        versionCleanupDays = settings.versioning.cleanupDays || 30;
      }
    }
  } catch (err) {
    console.error('Error loading settings:', err);
  }
}

// Save app settings to disk
function saveSettings() {
  try {
    const settings = {
      autosave: {
        enabled: autosavePersistent ? autosaveEnabled : false, // Only save if persistent
        interval: autosaveInterval,
        persistent: autosavePersistent
      },
      versioning: {
        enabled: versioningEnabled,
        versionsToKeep: versionsToKeep,
        storageMode: versionStorageMode,
        globalPath: versionGlobalPath,
        autoCleanup: versionAutoCleanup,
        cleanupDays: versionCleanupDays
      }
    };
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving settings:', err);
  }
}

// Autosave functions - updated for per-window state
function startAutosave(win) {
  const state = getWindowState(win);
  if (!state) return;

  stopAutosave(win); // Clear any existing timer
  if (state.autosaveEnabled && autosaveInterval > 0) {
    state.autosaveTimer = setInterval(() => {
      if (state.hasUnsavedChanges && state.currentFilePath) {
        // Notify renderer that autosave is saving
        win.webContents.send('autosave-saving');
        // Request content from renderer and save
        win.webContents.send('save-file-request');
      }
    }, autosaveInterval);
  }
  // Send autosave status to renderer
  sendAutosaveStatus(win);
}

function stopAutosave(win, skipStatusUpdate = false) {
  const state = getWindowState(win);
  if (!state) return;

  if (state.autosaveTimer) {
    clearInterval(state.autosaveTimer);
    state.autosaveTimer = null;
  }
  // Send autosave status to renderer (skip if window is closing)
  if (!skipStatusUpdate) {
    sendAutosaveStatus(win);
  }
}

function toggleAutosave(enabled, persistent = false) {
  autosavePersistent = persistent;

  // Apply to all windows
  windows.forEach((state) => {
    state.autosaveEnabled = enabled;
    if (enabled) {
      startAutosave(state.window);
    } else {
      stopAutosave(state.window);
    }
  });

  // Save settings if persistent
  if (persistent) {
    saveSettings();
  }

  createMenu(); // Rebuild menu to update checkmark
}

function setAutosaveInterval(minutes) {
  autosaveInterval = minutes * 60 * 1000; // Convert minutes to milliseconds

  // Restart autosave on all windows with autosave enabled
  windows.forEach((state) => {
    if (state.autosaveEnabled) {
      startAutosave(state.window);
    }
  });

  // Save settings if persistent mode is on
  if (autosavePersistent) {
    saveSettings();
  }

  createMenu(); // Rebuild menu to update checkmark
}

function sendAutosaveStatus(win) {
  const state = getWindowState(win);
  if (!state) return;

  if (win && !win.isDestroyed() && win.webContents) {
    try {
      win.webContents.send('autosave-status', {
        enabled: state.autosaveEnabled,
        interval: autosaveInterval / 60000 // Convert to minutes
      });
    } catch (err) {
      console.error('Error sending autosave status:', err);
    }
  }
}

// ==============================================
// FILE VERSIONING SYSTEM
// ==============================================

// Get the version directory path for a file
function getVersionDir(filePath) {
  if (versionStorageMode === 'global' && versionGlobalPath) {
    // Global storage mode
    const filename = path.basename(filePath);
    return path.join(versionGlobalPath, filename);
  } else {
    // Local storage mode (default)
    const dir = path.dirname(filePath);
    const filename = path.basename(filePath, path.extname(filePath));
    return path.join(dir, '.nthing-history', filename);
  }
}

// Calculate MD5 hash of file content
function getFileHash(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

// Get metadata file path
function getMetadataPath(versionDir) {
  return path.join(versionDir, 'metadata.json');
}

// Load version metadata
function loadVersionMetadata(versionDir) {
  const metadataPath = getMetadataPath(versionDir);
  try {
    if (fs.existsSync(metadataPath)) {
      const data = fs.readFileSync(metadataPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading version metadata:', err);
  }
  return { versions: [] };
}

// Save version metadata
function saveVersionMetadata(versionDir, metadata) {
  const metadataPath = getMetadataPath(versionDir);
  try {
    // Ensure directory exists
    if (!fs.existsSync(versionDir)) {
      fs.mkdirSync(versionDir, { recursive: true });
    }
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving version metadata:', err);
  }
}

// Create a new version of the file
/**
 * Create a backup version of a file
 *
 * This is the core of the backup system. It:
 * 1. Calculates MD5 hash of content to detect duplicates
 * 2. Creates a new backup file (v001.md, v002.md, etc.)
 * 3. Updates metadata.json with timestamp, size, word count
 * 4. Removes oldest backups if we exceed versionsToKeep (default: 10)
 *
 * @param {string} filePath - Path to the file being backed up
 * @param {string} content - File content to backup
 * @param {string} trigger - What triggered the backup ('manual-save', 'autosave', etc.)
 */
function createVersion(filePath, content, trigger = 'manual-save') {
  if (!versioningEnabled || !filePath) {
    return;
  }

  try {
    const versionDir = getVersionDir(filePath);
    const metadata = loadVersionMetadata(versionDir);

    // Calculate MD5 hash to detect if content actually changed
    // This prevents creating duplicate backups when you save without changes
    const contentHash = getFileHash(content);

    // Skip backup creation if content is identical to last backup
    if (metadata.versions.length > 0) {
      const lastVersion = metadata.versions[metadata.versions.length - 1];
      if (lastVersion.hash === contentHash) {
        console.log('Skipping version creation - content unchanged');
        return;
      }
    }

    // Create version directory if it doesn't exist
    if (!fs.existsSync(versionDir)) {
      fs.mkdirSync(versionDir, { recursive: true });
    }

    // Generate version ID
    const versionId = `v${String(metadata.versions.length + 1).padStart(3, '0')}`;
    const versionFile = path.join(versionDir, `${versionId}${path.extname(filePath)}`);

    // Save version file
    fs.writeFileSync(versionFile, content, 'utf-8');

    // Count words and lines
    const words = content.trim().split(/\s+/).length;
    const lines = content.split('\n').length;

    // Add to metadata
    metadata.versions.push({
      id: versionId,
      timestamp: new Date().toISOString(),
      size: Buffer.byteLength(content, 'utf-8'),
      words: words,
      lines: lines,
      hash: contentHash,
      trigger: trigger
    });

    // Clean up old versions if needed
    if (metadata.versions.length > versionsToKeep) {
      const versionsToDelete = metadata.versions.length - versionsToKeep;
      for (let i = 0; i < versionsToDelete; i++) {
        const oldVersion = metadata.versions[i];
        const oldFile = path.join(versionDir, `${oldVersion.id}${path.extname(filePath)}`);
        try {
          if (fs.existsSync(oldFile)) {
            fs.unlinkSync(oldFile);
          }
        } catch (err) {
          console.error('Error deleting old version:', err);
        }
      }
      metadata.versions = metadata.versions.slice(versionsToDelete);
    }

    // Clean up by age if enabled
    if (versionAutoCleanup && versionCleanupDays > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - versionCleanupDays);
      const cutoffTime = cutoffDate.toISOString();

      const versionsToRemove = [];
      for (const version of metadata.versions) {
        if (version.timestamp < cutoffTime) {
          versionsToRemove.push(version);
          const oldFile = path.join(versionDir, `${version.id}${path.extname(filePath)}`);
          try {
            if (fs.existsSync(oldFile)) {
              fs.unlinkSync(oldFile);
            }
          } catch (err) {
            console.error('Error deleting old version by age:', err);
          }
        }
      }
      metadata.versions = metadata.versions.filter(v => !versionsToRemove.includes(v));
    }

    // Save updated metadata
    saveVersionMetadata(versionDir, metadata);

    console.log(`Created version ${versionId} for ${path.basename(filePath)}`);
  } catch (err) {
    console.error('Error creating version:', err);
  }
}

// Get list of versions for a file
function getVersions(filePath) {
  if (!filePath) {
    return [];
  }

  try {
    const versionDir = getVersionDir(filePath);
    const metadata = loadVersionMetadata(versionDir);
    return metadata.versions;
  } catch (err) {
    console.error('Error getting versions:', err);
    return [];
  }
}

// Restore a specific version
function restoreVersion(filePath, versionId) {
  if (!filePath || !versionId) {
    return null;
  }

  try {
    const versionDir = getVersionDir(filePath);
    const versionFile = path.join(versionDir, `${versionId}${path.extname(filePath)}`);

    if (fs.existsSync(versionFile)) {
      return fs.readFileSync(versionFile, 'utf-8');
    }
  } catch (err) {
    console.error('Error restoring version:', err);
  }

  return null;
}

// Delete a specific version
function deleteVersion(filePath, versionId) {
  if (!filePath || !versionId) {
    return false;
  }

  try {
    const versionDir = getVersionDir(filePath);
    const metadata = loadVersionMetadata(versionDir);

    // Find and remove version from metadata
    const versionIndex = metadata.versions.findIndex(v => v.id === versionId);
    if (versionIndex === -1) {
      return false;
    }

    // Delete the version file
    const versionFile = path.join(versionDir, `${versionId}${path.extname(filePath)}`);
    if (fs.existsSync(versionFile)) {
      fs.unlinkSync(versionFile);
    }

    // Remove from metadata
    metadata.versions.splice(versionIndex, 1);
    saveVersionMetadata(versionDir, metadata);

    return true;
  } catch (err) {
    console.error('Error deleting version:', err);
    return false;
  }
}

function createWindow(filePathToOpen = null) {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false, // Remove default title bar
    icon: path.join(__dirname, 'icon.svg'), // Custom app icon
    autoHideMenuBar: false, // Keep menu visible
    show: false, // Don't show window until ready
    backgroundColor: '#ffffff', // Set background color to match editor
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false, // Don't throttle when in background
      v8CacheOptions: 'code' // Enable V8 code caching for faster subsequent loads
    }
  });

  // Create state for this window
  const state = createWindowState(win);

  // Load app settings first (needed before window setup) - only on first window
  if (windows.size === 1) {
    loadSettings();
  }

  win.loadFile('index.html');

  // Show window when ready to prevent white screen
  win.once('ready-to-show', () => {
    win.show();

    // Load recent files and create menu AFTER window is visible
    // This prevents blocking the window from appearing
    setImmediate(() => {
      if (windows.size === 1) {
        loadRecentFiles();
      }
      createMenu();
    });
  });

  // Send autosave status after page loads
  win.webContents.on('did-finish-load', () => {
    sendAutosaveStatus(win);

    // Open file if specified
    if (filePathToOpen) {
      openFileByPath(win, filePathToOpen);
    }
  });

  // Set initial title
  updateWindowTitle(win, true); // New file, unsaved

  // Update title every minute to keep "last saved" time current
  state.titleUpdateTimer = setInterval(() => {
    if (win && !win.isDestroyed() && state.lastSaveTime) {
      updateWindowTitle(win, false);
    }
  }, 60000); // Every 60 seconds

  // Clean up when window is closed
  win.on('closed', () => {
    stopAutosave(win, true); // Skip status update since window is closing
    destroyWindowState(win);
  });

  // Start autosave if it was enabled persistently
  if (autosavePersistent) {
    state.autosaveEnabled = true;
    startAutosave(win);
  }

  return win;
}

function createMenu() {
  // Build Open Recent submenu
  const recentFilesSubmenu = [];

  if (recentFiles.length > 0) {
    recentFiles.forEach((filePath, index) => {
      recentFilesSubmenu.push({
        label: path.basename(filePath),
        sublabel: filePath,
        accelerator: index < 9 ? `CmdOrCtrl+${index + 1}` : undefined,
        click: () => {
          openRecentFile(filePath);
        }
      });
    });
    recentFilesSubmenu.push({ type: 'separator' });
    recentFilesSubmenu.push({
      label: 'Clear Recent Files',
      click: () => {
        clearRecentFiles();
      }
    });
  } else {
    recentFilesSubmenu.push({
      label: 'No Recent Files',
      enabled: false
    });
  }

  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            newFile();
          }
        },
        {
          label: 'Open',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            openFile();
          }
        },
        {
          label: 'Open Recent',
          submenu: recentFilesSubmenu
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            saveFile();
          }
        },
        {
          label: 'Save As',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            saveFileAs();
          }
        },
        { type: 'separator' },
        {
          label: 'Autosave',
          submenu: [
            {
              label: 'Enable for This Session',
              type: 'checkbox',
              checked: autosaveEnabled && !autosavePersistent,
              click: (menuItem) => {
                toggleAutosave(menuItem.checked, false);
              }
            },
            {
              label: 'Enable Always',
              type: 'checkbox',
              checked: autosaveEnabled && autosavePersistent,
              click: (menuItem) => {
                toggleAutosave(menuItem.checked, true);
              }
            },
            { type: 'separator' },
            {
              label: '1 Minute',
              type: 'radio',
              checked: autosaveInterval === 1 * 60 * 1000,
              click: () => {
                setAutosaveInterval(1);
              }
            },
            {
              label: '5 Minutes',
              type: 'radio',
              checked: autosaveInterval === 5 * 60 * 1000,
              click: () => {
                setAutosaveInterval(5);
              }
            },
            {
              label: '15 Minutes',
              type: 'radio',
              checked: autosaveInterval === 15 * 60 * 1000,
              click: () => {
                setAutosaveInterval(15);
              }
            },
            {
              label: '30 Minutes',
              type: 'radio',
              checked: autosaveInterval === 30 * 60 * 1000,
              click: () => {
                setAutosaveInterval(30);
              }
            }
          ]
        },
        { type: 'separator' },
        {
          label: 'Note Backups...',
          accelerator: 'CmdOrCtrl+Shift+H',
          click: () => {
            mainWindow.webContents.send('toggle-version-sidebar');
          }
        },
        {
          label: 'Create Backup',
          click: () => {
            mainWindow.webContents.send('create-snapshot-request');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          role: 'undo'
        },
        {
          label: 'Redo',
          accelerator: 'CmdOrCtrl+Y',
          role: 'redo'
        },
        { type: 'separator' },
        {
          label: 'Cut',
          accelerator: 'CmdOrCtrl+X',
          role: 'cut'
        },
        {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          role: 'copy'
        },
        {
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          role: 'paste'
        },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          role: 'selectAll'
        },
        { type: 'separator' },
        {
          label: 'Find',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            mainWindow.webContents.send('show-find-dialog', false);
          }
        },
        {
          label: 'Find & Replace',
          accelerator: 'CmdOrCtrl+H',
          click: () => {
            mainWindow.webContents.send('show-find-dialog', true);
          }
        }
      ]
    },
    {
      label: 'Format',
      submenu: [
        {
          label: 'Toggle Bullet List',
          accelerator: 'CmdOrCtrl+Shift+8',
          click: () => {
            mainWindow.webContents.send('toggle-bullet-list');
          }
        },
        {
          label: 'Toggle Numbered List',
          accelerator: 'CmdOrCtrl+Shift+7',
          click: () => {
            mainWindow.webContents.send('toggle-numbered-list');
          }
        },
        { type: 'separator' },
        {
          label: 'Insert Table',
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            mainWindow.webContents.send('insert-table');
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle View Mode',
          accelerator: 'F9',
          click: () => {
            mainWindow.webContents.send('toggle-mode');
          }
        },
        { type: 'separator' },
        {
          label: 'Editor Mode',
          type: 'radio',
          checked: true,
          click: () => {
            mainWindow.webContents.send('switch-mode', 'editor');
          }
        },
        {
          label: 'Writing Focus Mode',
          type: 'radio',
          click: () => {
            mainWindow.webContents.send('switch-mode', 'writing');
          }
        },
        { type: 'separator' },
        {
          label: 'Focus Mode',
          type: 'checkbox',
          checked: false,
          click: (menuItem) => {
            mainWindow.webContents.send('toggle-focus-mode', menuItem.checked);
          }
        },
        {
          label: 'Typewriter Mode',
          type: 'checkbox',
          checked: false,
          click: (menuItem) => {
            mainWindow.webContents.send('toggle-typewriter-mode', menuItem.checked);
          }
        },
        { type: 'separator' },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'F12',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Note Backups Help',
          click: () => {
            showHelpDialog();
          }
        },
        { type: 'separator' },
        {
          label: 'Keyboard Shortcuts',
          click: () => {
            showKeyboardShortcuts();
          }
        },
        {
          label: 'About Nthing',
          click: () => {
            showAboutDialog();
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function newFile() {
  // Check for unsaved changes before creating new file
  if (hasUnsavedChanges) {
    dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: 'Unsaved Changes',
      message: 'You have unsaved changes. Do you want to save before creating a new file?',
      buttons: ['Save', 'Don\'t Save', 'Cancel'],
      defaultId: 0,
      cancelId: 2
    }).then(result => {
      if (result.response === 0) {
        // Save
        mainWindow.webContents.send('save-file-request');
        // Wait for save to complete, then create new file
        const saveHandler = () => {
          ipcMain.removeListener('save-content', saveHandler);
          setTimeout(() => {
            createNewFile();
          }, 100);
        };
        ipcMain.once('save-content', saveHandler);
      } else if (result.response === 1) {
        // Don't Save
        createNewFile();
      }
      // If Cancel (response === 2), do nothing
    });
  } else {
    createNewFile();
  }
}

function createNewFile() {
  currentFilePath = null;
  lastSaveTime = null;
  hasUnsavedChanges = false; // New empty file has nothing to save yet
  mainWindow.webContents.send('new-file');
  updateWindowTitle(true); // New file, unsaved
}

function openFile() {
  // Check for unsaved changes before opening
  if (hasUnsavedChanges) {
    dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: 'Unsaved Changes',
      message: 'You have unsaved changes. Do you want to save before opening another file?',
      buttons: ['Save', 'Don\'t Save', 'Cancel'],
      defaultId: 0,
      cancelId: 2
    }).then(result => {
      if (result.response === 0) {
        // Save
        mainWindow.webContents.send('save-file-request');
        // Wait for save to complete, then show open dialog
        const saveHandler = () => {
          ipcMain.removeListener('save-content', saveHandler);
          setTimeout(() => {
            showOpenDialog();
          }, 100);
        };
        ipcMain.once('save-content', saveHandler);
      } else if (result.response === 1) {
        // Don't Save
        showOpenDialog();
      }
      // If Cancel (response === 2), do nothing
    });
  } else {
    showOpenDialog();
  }
}

function showOpenDialog() {
  dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Markdown Files', extensions: ['md', 'markdown', 'txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      openFileByPath(filePath);
    }
  });
}

function openRecentFile(filePath) {
  // Check for unsaved changes before opening
  if (hasUnsavedChanges) {
    dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: 'Unsaved Changes',
      message: 'You have unsaved changes. Do you want to save before opening another file?',
      buttons: ['Save', 'Don\'t Save', 'Cancel'],
      defaultId: 0,
      cancelId: 2
    }).then(result => {
      if (result.response === 0) {
        // Save
        mainWindow.webContents.send('save-file-request');
        // Wait for save to complete, then open the file
        // Use a one-time listener for the save-content event
        const saveHandler = () => {
          ipcMain.removeListener('save-content', saveHandler);
          setTimeout(() => {
            openRecentFileAfterCheck(filePath);
          }, 100); // Small delay to ensure save completes
        };
        ipcMain.once('save-content', saveHandler);
      } else if (result.response === 1) {
        // Don't Save
        openRecentFileAfterCheck(filePath);
      }
      // If Cancel (response === 2), do nothing
    });
  } else {
    openRecentFileAfterCheck(filePath);
  }
}

function openRecentFileAfterCheck(filePath) {
  if (fs.existsSync(filePath)) {
    openFileByPath(filePath);
  } else {
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'File Not Found',
      message: 'The file could not be found. It may have been moved or deleted.',
      buttons: ['OK']
    });
    // Remove from recent files
    recentFiles = recentFiles.filter(f => f !== filePath);
    saveRecentFiles();
    createMenu();
  }
}

function openFileByPath(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    currentFilePath = filePath;
    lastSaveTime = null; // Reset save time when opening file
    hasUnsavedChanges = false; // Reset unsaved changes flag
    addToRecentFiles(filePath);
    mainWindow.webContents.send('file-opened', { content, filePath });
    updateWindowTitle(false); // File just opened, not unsaved
  } catch (err) {
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Error Opening File',
      message: `Could not open file: ${err.message}`,
      buttons: ['OK']
    });
  }
}

function saveFile() {
  if (currentFilePath) {
    mainWindow.webContents.send('save-file-request');
  } else {
    saveFileAs();
  }
}

function saveFileAs() {
  dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'Markdown Files', extensions: ['md'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  }).then(result => {
    if (!result.canceled && result.filePath) {
      currentFilePath = result.filePath;
      mainWindow.webContents.send('save-file-request');
    }
  });
}

// Handle save content from renderer
ipcMain.on('save-content', (event, content) => {
  if (currentFilePath) {
    try {
      fs.writeFileSync(currentFilePath, content, 'utf-8');
      lastSaveTime = Date.now();
      hasUnsavedChanges = false; // Reset unsaved changes flag
      addToRecentFiles(currentFilePath);

      // Create version after successful save
      createVersion(currentFilePath, content, 'manual-save');

      mainWindow.webContents.send('file-saved', currentFilePath);
      updateWindowTitle(false); // Just saved, not unsaved
    } catch (err) {
      console.error('Error saving file:', err);
    }
  }
});

// Handle content changed (mark as unsaved)
ipcMain.on('content-changed', () => {
  hasUnsavedChanges = true;
  updateWindowTitle(true); // Mark as unsaved
});

// Handle versioning operations
ipcMain.on('get-versions', (event) => {
  if (currentFilePath) {
    const versions = getVersions(currentFilePath);
    event.reply('versions-list', versions);
  } else {
    event.reply('versions-list', []);
  }
});

ipcMain.on('restore-version', (event, versionId) => {
  if (currentFilePath && versionId) {
    const content = restoreVersion(currentFilePath, versionId);
    if (content !== null) {
      event.reply('version-restored', content);
    } else {
      event.reply('version-restore-error', 'Failed to restore version');
    }
  }
});

ipcMain.on('delete-version', (event, versionId) => {
  if (currentFilePath && versionId) {
    const success = deleteVersion(currentFilePath, versionId);
    if (success) {
      // Send updated version list
      const versions = getVersions(currentFilePath);
      event.reply('versions-list', versions);
    }
  }
});

ipcMain.on('create-snapshot', (event, content) => {
  if (currentFilePath && content) {
    createVersion(currentFilePath, content, 'manual-snapshot');
    // Send updated version list
    const versions = getVersions(currentFilePath);
    event.reply('versions-list', versions);
  }
});

// Open compare window for backup comparison
ipcMain.on('open-compare-window', (event, versionId, timestamp) => {
  if (compareWindow) {
    compareWindow.focus();
    return;
  }

  compareWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,
      v8CacheOptions: 'code'
    },
    parent: mainWindow,
    modal: false
  });

  // Show compare window when ready
  compareWindow.once('ready-to-show', () => {
    compareWindow.show();
  });

  compareWindow.loadFile('compare.html');

  compareWindow.on('closed', () => {
    compareWindow = null;
  });

  // Once loaded, send comparison data
  compareWindow.webContents.on('did-finish-load', () => {
    if (currentFilePath && versionId) {
      // Get current content from main window
      mainWindow.webContents.send('get-current-content-for-compare');

      // Wait for current content response
      ipcMain.once('current-content-response', (e, currentContent) => {
        // Get backup content
        const backupContent = restoreVersion(currentFilePath, versionId);

        if (backupContent !== null && compareWindow) {
          compareWindow.webContents.send('compare-data', {
            current: currentContent,
            backup: backupContent,
            versionId: versionId,
            timestamp: timestamp
          });
        }
      });
    }
  });
});

// Apply partial restoration (selected lines)
ipcMain.on('apply-partial-restore', (event, content) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('restore-content', content);
  }
});

// Apply full backup restoration
ipcMain.on('apply-full-restore', (event, content) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('restore-content', content);
  }
});

// Compare window controls
ipcMain.on('minimize-compare-window', () => {
  if (compareWindow) {
    compareWindow.minimize();
  }
});

ipcMain.on('maximize-compare-window', () => {
  if (compareWindow) {
    if (compareWindow.isMaximized()) {
      compareWindow.unmaximize();
    } else {
      compareWindow.maximize();
    }
  }
});

// Handle window controls
ipcMain.on('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('close-window', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

// Handle menu button click - show menu as popup
ipcMain.on('show-menu', (event) => {
  const menu = Menu.getApplicationMenu();
  if (menu && mainWindow) {
    menu.popup({ window: mainWindow });
  }
});

// Handle opening recent file by index (Ctrl+1 through Ctrl+9)
ipcMain.on('open-recent-file-by-index', (event, index) => {
  if (index >= 0 && index < recentFiles.length) {
    const filePath = recentFiles[index];
    openRecentFile(filePath);
  }
});

// Handle pasted/dropped image saving
ipcMain.on('save-pasted-image', (event, { data, type }) => {
  saveImage(event, data, type, null);
});

ipcMain.on('save-dropped-image', (event, { data, type, name }) => {
  saveImage(event, data, type, name);
});

// Handle dropped text file
ipcMain.on('open-dropped-file', (event, filePath) => {
  // Check for unsaved changes before opening
  if (hasUnsavedChanges) {
    dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: 'Unsaved Changes',
      message: 'You have unsaved changes. Do you want to save before opening this file?',
      buttons: ['Save', 'Don\'t Save', 'Cancel'],
      defaultId: 0,
      cancelId: 2
    }).then(result => {
      if (result.response === 0) {
        // Save
        mainWindow.webContents.send('save-file-request');
        // Wait for save to complete, then open dropped file
        const saveHandler = () => {
          ipcMain.removeListener('save-content', saveHandler);
          setTimeout(() => {
            openFileByPath(filePath);
          }, 100);
        };
        ipcMain.once('save-content', saveHandler);
      } else if (result.response === 1) {
        // Don't Save
        openFileByPath(filePath);
      }
      // If Cancel (response === 2), do nothing
    });
  } else {
    openFileByPath(filePath);
  }
});

function saveImage(event, base64Data, mimeType, originalName) {
  // If no file is open, can't save relative images
  if (!currentFilePath) {
    dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: 'Save File First',
      message: 'Please save your markdown file before inserting images.',
      buttons: ['OK']
    });
    return;
  }

  // Get directory of current file
  const fileDir = path.dirname(currentFilePath);
  const imagesDir = path.join(fileDir, 'images');

  // Create images directory if it doesn't exist
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  // Generate filename
  const timestamp = Date.now();
  const extension = mimeType.split('/')[1] || 'png';
  const filename = originalName || `image-${timestamp}.${extension}`;
  const imagePath = path.join(imagesDir, filename);

  // Remove base64 prefix (e.g., "data:image/png;base64,")
  const base64Content = base64Data.split(',')[1];
  const buffer = Buffer.from(base64Content, 'base64');

  // Write image file
  try {
    fs.writeFileSync(imagePath, buffer);

    // Return relative path for markdown
    const relativePath = `images/${filename}`;
    event.sender.send('image-saved', relativePath);
  } catch (err) {
    console.error('Error saving image:', err);
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Error Saving Image',
      message: `Could not save image: ${err.message}`,
      buttons: ['OK']
    });
  }
}

// Handle opening files from command line or double-click
let filePathToOpen = null;

// Windows/Linux: Check command line arguments
if (process.platform === 'win32' || process.platform === 'linux') {
  // Skip first arg (electron) and second arg (main.js)
  if (process.argv.length >= 2) {
    const potentialFile = process.argv[process.argv.length - 1];
    // Check if it's a file path (not a flag or app path)
    if (potentialFile && !potentialFile.startsWith('-') && potentialFile !== '.' &&
        (potentialFile.endsWith('.md') || potentialFile.endsWith('.markdown') || potentialFile.endsWith('.txt'))) {
      filePathToOpen = potentialFile;
    }
  }
}

// Allow multiple instances - each file opens in its own window
// No single-instance lock needed

// Help dialog functions
function showHelpDialog() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'About Note Backups',
    message: 'Note Backups System',
    detail: `Nthing automatically creates backups of your notes when you save, protecting your work from accidental changes or deletions.

HOW IT WORKS:
• Backups are created automatically when you save your note
• Up to 10 backup versions are kept by default
• Backups are stored in a hidden .nthing-history folder next to your note

VIEWING BACKUPS:
• Open the Note Backups sidebar: File > Note Backups (Ctrl+Shift+H)
• Each backup shows: timestamp, file size, and word count

COMPARING BACKUPS:
• Click the "👁 Preview" button to open the Compare window
• The Compare window shows your current note on the left and the backup on the right

COLOR CODING IN COMPARE WINDOW:
❌ RED BACKGROUND (left side) = Lines that will be LOST if you restore
   • These lines exist in your current note
   • They were added after the backup was created
   • Restoring will DELETE them

✅ GREEN BACKGROUND (right side) = Lines that will be RESTORED
   • These lines exist in the backup
   • They were deleted or changed since the backup
   • Restoring will bring them BACK
   • Click the ← arrow button to select individual lines

⚪ NO BACKGROUND = Lines that are the same in both versions

RESTORING OPTIONS:

1. RESTORE INDIVIDUAL LINES (Advanced):
   • Click the "←" arrow next to any green line
   • The line appears in your current note (preview)
   • Click "✓" to deselect
   • Click "Finalize Restoration" to apply your selections
   • Only the selected lines will be restored

2. RESTORE FULL BACKUP:
   • Click "Restore Full Backup" button
   • Replaces your entire current note with the backup
   • A confirmation dialog will appear

MANAGING BACKUPS:
• Create manual backup: File > Create Backup
• Delete old backups: Click "× Delete" in the sidebar
• Backups are automatically cleaned up when limit is reached

SAFETY TIPS:
• Always review the Compare window before restoring
• Use "Preview" mode to see exactly what will change
• Create a manual backup before major edits
• The red/green colors show exactly what you'll gain or lose`,
    buttons: ['OK']
  });
}

function showKeyboardShortcuts() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Keyboard Shortcuts',
    message: 'Nthing Keyboard Shortcuts',
    detail: `FILE:
Ctrl+N - New file
Ctrl+O - Open file
Ctrl+1-9 - Open recent file (1 = most recent)
Ctrl+S - Save file
Ctrl+Shift+S - Save As
Ctrl+Q - Quit

EDIT:
Ctrl+Z - Undo
Ctrl+Y - Redo
Ctrl+X - Cut
Ctrl+C - Copy
Ctrl+V - Paste
Ctrl+A - Select All
Ctrl+F - Find
Ctrl+H - Find & Replace

FORMAT:
Ctrl+Shift+8 - Toggle bullet list
Ctrl+Shift+7 - Toggle numbered list
Ctrl+T - Insert table

VIEW:
F9 - Toggle between Editor and Writing Focus modes
F12 - Toggle Developer Tools

BACKUPS:
Ctrl+Shift+H - Open Note Backups sidebar`,
    buttons: ['OK']
  });
}

function showAboutDialog() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'About Nthing',
    message: 'Nthing',
    detail: `Version 1.9.4

A distraction-free markdown editor where nothing else matters.

Features:
• Two editing modes (Editor & Writing Focus)
• Live markdown preview
• Find & Replace
• Note backup system
• Real-time statistics
• Autosave
• And much more...

Built with Electron and marked.js

© 2025 Nthing`,
    buttons: ['OK']
  });
}

app.whenReady().then(() => {
  createWindow();

  // Open file if one was passed on startup
  if (filePathToOpen) {
    // Wait for window to be ready, then open file
    mainWindow.webContents.once('did-finish-load', () => {
      openFileByPath(filePathToOpen);
    });
  }
});

// macOS: Handle file opening
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow) {
    if (hasUnsavedChanges) {
      dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Do you want to save before opening another file?',
        buttons: ['Save', 'Don\'t Save', 'Cancel'],
        defaultId: 0,
        cancelId: 2
      }).then(result => {
        if (result.response === 0) {
          mainWindow.webContents.send('save-file-request');
          setTimeout(() => {
            openFileByPath(filePath);
          }, 200);
        } else if (result.response === 1) {
          openFileByPath(filePath);
        }
      });
    } else {
      openFileByPath(filePath);
    }
  } else {
    filePathToOpen = filePath;
  }
});

app.on('window-all-closed', () => {
  stopAutosave(true); // Clean up autosave timer, skip status update
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
