!macro customInstall
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\Hyper" "" "Open &Hyper here"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\Hyper" "Icon" `"$appExe"`
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\Hyper\command" "" `"$appExe" "%V"`

  WriteRegStr HKCU "Software\Classes\Directory\shell\Hyper" "" "Open &Hyper here"
  WriteRegStr HKCU "Software\Classes\Directory\shell\Hyper" "Icon" `"$appExe"`
  WriteRegStr HKCU "Software\Classes\Directory\shell\Hyper\command" "" `"$appExe" "%V"`

  WriteRegStr HKCU "Software\Classes\Drive\shell\Hyper" "" "Open &Hyper here"
  WriteRegStr HKCU "Software\Classes\Drive\shell\Hyper" "Icon" `"$appExe"`
  WriteRegStr HKCU "Software\Classes\Drive\shell\Hyper\command" "" `"$appExe" "%V"`
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\Classes\Directory\Background\shell\Hyper"
  DeleteRegKey HKCU "Software\Classes\Directory\shell\Hyper"
  DeleteRegKey HKCU "Software\Classes\Drive\shell\Hyper"
!macroend

!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend

!macro customInit
  ; electron-builder's ARM64-only installer silently installs nothing on non-ARM64 machines
  !ifdef APP_ARM64
    !ifndef APP_64
      ${IfNot} ${IsNativeARM64}
        MessageBox MB_OK|MB_ICONSTOP "This installer is for ARM64 versions of Windows only. Please download the standard Hyper installer instead." /SD IDOK
        SetErrorLevel 1
        Quit
      ${EndIf}
    !endif
  !endif

  IfFileExists $LOCALAPPDATA\Hyper\Update.exe 0 +2
  nsExec::Exec '"$LOCALAPPDATA\Hyper\Update.exe" --uninstall -s'
!macroend
