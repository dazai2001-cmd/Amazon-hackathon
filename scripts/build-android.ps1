$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$taskSdk = Join-Path $taskRoot '.local\sdk'
if (!(Test-Path -LiteralPath $taskSdk)) {
    $taskSdk = if ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } elseif ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
}
$taskJdk = Get-ChildItem -LiteralPath (Join-Path $taskRoot '.local\jdk') -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
if ($taskJdk) { $env:JAVA_HOME = $taskJdk.FullName }
if (!(Test-Path -LiteralPath $taskSdk)) { throw 'Android SDK not found. Set ANDROID_SDK_ROOT or install it in .local/sdk.' }
$env:ANDROID_SDK_ROOT = $taskSdk
$env:GRADLE_USER_HOME = Join-Path $taskRoot '.local\gradle-home'
$taskGradle = Join-Path $taskRoot '.local\gradle\gradle-8.9\bin\gradle.bat'
if (!(Test-Path -LiteralPath $taskGradle)) { $taskGradle = Join-Path $taskRoot 'android\gradlew.bat' }
'sdk.dir=' + $taskSdk.Replace('\', '/') | Set-Content -LiteralPath (Join-Path $taskRoot 'android\local.properties') -Encoding ascii
& $taskGradle -p (Join-Path $taskRoot 'android') assembleDebug --no-daemon --console=plain
if ($LASTEXITCODE -ne 0) { throw 'Android build failed.' }
$taskApk = Join-Path $taskRoot 'android\app\build\outputs\apk\debug\app-debug.apk'
New-Item -ItemType Directory -Force -Path (Join-Path $taskRoot 'artifacts') | Out-Null
Copy-Item -LiteralPath $taskApk -Destination (Join-Path $taskRoot 'artifacts\MoveRoom-debug.apk') -Force
Write-Output ('APK ready: ' + (Join-Path $taskRoot 'artifacts\MoveRoom-debug.apk'))
