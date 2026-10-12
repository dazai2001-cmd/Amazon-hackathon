param([switch]$Headless, [string]$AvdName = 'MoveRoomTV', [string]$ServerUrl = 'http://127.0.0.1:8787', [ValidateSet('auto', 'host', 'software', 'swiftshader', 'swangle')][string]$Gpu = 'host')
$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$taskSdk = Join-Path $taskRoot '.local\sdk'
if (!(Test-Path -LiteralPath $taskSdk)) {
    $taskSdk = if ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } elseif ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
}
$env:ANDROID_SDK_ROOT = $taskSdk
if (Test-Path -LiteralPath (Join-Path $taskRoot '.local\avd')) {
    $env:ANDROID_AVD_HOME = Join-Path $taskRoot '.local\avd'
    $env:ANDROID_USER_HOME = Join-Path $taskRoot '.local\android-home'
}
$taskAdb = Join-Path $taskSdk 'platform-tools\adb.exe'
$taskEmulator = Join-Path $taskSdk 'emulator\emulator.exe'
$taskArguments = @('-avd', $AvdName, '-no-audio', '-no-boot-anim', '-gpu', $Gpu, '-feature', 'GLESDynamicVersion', '-no-snapshot-save')
if ($Headless) { $taskArguments += '-no-window' }
if (!(Test-Path -LiteralPath (Join-Path $taskRoot 'artifacts\MoveRoom-debug.apk'))) { throw 'Build the APK first: npm run android:build' }
$taskAlreadyRunning = (& $taskAdb devices) -match '^emulator-\d+\s+device'
if (!$taskAlreadyRunning) { Start-Process -FilePath $taskEmulator -ArgumentList $taskArguments -WindowStyle Hidden }
& $taskAdb -e wait-for-device
for ($taskAttempt = 0; $taskAttempt -lt 180; $taskAttempt++) {
    $taskBooted = & $taskAdb -e shell getprop sys.boot_completed
    if ($taskBooted -and $taskBooted.Trim() -eq '1') { break }
    Start-Sleep -Seconds 1
}
& $taskAdb -e install -r (Join-Path $taskRoot 'artifacts\MoveRoom-debug.apk')
if ($LASTEXITCODE -ne 0) { throw 'APK install failed.' }
$taskServerUri = [Uri]$ServerUrl
if ($taskServerUri.Host -in @('127.0.0.1', 'localhost')) {
    $taskServerPort = $taskServerUri.Port
    & $taskAdb -e reverse "tcp:$taskServerPort" "tcp:$taskServerPort"
    if ($LASTEXITCODE -ne 0) { throw 'Local server forwarding failed.' }
}
& $taskAdb -e shell am start -n dev.moveroom.tv/.MainActivity --es server $ServerUrl
