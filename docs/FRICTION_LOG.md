# Earned Valor — development friction log

Prepared 13 October 2026 for the Fire TV submission. This log records observed emulator/browser behavior and automated reproduction cases. It does not claim that these issues were failures in an Amazon SDK, or that they occurred during a live session on Rahul's Android phone. The app uses a Java Android WebView wrapper, React, Three.js, MediaPipe and a local Node/WebSocket server.

## 1. WebView consumed the TV Play/Pause button

- **Task:** pause the native TV activity using the remote.
- **Steps:** install and launch the APK in the Android TV emulator, enter an activity, then send the Android Play/Pause keycode.
- **Expected:** the activity opens its pause overlay and stops gameplay.
- **Observed:** handling the key only through the Activity's usual key-down callback was insufficient; WebView could consume the media event first.
- **Severity:** Important — affected a core remote control.
- **Workaround/fix:** intercept media keys in `dispatchKeyEvent` and forward the pause action to the web interface. Native verification confirmed the overlay opened with keycode 85.
- **Actionable suggestion:** provide a Fire TV WebView starter example that handles D-pad, Select, Back and media keys, including key-up, focused controls and modal navigation.
- **Status:** resolved in the application.
- **Evidence:** [initial native checks](../artifacts/test-report.md), [current remote controls checks](../artifacts/remote-controls-test-report.md).

## 2. Remote text entry needed explicit focus ownership

- **Task:** enter fighter names, clan names and invite codes without a physical keyboard.
- **Steps:** open Clan Wars, select a field, use the D-pad keyboard, close it with Done or Back, then immediately open another field. Repeat at a TV-sized viewport.
- **Expected:** only the current editor receives input; Done saves, Back cancels, and the remote returns to the intended field.
- **Observed:** the application needed a focus scope and inert underlying form. Rapid close/open sequences also exposed an application timing issue in focus restoration.
- **Severity:** Important — text entry is required to create and join a match.
- **Workaround/fix:** added a D-pad keyboard, isolated its focus, made the underlying form inert and used synchronous close/focus restoration. Native and browser checks verified saving, cancellation and rapid field changes.
- **Actionable suggestion:** publish a reusable React/WebView remote text-entry pattern with focus restoration, modal isolation, character limits and example tests.
- **Status:** resolved in the application.
- **Evidence:** [remote controls report](../artifacts/remote-controls-test-report.md), [edge tests](../artifacts/edge-test-report.md).

## 3. A paused movement could survive into a later exchange

- **Task:** resume a live multiplayer duel after tracking loss, pause or reconnection.
- **Steps:** queue a sword sweep, interrupt tracking or the connection between simulation ticks, then restore input and advance the server simulation.
- **Expected:** resumed play starts from a fresh movement baseline; the interrupted action cannot deal damage.
- **Observed:** before the fix, a queued sweep could remove 16 health after tracking returned. Pause/resume and reconnection needed the same immediate invalidation.
- **Severity:** High — affected match correctness.
- **Workaround/fix:** clear pending strokes, guard timing and physical movement baselines immediately at the transition. Regression cases verify that interruptions cannot preserve a strike.
- **Actionable suggestion:** include discontinuity handling in camera-controller reference projects: freshness checks alone are insufficient when game actions are queued. Provide recorded-pose and disconnect fixtures for testing.
- **Status:** resolved in the application.
- **Evidence:** [edge tests](../artifacts/edge-test-report.md), `tests/multiplayer-edges.test.ts`.

## 4. Runtime inference errors did not fully invalidate phone status

- **Task:** recover the phone controller after an inference failure.
- **Steps:** in an isolated test using the actual camera class, allow one successful pose frame, then make subsequent inference calls throw.
- **Expected:** clear tracking/FPS indicators and stale pose state, then attempt bounded recovery or offer a restart.
- **Observed:** the phone status reported tracking paused, but no empty pose was emitted and the earlier tracking indicators could remain. GPU-to-CPU fallback currently covers tracker creation rather than a persistent runtime failure.
- **Severity:** High — movement can stop while the connection remains established.
- **Current containment:** the TV expires missing frames and holds gameplay. Automatic phone recovery remains to be implemented.
- **Actionable suggestion:** provide a web pose-controller example with explicit runtime-failure invalidation, bounded tracker recreation and current-session ownership checks. These are requirements for our integration, not proof of a model or SDK defect.
- **Status:** open application issue, reproduced through fault injection rather than a reported live-phone failure.
- **Evidence:** [camera stream audit](../artifacts/camera-stream-audit.md). That audit also documents a separate pending cleanup issue when an old camera request finishes after a replacement session starts.

## Validation boundary

The regular suite currently passes 112 tests. The additional camera fault-injection cases above are outside that suite and still identify outstanding work. Emulator and recorded-input evidence does not establish human exercise accuracy, live phone latency or physical Fire TV performance.
