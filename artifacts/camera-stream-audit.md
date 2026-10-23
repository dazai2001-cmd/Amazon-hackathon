# Movement stream audit — 13 October 2026

**Follow-up, 14 October 2026:** both reproduced risks below are now fixed. `tests/camera.test.ts` covers invalidation, CPU recovery, bounded failure, late model/media completion, replacement ownership and hidden pages. Browser checks mount PhoneApp and exercise cancelling one pending camera request before starting its replacement. This document preserves the original observations; its old line numbers and isolated synchronous helper describe the earlier implementation. Live phone accuracy remains unverified.

Requested scope: inspect reasons a paired phone might fail to reproduce movement. The entrant clarified that no current camera failure was being reported. This was an audit and fault-injection check; application source was unchanged.

The movement path is phone video → local MediaPipe inference → filtered landmarks → authenticated WebSocket room → fresh TV landmarks → calibration/body checks → game state. Pairing establishes the room connection; it does not establish that fresh, usable poses are reaching an active game.

## Reproduced code risks

### Runtime inference failures leave stale phone tracking state

In `src/lib/camera.ts:44`, an exception from inference or frame handling only changes the status string. It emits no empty pose, clears no last-frame indicator and keeps retrying the same tracker. `src/PhoneApp.tsx:73` updates its tracking/FPS state only when a new frame arrives. `src/lib/pose-model.ts:10` provides GPU → CPU fallback only while creating the tracker, so a persistent failure after successful creation does not use that fallback.

Fault injection: allow one successful 33-joint frame, then make subsequent inference throw. The phone-camera class emitted exactly one frame, retained that last 33-joint pose and reported `Tracking paused: GPU inference failed`. The check requiring explicit invalidation failed.

The TV eventually expires the missing frames and holds movement. This limits stale game input, but the phone can still show its earlier good tracking/FPS state alongside the paused message. A persistent inference fault will not recover merely because the room remains connected.

Recommended repair: invalidate pose/UI state on a processing failure, close/recreate a persistently failing GPU tracker on CPU, bound retry attempts and provide a restart action when recovery fails. Keep missing input held during recovery.

### Late cleanup can affect a replacement camera

`src/lib/camera.ts:60` clears the shared video source unconditionally. Calling stop again on an old camera after a newer camera owns that element removes the newer stream. Separately, the rejected-start path in `src/PhoneApp.tsx:83` unconditionally clears `camera.current` and updates running/loading state, even if a newer start has replaced that camera. This can occur when cancellation/reconnection overlaps an asynchronous media or model request.

Fault injection: hold the first model load pending, stop that camera, attach a replacement stream, then reject the old model load and execute its cleanup. The replacement video became detached while its media track remained active. The ownership check failed. The actual PhoneApp catch/finally handlers also lack a current-session check; that React-state effect was inspected in source rather than mounted in the isolated test.

Recommended repair: detach the video only when its source belongs to the camera being stopped. Guard every asynchronous callback, catch and finally against a camera generation/current reference so an old request cannot change the replacement's state.

## Expected conditions that can look like a streaming failure

| Condition | Current behavior and useful check |
| --- | --- |
| Pairing succeeds, camera remains off | The phone socket connects before camera start. Use Start my camera and check live pose/FPS, not just the connected label. |
| Secure context or permission failure | Camera startup requires HTTPS or trusted localhost and browser permission. The USB localhost path avoids LAN HTTP camera restrictions. |
| Missing hands, hips, shoulders or elbows | Body/weapon checks reject incomplete or low-confidence poses. The picture and skeleton may exist while usable control is held. Training requires the exercise's side view. |
| Calibration incomplete | Story combat requires a saved calibrated profile and a connected phone. Pairing from the main menu alone can return home without creating that profile; use Controller Setup → calibration. |
| Preview, tutorial, pause, dialogue or inactive game stage | Preview uses its simulated controller. Paused activities and open guides hold simulation; menus and dialogue do not behave like active combat. |
| Phone page hidden or screen locked | The camera loop skips hidden documents and PhoneApp sends an empty pose on visibility loss. The screen wake lock is requested at camera start and is not reacquired on return from a hidden page. |
| Slow phone inference | Detection runs synchronously on the phone's main thread. Long inference can reduce delivered FPS and delay UI/network work. Fast pose is available; human performance still needs measurement. |
| Network congestion or disconnect | The client discards outgoing packets when the socket is not open or its queued bytes exceed 32 KB; the relay also drops sends above 64 KB. The current phone display does not distinguish captured poses from successfully delivered poses. |
| Long frame gaps | TV game tracking expires frames after 800 ms. Multiplayer also requires fresh server inputs. Exercise continuity resets after a gap over 300 ms. Increasing those limits indiscriminately would hide lost tracking and could wrongly complete holds. |
| Replaced/expired rooms or invalid packets | One TV and one phone own each room. A replaced TV closes with code 4001, a duplicate phone with 4409, rate excess with 4408 and an expired established room with 4401. Malformed/non-finite or out-of-bound skeleton packets are rejected. |

## Evidence and limits

The isolated audit used the actual PoseCamera module with mocked media/model APIs. It passed normal video-to-pose delivery and stopping a pending media request. The two fault cases above failed their expected recovery/ownership assertions. The helper is local at `.local/camera-stream-audit.test.ts`, invoked with `node --import tsx --experimental-test-module-mocks --test .local/camera-stream-audit.test.ts`. These additional fault checks are outside the existing 112-test production suite.

The server is available on local ports 8787/8788. No Android phone was attached over USB during this check, and no live camera permission or personal video was used. The existing relay tests and earlier recorded-image/video diagnostics provide separate evidence; they do not prove reliability on the entrant's phone.

References: [MediaPipe synchronous video inference](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js), [screen wake-lock lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API), [existing relay/edge results](edge-test-report.md).

Priority for subsequent repair: camera-session ownership and explicit inference recovery first, then a clear distinction in the UI between paired, capturing, receiving fresh poses and ready for calibrated gameplay.
