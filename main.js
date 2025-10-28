const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let currentFilePath = null;
let recentFiles = [];
const MAX_RECENT_FILES = 10;
let lastSaveTime = null;

// Path to store recent files
const recentFilesPath = path.join(app.getPath('userData'), 'recent-files.json');

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
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('update-title', titleText);
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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false, // Remove default title bar
    autoHideMenuBar: false, // Keep menu visible
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');

  // Make menu visible even with frameless window
  mainWindow.setMenuBarVisibility(true);

  // Set initial title
  updateWindowTitle(true); // New file, unsaved

  // Load recent files
  loadRecentFiles();

  // Create application menu
  createMenu();
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
            currentFilePath = null;
            lastSaveTime = null;
            mainWindow.webContents.send('new-file');
            updateWindowTitle(true); // New file, unsaved
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
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
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
        }
      ]
    },
    {
      label: 'View',
      submenu: [
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

function openFile() {
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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
