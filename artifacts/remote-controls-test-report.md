# Remote controls verification — 12 October 2026

The normal control scheme is Fire TV D-pad/Select/Back/Play-Pause for navigation and an Android phone camera for sword fighting and exercise reps. Keyboard combat remains an explicitly labelled desktop preview.

## Changes

- Native remote events target the focused DOM element, allowing React text controls and audio sliders to receive them. Key-up remains forwarded for footwork.
- Select on a multiplayer name or invite field opens a D-pad keyboard. Done commits the draft, Back cancels, and focus returns immediately to the field. The underlying form is inert while editing.
- Exploration consumes movement keys only while the 3D view is focused, and Select no longer steals button activations. The pause menu offers the journal; story dialogue displays remote instructions.
- Sliders use left/right in five-percent increments and up/down for navigation. Preview calibration arrows are consumed only during calibration poses.
- Native Back closes the current menu or returns home; only an unhandled Back from home exits. Play/Pause and Menu pause the activity. Debug server setup is available by holding Menu.

## Checks

- `npm test`: all 89 game, tracking, training, resolution and relay tests passed.
- `npm run build`: TypeScript and Vite production build passed. Existing Lucide module-directive warnings remain.
- `npm run android:build`: updated debug APK built successfully.
- Browser, isolated test origin, D-pad/Select/Back only: opened Clan Wars, entered fighter name `TV`, cancelled a cleared clan-name draft without changing the original, entered invite `ABC234`, saved it and enabled Join. Rapid Done → next-field presses retained correct focus.
- Browser story: Select began Chapter I and started a guided walk; Back and Play/Pause opened the pause menu; D-pad selected a voiced Alden response and revealed its matching next line. Music changed from 32% to 42% using two Right presses, and Down moved focus to the effects slider.
- Native Android TV emulator (`MoveRoomTV`, Android TV 30 x86), actual ADB remote keycodes: opened Clan Wars, opened the name keyboard, entered `TV`, saved and restored field focus. Two Back presses closed the editor and returned to the main menu while the app remained foreground. Screenshot: `firetv-remote-keyboard.png`.
- Native story: Select opened the saved courtyard checkpoint, Play/Pause opened the pause menu, and D-pad/Select opened audio settings. Native arrows changed Music 32% → 42% and moved to the effects slider. The courtyard rendered at approximately 28 FPS in the captured frame.
- Native training: D-pad/Select opened Alden's hall from the pause menu, selected Steady practice and Floor push-ups, and displayed two sets of six for both exercises. No exercise completion or XP was simulated.
- The final APK installed and launched successfully. Holding native Menu opened the debug server-address dialog.

This verifies the desktop preview and Android TV wrapper with remote keycodes. Physical Fire TV hardware and human camera exercise/combat accuracy were not tested in this pass.

## Full HD update

The graphics default is now 1080p; Settings offers an explicit, persisted 720p performance option. The former TV pixel-ratio limit ignored higher display density and could draw below HD on a 2× WebView. The new sizing honors density and bounds both drawing-buffer dimensions while preserving aspect ratio. Three regression tests cover common 1080p TV density layouts, the 720p/4K caps, and non-TV aspect ratios.

The updated native renderer reported `{"width":1920,"height":1080,"resolution":1080,"density":2}` through its opt-in `qa=render` diagnostic. This verifies actual 3D pixels rather than the screenshot/output size alone. Native screenshot: `ashen-1080p-emulator.png`. Amazon's web-app guidance targets 1080p; the current hackathon rules do not list a resolution minimum.

At a 1920×1080 browser viewport, the saved performance preference produced an exact 1280×720 buffer after reload. Switching back to Full HD restored the 1920×1080 buffer. Fractional CSS dimensions are rounded to physical pixels to avoid losing a pixel through WebGL's floor rounding.
