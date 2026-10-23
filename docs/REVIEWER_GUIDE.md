# Run and test Earned Valor from the repository

This is the evaluator setup guide. Start with the browser preview, then build the native TV APK and connect a phone if testing camera controls. The TV APK loads this repository's running server; keep that server running throughout the review.

## Requirements

| What you want to test | Required software and equipment |
| --- | --- |
| Browser preview and production server | Windows, macOS or Linux; Git or a downloaded repository ZIP; Node.js **22.12+** with npm; a recent Chrome browser with **WebGL 2**. Node 22 is used in CI; Node 24 is also verified locally. |
| Automated browser checks | The above, plus installed Chrome on Windows or Playwright Chromium. On Linux, install its browser system dependencies as described below. |
| Build the native APK | **JDK 17**, Android SDK **Platform 35**, **Build-Tools 34.0.0**, Platform-Tools/ADB, and accepted SDK licenses. Gradle **8.9** and Android Gradle Plugin **8.7.3** are supplied by the project. No global Gradle installation is needed. |
| Run the reference TV emulator | Android Emulator; an Android TV AVD; hardware virtualization and working graphics drivers. The verified reference is **Android TV API 30 x86**, TV 1080p profile, on a Windows x86 host. Use an image compatible with your host CPU; this x86 image is not a universal choice for ARM hosts. |
| Phone camera controls | An Android phone with Chrome, camera permission and a stable support; a TV/browser running the game; either a USB data cable with USB debugging/ADB authorization or a network with trusted HTTPS access to the PC. The TV does not need a camera. |
| Local multiplayer | Two independent TV/browser sessions, each with a phone or labelled preview controller, connected to the **same** server. Two screens/windows on one computer are sufficient for a software check. |

Initial setup needs network access to npm and, for the APK, Google's Maven repositories and the Gradle distribution. Both pose models, artwork, fonts, voices and music are in the repository; `npm ci` prepares matching runtime/WASM files from the pinned npm dependency. No API keys, paid service, AWS account, Python, FFmpeg or speech-model installation is required to run the game. Those audio/video tools are only for regenerating existing media.

The repository is private. Reviewers must be signed into the GitHub account granted access. A GitHub 404/clone authentication error should be resolved before following the installation steps. A source ZIP works too: extract it, open a terminal in the extracted folder and start with `npm ci`.

## 1. Start the actual production build

In PowerShell, Terminal or a Linux shell:

```sh
git clone https://github.com/dazai2001-cmd/Amazon-hackathon.git
cd Amazon-hackathon
node --version
npm --version
npm ci
npm run build
npm start
```

Leave that terminal open. Open **http://localhost:8787/** in Chrome. Expected result: the Earned Valor main menu with Story, Training, Clan Wars, Controller Setup, Settings and Player Guide. **http://localhost:8787/api/health** should return `{"ok":true,"name":"Earned Valor","version":"0.1.0"}`. `Ctrl+C` stops the server.

`npm ci` should finish with **Local camera tracking assets are ready**. Do not use `--omit=dev` or `--ignore-scripts`: the local TypeScript server uses `tsx`, and the installation prepares MediaPipe's runtime/WASM. If asset preparation was interrupted, run `npm run assets`, then rebuild. The APK, `node_modules`, `dist`, certificates and local saves are generated, so they are not expected in a fresh clone.

For code iteration, use `npm run dev` instead of `npm start`; it serves the same routes through Vite. Stop the previous server first. The native build is a WebView host, so `npm start` must remain running even after an APK has been installed.

## 2. Check the game without a phone

1. Open **Controller Setup → Try desktop preview**, then return to the main menu. The interface identifies this as **Desktop preview · Camera off**.
2. Choose **Story**. Read or close the first-visit Player Guide, then select **Begin story**. Follow the objective, speak to Alden and complete the three weapon lessons. **Go straight to sparring** on the chapter title offers a shorter combat check.
3. In exploration use WASD to walk, Left/Right arrows to turn, mouse dragging to look and E to interact. A guided-walk button is also available for each objective.
4. In the trial use J/K/L for cuts, mouse movement for sword placement, Shift+Z/X/C for left/high/right guard, A/D to lean, W/S for distance and V to crouch. Both fighters start at 100 health. Space pauses; Escape/Back opens the menu.
5. Choose **Training**. Pick a routine, start calibration, hold B to lower and release B to return. Follow the on-screen start/lower/return cues and full rep cycles. The routine's reps, sets and rest remain in effect. **Preview completion awards no XP**; camera completion can award the daily 60 XP.
6. Open **View training progress** and **Squire** on the main menu to inspect progress and separate local profiles. Reloading retains that browser/device's saves.

For a two-player check, use separate visible windows at `http://localhost:8787/arena` and `http://127.0.0.1:8787/arena`. Create a 1 vs 1 war in the first, join **Opposing clan** with its war invite in the second, connect a preview controller on each, ready both fighters and start as captain. The two hostnames keep browser storage independent while reaching the same server. Keep both windows visible; a hidden or paused fighter has 30 seconds to return. See [the multiplayer instructions](MULTIPLAYER.md) and [two-screen setup](TWO_SCREEN_DEMO.md).

Preview and relay fixtures verify software behavior. They do not establish human pose accuracy or physical Fire TV performance.

## 3. Run the automated verification

Stop any development server first: the browser suite starts its own Vite server and needs its HMR port. If Chromium is not installed, run:

```sh
npx playwright install chromium
```

On Linux, use `npx playwright install --with-deps chromium` to install the browser's OS dependencies as well. Windows automatically uses Chrome at its standard installation path. Alternatively, point `PLAYWRIGHT_CHROMIUM_EXECUTABLE` at an installed Chrome executable.

```sh
npm run check
```

Expected: **128 unit tests**, a successful production build, **Production smoke check passed**, and **10 passed** browser checks. Run individual stages with `npm test`, `npm run build`, `npm run test:production` and `npm run test:browser`.

The production smoke check starts an isolated server on available ports and uses a separate data directory. It checks the five production routes, bundled JavaScript/CSS, artwork, both pose models, runtime/WASM, locally trusted HTTPS, authenticated HTTP/WSS pairing, a synthetic pose and the TV's acknowledgement. It stops its server automatically. The browser suite uses ports **8897/8898** plus Vite HMR **8790**; it tests the UI, real inference worker, camera replacement, navigation, profiles and Full HD rendering. It does not need a real camera permission prompt.

Browser failure evidence is saved in `playwright-report/` and `test-results/`. `npx playwright show-report` opens the report. The [verification workflow](../.github/workflows/verify.yml) runs these checks and builds the native APK from a clean GitHub checkout.

## 4. Build and run the native TV APK

In Android Studio's **SDK Manager**, install Android SDK Platform 35, Build-Tools 34.0.0, Platform-Tools and Android Emulator. Accept the displayed SDK licenses. Install JDK 17 and set `JAVA_HOME` to its root directory, not its `bin` folder. The SDK location is shown in SDK Manager. See the [AGP compatibility table](https://developer.android.com/build/releases/agp-8-7-0-release-notes) and [Android virtual-device instructions](https://developer.android.com/studio/run/managing-avds).

In **Device Manager → Create Virtual Device**, choose a TV hardware profile and a host-compatible Android TV image. The reference setup uses **TV 1080p / Android TV API 30 x86**, named **MoveRoomTV**. Enable host hardware acceleration. ARM hosts need a compatible image; the supplied Windows x86 emulator route is the verified baseline.

### Windows PowerShell helpers

Set these to your installed locations in the terminal used for the commands:

```powershell
$env:JAVA_HOME = 'C:\path\to\jdk-17'
$env:ANDROID_SDK_ROOT = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_SDK_ROOT\platform-tools;$env:PATH"
java -version
npm run android:build
npm run android:run
```

The build generates **artifacts/EarnedValor-debug.apk**. The run helper starts **MoveRoomTV** if no emulator is running, waits up to 180 seconds for boot, installs the APK, forwards port 8787 and opens the app. It configures GLES 3 for the 3D scene. Keep `npm start` running in a separate terminal. To use another AVD name: `npm run android:run -- -AvdName YOUR_AVD_NAME`. For a host graphics-driver problem, try `npm run android:run -- -Gpu software`.

The `android:build`, `android:run` and `phone:usb` npm shortcuts invoke **Windows PowerShell**. Use the following manual commands on macOS/Linux; do not assume those npm shortcuts are portable.

### macOS/Linux native build and manual launch

Configure your installed JDK and SDK locations:

```sh
export JAVA_HOME="/absolute/path/to/jdk-17"
export ANDROID_SDK_ROOT="/absolute/path/to/Android/sdk"
export ANDROID_HOME="$ANDROID_SDK_ROOT"
export PATH="$JAVA_HOME/bin:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/emulator:$PATH"
cd android
chmod +x gradlew
./gradlew assembleDebug --no-daemon
cd ..
mkdir -p artifacts
cp android/app/build/outputs/apk/debug/app-debug.apk artifacts/EarnedValor-debug.apk
```

Start your compatible TV AVD from Device Manager, or run `emulator -avd MoveRoomTV -gpu host -feature GLESDynamicVersion -no-snapshot-save` in its own terminal. Run `adb devices`, then substitute the actual emulator serial for `emulator-5554` below. Wait until the boot-property command returns `1`:

```sh
adb -s emulator-5554 shell getprop sys.boot_completed
adb -s emulator-5554 install -r artifacts/EarnedValor-debug.apk
adb -s emulator-5554 reverse tcp:8787 tcp:8787
adb -s emulator-5554 shell am start -n dev.moveroom.tv/.MainActivity --es server http://127.0.0.1:8787
```

Expected: the native landscape app displays the same main menu as the browser. D-pad browses, Select chooses, Back returns/pauses, and Play/Pause pauses activities. For text entry, Select opens the remote keyboard. The native app supports Android/Fire OS API 25+ with WebGL 2; physical Fire TV performance is not claimed by the emulator checks.

For an ADB-connected physical Fire TV, install with its serial and launch with your PC's reachable LAN address, for example `--es server http://192.168.1.20:8787`. An ordinary TV cannot reach the PC through its own `localhost`; allow the server's ports on the trusted local network.

## 5. Connect the phone camera

### USB localhost reference route

Enable Developer options/USB debugging on the Android phone, connect a data cable and accept its ADB authorization prompt. With the game server running:

```powershell
npm run phone:usb
```

On macOS/Linux, or to use a particular phone, get its serial from `adb devices` and run:

```sh
adb -s PHONE_SERIAL reverse tcp:8787 tcp:8787
adb -s PHONE_SERIAL shell am start -a android.intent.action.VIEW -d http://localhost:8787/phone
```

On the TV choose **Controller Setup → Connect Android phone**. Enter that TV's six-character pairing code on the phone's localhost page, tap **Start my camera** and allow camera access. Use Chrome if Android's link handler opens another browser. USB localhost is a trusted camera context; use the manually entered pairing code for this route rather than the Wi-Fi QR URL.

Prop the phone near the TV facing you, with shoulders, elbows, hands and hips visible. Remain in view for three seconds, then follow the standing/seated calibration countdown and neutral/lean/reach cues. The phone should show **TV receipt confirmed** separately from **In view**. For exercises, move the phone to the required side view and complete that exercise's start/lower/return calibration. Choose **Fast pose** before starting the camera if the Full model is too slow.

### Wi-Fi route

Both devices must reach the PC on the same network. Scan the TV's QR code to open the HTTPS phone URL on port **8788**. The local server generates a self-signed development certificate; the user must establish trust on their own device before camera access works. USB localhost is the simpler reference route if certificate setup is unsuitable. Plain HTTP on a LAN IP does not permit camera access. A deployed trusted HTTPS origin is also supported.

If the QR points to a VPN or the wrong adapter, copy `.env.example` to `.env`, set `PHONE_BASE_URL=https://YOUR_PC_LAN_IP:8788`, then restart the server. See [deployment instructions](DEPLOYMENT.md) for a trusted HTTPS deployment.

## Configuration, saves and troubleshooting

Configuration is optional. `.env.example` documents `PORT` (8787), `TLS_PORT` (8788), `PHONE_BASE_URL`, `TLS_ENABLED` and `DATA_DIR`. Environment variables override `.env`. With custom ports, update the emulator URL/ADB reverse and phone URL together. On Windows, `npm run phone:usb -- -Port 9000 -DeviceSerial PHONE_SERIAL` supports a custom HTTP port and a particular phone. `npm run android:run -- -ServerUrl http://127.0.0.1:9000` forwards that emulator port.

Local player profiles, calibration, story, settings and training live in browser/WebView storage. Clan records and the latest 100 completed results live in `.local/data/clans.json` unless `DATA_DIR` is set. Rooms, active wars and guest pairing sessions are temporary; restarting the server requires fresh pairing. There is no account/password to create. To review from scratch, use a fresh browser profile or a new local squire; each TV/browser must use its own controller session.

| Symptom | What to check |
| --- | --- |
| Clone/ZIP or Actions artifact is unavailable | Sign into the GitHub account with reviewer access; this is a private repository. |
| Unsupported Node / `process.loadEnvFile` failure | Use Node 22.12+ and rerun `npm ci` from the repository root. |
| `npm.ps1` execution-policy message | Use `npm.cmd` in PowerShell or use Command Prompt for npm commands. |
| Missing MediaPipe runtime/WASM | Run `npm ci` without `--ignore-scripts`, or `npm run assets`, then `npm run build`. |
| Browser executable or shared-library error | Install Playwright Chromium; use `--with-deps` on Linux, or configure `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. |
| `EADDRINUSE` / Vite HMR conflict | Stop earlier server/test processes. Default game ports are 8787/8788; Vite HMR uses 8790. |
| APK missing after clone | It is a build output. Run the native build or download the APK artifact from a successful Actions run. |
| SDK/JDK/AVD missing | Check JDK 17, `JAVA_HOME`, SDK Platform 35/Build-Tools 34.0.0 and the AVD name. The Windows helper accepts `ANDROID_SDK_ROOT` or `ANDROID_HOME`. |
| Emulator shows a blank/unsupported 3D scene | Use the TV AVD with GLES 3/host graphics and `GLESDynamicVersion`; try software graphics for a host-driver issue. Check **Settings → 3D resolution → 720p** for sustained low frame rate. |
| APK opens but cannot load the app | Keep the PC server running. Check `/api/health`, ADB reverse, server URL and the local firewall. |
| ADB says unauthorized, offline or multiple devices | Accept the phone's prompt; check `adb devices`; use `-s SERIAL` manual commands. The Windows emulator helper expects one emulator. |
| Camera unavailable / permission denied | Use Android Chrome, allow camera permission and use trusted HTTPS or USB localhost. Plain LAN HTTP is insufficient. |
| Phone sees you but TV receipt is missing | Keep the TV game open on the same server and pair to its current code. Check the phone's connection and restart pairing after a server restart. |
| Exercise rep does not count | Use the specified side view, keep required joints visible and complete the calibrated lower-and-return cycle. Preview deliberately awards no XP. |

Use [the player guide](PLAYER_GUIDE.md) for control details, [multiplayer instructions](MULTIPLAYER.md) for shared wars, and [the demo walkthrough](DEMO.md) for a suggested review sequence. Asset provenance is in [THIRD_PARTY.md](../THIRD_PARTY.md).
