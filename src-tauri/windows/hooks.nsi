; NSIS installer hooks for Meow Kit.
; Dark purple finishing wizard and modern UI colors
!define MUI_BGCOLOR "1E1A2F"
!define MUI_TEXTCOLOR "FFFFFF"
!define MUI_FORCECLASSICCONTROLS

; Windows cannot overwrite a running executable, and the sidecar server
; keeps running when an older app version launches this installer.
; Kill the sidecar process tree (/T also stops its ffmpeg children)
; before any files are written.

!macro NSIS_HOOK_PREINSTALL
  nsExec::Exec 'taskkill /F /T /IM meowkit-server.exe'
  Sleep 800
!macroend

