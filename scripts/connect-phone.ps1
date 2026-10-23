param([ValidateRange(1, 65535)][int]$Port = 8787, [string]$DeviceSerial = '')
$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$taskAdb = Join-Path $taskRoot '.local\sdk\platform-tools\adb.exe'
if (!(Test-Path -LiteralPath $taskAdb)) {
    $taskSdk = if ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } elseif ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
    $taskAdb = Join-Path $taskSdk 'platform-tools\adb.exe'
}
if (!(Test-Path -LiteralPath $taskAdb)) {
    $taskCommand = Get-Command adb -ErrorAction SilentlyContinue
    if (!$taskCommand) { throw 'ADB not found. Install Android SDK Platform-Tools and set ANDROID_SDK_ROOT, or add adb to PATH. See docs/REVIEWER_GUIDE.md.' }
    $taskAdb = $taskCommand.Source
}
$taskDevice = if ($DeviceSerial) { @('-s', $DeviceSerial) } else { @('-d') }
& $taskAdb @taskDevice reverse "tcp:$Port" "tcp:$Port"
if ($LASTEXITCODE -ne 0) { throw 'Connect your Android phone by USB, enable USB debugging, and accept its USB authorization prompt.' }
& $taskAdb @taskDevice shell am start -a android.intent.action.VIEW -d "http://localhost:$Port/phone"
if ($LASTEXITCODE -ne 0) { throw 'Could not open the phone browser. Open the localhost phone link manually after checking ADB authorization.' }
Write-Output 'Enter the pairing code shown on the TV. Camera access works through trusted localhost.'
