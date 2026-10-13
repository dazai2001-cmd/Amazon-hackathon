# Earned Valor branding checks

13 October 2026. The game is named **Earned Valor**, Chapter I is **The First Oath**, and the tagline is **Train your body. Forge your legend.**

Updated the TV menu, chapter title/header/pause screens, phone wordmark and setup text, browser metadata/favicon, Android launcher label/icon/banner and server identity. README, active project guides, submission drafts and APK build/run instructions use the new names. The rebuilt local APK is `artifacts/EarnedValor-debug.apk`.

## Validation

- `npm test`: 112 passed, zero failed.
- `npm run build`: TypeScript and production web build passed.
- `npm run android:build`: Android APK build passed.
- Android SDK `aapt dump badging`: compiled application label is `Earned Valor`.
- Running `/api/health`: returns `ok: true` and `name: "Earned Valor"`.
- Browser: verified the main-menu name, tagline, chapter title and ready chapter screen. Checked the compact TV menu and phone wordmark at 320- and 390-pixel viewport widths.
- Screenshot: [current main menu](earned-valor-main-menu.png), also embedded in README.

The Android package ID, save keys, pause event and configured AVD name retain their existing identifiers so installed app data, calibration and story/training progress remain compatible. References to the Ashen Gate inside dialogue are a story location and order, rather than the game's title. Older test reports and screenshots describe their original builds.

These are branding/build checks. The two camera recovery issues in [the streaming audit](camera-stream-audit.md) and real-phone exercise validation remain outstanding.
