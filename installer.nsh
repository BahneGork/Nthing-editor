; Custom NSIS installer script for Nthing
; This script adds file associations and thorough cleanup during uninstallation

!macro customInstall
  ; Register file associations for .md and .markdown files only
  WriteRegStr HKCR ".md" "" "Nthing.MarkdownFile"
  WriteRegStr HKCR ".markdown" "" "Nthing.MarkdownFile"

  ; Register ProgID for Markdown files with "Open with Nthing" command
  WriteRegStr HKCR "Nthing.MarkdownFile" "" "Markdown Document"
  WriteRegStr HKCR "Nthing.MarkdownFile\DefaultIcon" "" "$INSTDIR\Nthing.exe,0"
  WriteRegStr HKCR "Nthing.MarkdownFile\shell" "" "open"
  WriteRegStr HKCR "Nthing.MarkdownFile\shell\open" "" "Open with Nthing"
  WriteRegStr HKCR "Nthing.MarkdownFile\shell\open\command" "" '"$INSTDIR\Nthing.exe" "%1"'

  ; Also register as an option in "Open With" context menu
  WriteRegStr HKCR "Applications\Nthing.exe" "" "Nthing Markdown Editor"
  WriteRegStr HKCR "Applications\Nthing.exe\shell\open\command" "" '"$INSTDIR\Nthing.exe" "%1"'
  WriteRegStr HKCR "Applications\Nthing.exe\SupportedTypes" ".md" ""
  WriteRegStr HKCR "Applications\Nthing.exe\SupportedTypes" ".markdown" ""

  ; Notify Windows that file associations have changed
  System::Call 'shell32.dll::SHChangeNotify(i, i, i, i) v (0x08000000, 0, 0, 0)'

  DetailPrint "Registered file associations for .md and .markdown"
!macroend

!macro customUnInstall
  ; Close any running instances
  ${ifNot} ${isUpdated}
    ; Remove file associations
    DeleteRegKey HKCR ".md"
    DeleteRegKey HKCR ".markdown"
    DeleteRegKey HKCR "Nthing.MarkdownFile"
    DeleteRegKey HKCR "Applications\Nthing.exe"

    ; Notify Windows that file associations have changed
    System::Call 'shell32.dll::SHChangeNotify(i, i, i, i) v (0x08000000, 0, 0, 0)'

    ; Remove AppData folder (contains settings, cache, recent files)
    RMDir /r "$APPDATA\nthing"

    ; Remove LocalAppData folder (contains Electron cache)
    RMDir /r "$LOCALAPPDATA\nthing"

    ; Remove any leftover temp files
    RMDir /r "$TEMP\nthing"

    ; Log cleanup
    DetailPrint "Cleaned up user data folders and file associations"
  ${endIf}
!macroend

!macro customInit
  ; Prevent multiple instances during installation
  System::Call 'kernel32::CreateMutex(i 0, i 0, t "NthingInstallerMutex") i .r1 ?e'
  Pop $R0
  StrCmp $R0 0 +3
    MessageBox MB_OK|MB_ICONEXCLAMATION "Nthing installer is already running."
    Abort
!macroend
