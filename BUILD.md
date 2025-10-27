# Building the Markdown Editor for Windows

This guide explains how to build a standalone Windows installer (.exe) for the Markdown Editor.

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
- Location: `dist/Markdown Editor Setup 1.0.0.exe`

### Alternative: Portable Version

To build a portable version (no installation required):

```bash
npm run build:portable
```

This creates a standalone .exe that can run from anywhere without installation.

## Step 3: Find Your Installer

After the build completes successfully, you'll find the installer in:

```
dist/Markdown Editor Setup 1.0.0.exe
```

The installer will:
- ✅ Allow users to choose installation directory
- ✅ Create a desktop shortcut
- ✅ Create a Start Menu shortcut
- ✅ Add to Programs & Features for easy uninstallation

## Build Output Files

The `dist` folder will contain:
- `Markdown Editor Setup 1.0.0.exe` - The installer (distribute this)
- `win-unpacked/` - Unpacked application files (for testing)
- `builder-effective-config.yaml` - Build configuration used

## Customizing the Icon

The default configuration expects an icon at `build/icon.ico`. To add a custom icon:

1. Create a `build` folder in the project root
2. Add a 256x256 .ico file named `icon.ico`
3. Rebuild with `npm run build`

You can create .ico files using:
- [ICO Convert](https://icoconvert.com/) (online)
- GIMP (free software)
- Adobe Photoshop

If you don't provide an icon, electron-builder will use a default Electron icon.

## Build Configuration

The build is configured in `package.json` under the `"build"` section:

- **App ID**: `com.markdowneditor.app`
- **Product Name**: `Markdown Editor`
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
1. **Share the installer** - Send `Markdown Editor Setup 1.0.0.exe` to others
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

## Code Signing (Optional)

For production distribution, consider code signing to avoid Windows SmartScreen warnings:

1. Purchase a code signing certificate
2. Add to package.json:
```json
"win": {
  "certificateFile": "path/to/cert.pfx",
  "certificatePassword": "password"
}
```

Without code signing, users may see "Unknown publisher" warnings (but the app will still work).
