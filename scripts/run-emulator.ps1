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
if (!(Test-Path -LiteralPath $taskAdb)) { throw 'Android SDK Platform-Tools not found. Set ANDROID_SDK_ROOT. See docs/REVIEWER_GUIDE.md.' }
if (!(Test-Path -LiteralPath $taskEmulator)) { throw 'Android Emulator not found. Install it in Android Studio SDK Manager. See docs/REVIEWER_GUIDE.md.' }
$taskArguments = @('-avd', $AvdName, '-no-audio', '-no-boot-anim', '-gpu', $Gpu, '-feature', 'GLESDynamicVersion', '-no-snapshot-save')
if ($Headless) { $taskArguments += '-no-window' }
if (!(Test-Path -LiteralPath (Join-Path $taskRoot 'artifacts\EarnedValor-debug.apk'))) { throw 'Build the APK first: npm run android:build' }
$taskAlreadyRunning = (& $taskAdb devices) -match '^emulator-\d+\s+device'
$taskProcess = $null
if (@($taskAlreadyRunning).Count -gt 1) { throw 'More than one emulator is running. Close the extra emulators or use the serial-specific manual commands in docs/REVIEWER_GUIDE.md.' }
if (!$taskAlreadyRunning) {
    $taskAvds = & $taskEmulator -list-avds
    if ($AvdName -notin $taskAvds) { throw "AVD '$AvdName' was not found. Create an Android TV AVD with that name in Android Studio Device Manager, or pass -AvdName YOUR_AVD_NAME. See docs/REVIEWER_GUIDE.md." }
    $taskProcess = Start-Process -FilePath $taskEmulator -ArgumentList $taskArguments -WindowStyle Hidden -PassThru
}
$taskReady = $false
for ($taskAttempt = 0; $taskAttempt -lt 180; $taskAttempt++) {
    if ($taskProcess -and $taskProcess.HasExited) { throw 'The emulator exited before booting. Check virtualization and AVD setup; try -Gpu software for a graphics-driver issue.' }
    $taskDevices = (& $taskAdb devices) -match '^emulator-\d+\s+device'
    if ($taskDevices) {
        $taskBooted = & $taskAdb -e shell getprop sys.boot_completed
        if ($taskBooted -and $taskBooted.Trim() -eq '1') { $taskReady = $true; break }
    }
    Start-Sleep -Seconds 1
}
if (!$taskReady) { throw 'The emulator did not finish booting in 180 seconds. Check Android Studio Device Manager and hardware virtualization.' }
& $taskAdb -e install -r (Join-Path $taskRoot 'artifacts\EarnedValor-debug.apk')
if ($LASTEXITCODE -ne 0) { throw 'APK install failed.' }
$taskServerUri = [Uri]$ServerUrl
if ($taskServerUri.Host -in @('127.0.0.1', 'localhost')) {
    $taskServerPort = $taskServerUri.Port
    & $taskAdb -e reverse "tcp:$taskServerPort" "tcp:$taskServerPort"
    if ($LASTEXITCODE -ne 0) { throw 'Local server forwarding failed.' }
}
& $taskAdb -e shell am start -n dev.moveroom.tv/.MainActivity --es server $ServerUrl
if ($LASTEXITCODE -ne 0) { throw 'Could not launch Earned Valor. Check adb logcat and the server URL.' }
