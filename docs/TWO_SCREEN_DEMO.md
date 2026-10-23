# Two-screen local multiplayer setup

One PC, an extended monitor and one Android phone are enough to demonstrate the real local multiplayer connection. Use two separate browser windows: one fighter uses the phone camera, and a second person controls the opposing fighter with the labelled desktop preview. Both screens connect to the same local game server.

## Screen setup

1. In Windows Display settings choose **Extend**, so the monitor is an independent display.
2. Keep the game server running with `npm start` after `npm run build`.
3. Open [the camera player](http://localhost:8787/arena) in a browser window on one display.
4. Open [the keyboard player](http://127.0.0.1:8787/arena) in another browser window on the other display. Using these two addresses keeps the local demo controller sessions separate while reaching the same PC/server. Open directly in independent windows; avoid duplicating a signed-in game tab.
5. Keep both windows visible. Keyboard focus may move between them; a visible phone-controlled fighter keeps receiving movements. Hiding/minimizing a game pauses its pairing. Use **Resume** after returning to it.

## Pair, join, play

On the camera screen, create a **1 vs 1** clan war, then choose **Connect controller**. Connect the Android phone, start its camera and complete the neutral/lean/reach calibration. Pairing continues automatically once the player is framed. Do not use a preview on this screen when demonstrating camera tracking.

For a USB demo, enable USB debugging on the Android phone, connect it, accept its device authorization prompt and run `npm run phone:usb`. Enter the camera screen’s pairing code on the phone page. USB localhost permits camera access without a local development certificate. Wi-Fi instead uses the existing HTTPS phone link; any certificate warning must be handled by the user on their own device.

On the keyboard screen, enter the war invite and join **Opposing clan**. Choose **Connect controller → Explore a desktop preview first**. Its camera-off banner remains visible. The war invite joins the fighters; it is different from the phone pairing code.

Choose **I’m ready** on both screens, then let the captain start. Keep keyboard focus on the preview window while the camera player stays framed. The preview player uses J/K/L to cut, Shift+Z/X/C to guard left/high/right, A/D to lean, V to crouch and W/S to adjust range. Space pauses. Both participants see the same health, defenses and clan result.

## Native TV screens

Use [the native TV setup](REVIEWER_GUIDE.md#4-build-and-run-the-native-tv-apk) to substitute an Android TV emulator or compatible Fire TV for either browser screen. Both players must still reach the same running server. This setup supports local/LAN play; internet hosting and public matchmaking are planned.
