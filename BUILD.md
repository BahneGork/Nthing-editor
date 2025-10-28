# Building Nthing for Windows

This guide explains how to build a standalone Windows installer (.exe) for Nthing.

## Prerequisites

Before building, make sure you have:
- **Node.js** (version 14 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Windows** operating system (to build Windows installers)

## Step 1: Install Dependencies

Open Command Prompt or PowerShell in the project directory and run:

```bash
npm install
```

This will install both regular dependencies (electron, marked) and development dependencies (electron-builder).

## Step 2: Build the Installer

To build a Windows installer, run:

```bash
npm run build
```

This will create:
- **NSIS Installer** - A traditional Windows installer with setup wizard
- Location: `dist/Nthing Setup 1.0.0.exe`

### Alternative: Portable Version

To build a portable version (no installation required):

```bash
npm run build:portable
```

This creates a standalone .exe that can run from anywhere without installation.

## Step 3: Find Your Installer

After the build completes successfully, you'll find the installer in:

```
dist/Nthing Setup 1.0.0.exe
```

The installer will:
- ✅ Allow users to choose installation directory
- ✅ Create a desktop shortcut
- ✅ Create a Start Menu shortcut
- ✅ Add to Programs & Features for easy uninstallation

## Build Output Files

The `dist` folder will contain:
- `Nthing Setup 1.0.0.exe` - The installer (distribute this)
- `win-unpacked/` - Unpacked application files (for testing)
- `builder-effective-config.yaml` - Build configuration used

## Customizing the Icon

The project includes a blue "N" icon design in `icon.svg` at the root directory. This icon is used in:
- Application window (dev mode)
- File open/save dialogs
- Taskbar

To build the Windows installer, you need to convert the SVG to ICO format:

### Converting SVG to ICO

1. Use an online converter:
   - [CloudConvert](https://cloudconvert.com/svg-to-ico) - Upload `icon.svg`, select 256x256 size
   - [ICO Convert](https://icoconvert.com/) - Upload and download as .ico

2. Or use ImageMagick (command line):
   ```bash
   convert icon.svg -resize 256x256 build/icon.ico
   ```

3. Or use GIMP (free software):
   - Open `icon.svg`
   - Export as > Microsoft Windows Icon (*.ico)
   - Save to `build/icon.ico`

Once you have `build/icon.ico`, rebuild with `npm run build`.

**Note**: The app will work without the ICO file (uses SVG in dev mode), but the installer needs `build/icon.ico` for proper Windows integration.

## Build Configuration

The build is configured in `package.json` under the `"build"` section:

- **App ID**: `com.nthing.app`
- **Product Name**: `Nthing`
- **Target**: Windows 64-bit (NSIS installer)
- **Output Directory**: `dist/`

## Troubleshooting

### Build Fails with Network Error
If electron-builder can't download dependencies, try:
```bash
npm config set registry https://registry.npmjs.org/
npm install
npm run build
```

### "electron-builder command not found"
Make sure you installed dev dependencies:
```bash
npm install --save-dev electron-builder
```

### Build Takes a Long Time
First build can take 5-10 minutes as it downloads Windows build tools. Subsequent builds are much faster.

## Distribution

Once built, you can:
1. **Share the installer** - Send `Nthing Setup 1.0.0.exe` to others
2. **Install locally** - Double-click the installer to test
3. **Run portable** - Use the portable build for USB drives

The installer is self-contained and includes everything needed to run the app.

## Testing Before Distribution

Before sharing the installer:

1. Install it on a clean Windows machine
2. Test all features (open, save, find & replace, etc.)
3. Check that shortcuts were created properly
4. Verify uninstallation works via Control Panel

## Updating the Version

To change the version number:

1. Edit `package.json`
2. Change the `"version"` field (e.g., `"1.0.0"` → `"1.1.0"`)
3. Rebuild with `npm run build`
4. The installer name will reflect the new version

## File Size

Expect the installer to be around:
- **Installer**: ~80-120 MB (includes Electron runtime)
- **Installed size**: ~150-200 MB

This is normal for Electron apps as they bundle a Chromium runtime and Node.js.

## Windows Defender False Positive

**IMPORTANT**: Windows Defender and other antivirus software may flag your built .exe file as malware, typically reporting:
- `Trojan:Win32/Wacatac.C!ml`
- `Trojan:Win32/Sabsik.FL.B!ml`
- Other generic trojan detections

### This is a FALSE POSITIVE

This happens because:
1. **Unsigned executable** - The .exe is not code-signed (certificates cost $100-400/year)
2. **Machine learning heuristics** - Windows Defender's ML algorithm flags new/unknown executables
3. **Electron apps are common targets** - Many legitimate Electron apps trigger this false positive
4. **New executable** - The file was just built and is unknown to Microsoft's threat database

### Immediate Solutions

**For Personal Use**:

1. **Add Windows Defender exclusion**:
   - Open **Windows Security** (search in Start menu)
   - Go to **Virus & threat protection**
   - Click **Manage settings** under "Virus & threat protection settings"
   - Scroll to **Exclusions** and click **Add or remove exclusions**
   - Click **Add an exclusion** > **Folder**
   - Browse to and select your project's `dist` folder
   - The .exe will no longer be scanned/quarantined

2. **Restore quarantined files**:
   - In Windows Security, go to **Virus & threat protection**
   - Click **Protection history**
   - Find the quarantined file and click **Actions** > **Restore**

**For Distribution**:

1. **Code sign your application** (most effective):
   - Purchase a code signing certificate from:
     - **DigiCert** ($474/year for OV certificate)
     - **Sectigo** ($200-400/year)
     - **SignPath** (FREE for open source projects - https://about.signpath.io/product/open-source)
   - Add to `package.json`:
   ```json
   "win": {
     "certificateFile": "path/to/cert.pfx",
     "certificatePassword": "your-password",
     "signingHashAlgorithms": ["sha256"]
   }
   ```

2. **Submit to Microsoft**:
   - Report false positive at: https://www.microsoft.com/en-us/wdsi/filesubmission
   - Select "Software developer" as role
   - Upload your .exe file
   - Microsoft will analyze and potentially whitelist it (takes 1-3 days)

3. **Build reputation over time**:
   - Code-signed apps build reputation as more users install them
   - SmartScreen warnings decrease as your certificate gains reputation

### Verifying Your Build is Safe

You can verify the .exe is legitimate by:
1. Checking it only contains your source code (inspect `dist/win-unpacked/resources/app.asar`)
2. Building from clean source on your own machine
3. Uploading to VirusTotal.com (expect some false positives from ML-based scanners)

### Why This Affects Electron Apps

Electron bundles:
- Chromium browser engine
- Node.js runtime
- Native system access capabilities

This combination makes antivirus software suspicious, even though these are the same components used by VS Code, Slack, Discord, and thousands of legitimate apps.

## Code Signing (Recommended for Distribution)

For production distribution, code signing provides:
- ✅ No Windows Defender false positives
- ✅ No SmartScreen warnings
- ✅ User trust (shows your verified identity)
- ✅ Prevents tampering detection

Without code signing:
- ❌ Windows Defender may flag as malware
- ❌ Users see "Unknown publisher" warnings
- ❌ Some corporate networks may block installation
- ⚠️ App still works, but user experience is degraded
