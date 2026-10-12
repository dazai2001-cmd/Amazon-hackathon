$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$taskAdb = Join-Path $taskRoot '.local\sdk\platform-tools\adb.exe'
if (!(Test-Path -LiteralPath $taskAdb)) { $taskAdb = 'adb' }
& $taskAdb -d reverse tcp:8787 tcp:8787
if ($LASTEXITCODE -ne 0) { throw 'Connect your Android phone by USB, enable USB debugging, and accept its USB authorization prompt.' }
& $taskAdb -d shell am start -a android.intent.action.VIEW -d 'http://localhost:8787/phone'
Write-Output 'Enter the pairing code shown on the TV. Camera access works through trusted localhost.'
