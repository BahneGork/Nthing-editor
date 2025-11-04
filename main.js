const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let currentFilePath = null;
let recentFiles = [];
const MAX_RECENT_FILES = 10;
let lastSaveTime = null;
let hasUnsavedChanges = false;
let autosaveEnabled = false;
let autosaveInterval = 5 * 60 * 1000; // Default: 5 minutes in milliseconds
let autosaveTimer = null;
let autosavePersistent = false; // Whether autosave setting persists across sessions
let titleUpdateTimer = null; // Timer for updating title every minute

// Path to store recent files
const recentFilesPath = path.join(app.getPath('userData'), 'recent-files.json');
// Path to store app settings
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

// Update window title with filename and save status
function updateWindowTitle(unsaved = false) {
  let titleText = '';

  if (currentFilePath) {
    // Get filename without extension
    const filename = path.basename(currentFilePath, path.extname(currentFilePath));
    titleText = filename;
  } else {
    titleText = 'Untitled';
  }

  // Add save status
  if (unsaved) {
    titleText += ' - Not saved';
  } else if (lastSaveTime) {
    const now = new Date();
    const savedDate = new Date(lastSaveTime);
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
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
    try {
      mainWindow.webContents.send('update-title', titleText);
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
      }
    };
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving settings:', err);
  }
}

// Autosave functions
function startAutosave() {
  stopAutosave(); // Clear any existing timer
  if (autosaveEnabled && autosaveInterval > 0) {
    autosaveTimer = setInterval(() => {
      if (hasUnsavedChanges && currentFilePath) {
        // Notify renderer that autosave is saving
        mainWindow.webContents.send('autosave-saving');
        // Request content from renderer and save
        mainWindow.webContents.send('save-file-request');
      }
    }, autosaveInterval);
  }
  // Send autosave status to renderer
  sendAutosaveStatus();
}

function stopAutosave(skipStatusUpdate = false) {
  if (autosaveTimer) {
    clearInterval(autosaveTimer);
    autosaveTimer = null;
  }
  // Send autosave status to renderer (skip if window is closing)
  if (!skipStatusUpdate) {
    sendAutosaveStatus();
  }
}

function toggleAutosave(enabled, persistent = false) {
  autosaveEnabled = enabled;
  autosavePersistent = persistent;

  if (enabled) {
    startAutosave();
  } else {
    stopAutosave();
  }

  // Save settings if persistent
  if (persistent) {
    saveSettings();
  }

  createMenu(); // Rebuild menu to update checkmark
}

function setAutosaveInterval(minutes) {
  autosaveInterval = minutes * 60 * 1000; // Convert minutes to milliseconds
  if (autosaveEnabled) {
    startAutosave(); // Restart with new interval
  }

  // Save settings if persistent mode is on
  if (autosavePersistent) {
    saveSettings();
  }

  createMenu(); // Rebuild menu to update checkmark
}

function sendAutosaveStatus() {
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
    try {
      mainWindow.webContents.send('autosave-status', {
        enabled: autosaveEnabled,
        interval: autosaveInterval / 60000 // Convert to minutes
      });
    } catch (err) {
      console.error('Error sending autosave status:', err);
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false, // Remove default title bar
    icon: path.join(__dirname, 'icon.svg'), // Custom app icon
    autoHideMenuBar: false, // Keep menu visible
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');

  // Send autosave status after page loads
  mainWindow.webContents.on('did-finish-load', () => {
    sendAutosaveStatus();
  });

  // Set initial title
  updateWindowTitle(true); // New file, unsaved

  // Update title every minute to keep "last saved" time current
  titleUpdateTimer = setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed() && lastSaveTime) {
      updateWindowTitle(false);
    }
  }, 60000); // Every 60 seconds

  // Clean up timers when window is closed
  mainWindow.on('closed', () => {
    if (titleUpdateTimer) {
      clearInterval(titleUpdateTimer);
      titleUpdateTimer = null;
    }
    stopAutosave(true); // Skip status update since window is closing
    mainWindow = null;
  });

  // Load app settings
  loadSettings();

  // Load recent files
  loadRecentFiles();

  // Create application menu
  createMenu();

  // Start autosave if it was enabled persistently
  if (autosaveEnabled && autosavePersistent) {
    startAutosave();
  }
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

// Prevent multiple instances - if app is already running, send file to existing instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  // Handle second instance (when file is double-clicked while app is running)
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Focus existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      // Check if a file was passed
      const filePath = commandLine[commandLine.length - 1];
      if (filePath && (filePath.endsWith('.md') || filePath.endsWith('.markdown') || filePath.endsWith('.txt'))) {
        // Check for unsaved changes
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
              // Save then open
              mainWindow.webContents.send('save-file-request');
              setTimeout(() => {
                openFileByPath(filePath);
              }, 200);
            } else if (result.response === 1) {
              // Don't save, just open
              openFileByPath(filePath);
            }
          });
        } else {
          openFileByPath(filePath);
        }
      }
    }
  });

  app.whenReady().then(() => {
    createWindow();

    // Open file if one was passed on startup
    if (filePathToOpen) {
      setTimeout(() => {
        openFileByPath(filePathToOpen);
      }, 500); // Small delay to ensure window is ready
    }
  });
}

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
