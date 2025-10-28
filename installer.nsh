; Custom NSIS installer script for Nthing
; This script adds thorough cleanup during uninstallation

!macro customUnInstall
  ; Close any running instances
  ${ifNot} ${isUpdated}
    ; Remove AppData folder (contains settings, cache, recent files)
    RMDir /r "$APPDATA\nthing"

    ; Remove LocalAppData folder (contains Electron cache)
    RMDir /r "$LOCALAPPDATA\nthing"

    ; Remove any leftover temp files
    RMDir /r "$TEMP\nthing"

    ; Log cleanup
    DetailPrint "Cleaned up user data folders"
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
