# Real-device playtest

The regular game tests and browser checks exercise software behavior. They do not establish accuracy with a live human camera or physical Fire TV performance.

## Start locally

Run `npm ci`, `npm run build` and `npm start`, then use a separate terminal for `npm run android:build` and `npm run android:run` on Windows. See [the setup guide](REVIEWER_GUIDE.md) for prerequisites, native commands on other systems and physical Fire TV installation. Keep the server running during the test.

Wi-Fi: the phone and TV/computer must reach the same server. Scan the QR and open its HTTPS controller page. A self-signed local development certificate can show a browser warning; the user handles that warning on the phone. No USB cable is required for QR pairing.

USB alternative: connect the Android phone with debugging enabled and run `npm run phone:usb`. Enter the TV room code on the localhost page that opens. This avoids wireless certificate setup. The QR identifies the room; the cable supplies an optional connection to the local server.

## Record evidence

1. Choose a squire, open Story, pair the phone, allow camera access, then complete the standing/seated calibration. Verify that setup returns to Story. On the phone, all three readiness rows should turn green, including TV receipt.
2. Open Controller Setup → Device check. Record 30 seconds while moving your arms, staying centred and briefly moving a hand out of view. Download the JSON summary. It contains timing and aggregate counts; no camera images or raw poses.
3. Complete a camera circuit in Training. A second person manually counts every real rep, including attempts the game rejects. Return to Device check and enter the manual total. Record the difference and separately note which individual attempts were missed or wrongly accepted; matching totals can conceal offsetting errors.
4. Repeat with Full/Fast pose, front/rear camera, three lighting conditions and several body sizes. Try wall and knee push-ups as appropriate; keep movements comfortable. Check returning from the background, locking/unlocking the phone, camera restart and disconnect/reconnect.
5. Complete Mara’s trial with the live camera. Count unintended cuts while standing, stepping, crouching and lowering the guard. Tracking interruptions must hold combat without later awarding the interrupted strike.
6. Play one two-screen clan war. Check that both screens agree on health, the winner and the score; restart the server afterward and verify the completed result in the saved clan records.
7. For TV graphics, use Auto and fixed 720p/1080p. The renderer exposes its drawing-buffer size, quality and measured FPS in the canvas dataset. Capture an emulator/native recording and inspect readable captions and remote focus from the intended viewing distance.

The phone’s receipt timing covers capture/inference plus the phone → TV → phone acknowledgement path. The TV/server ping is another round trip. Neither is a calibrated measurement of physical motion-to-display latency. Measure that separately with an external high-frame-rate recording of the player and TV together.

## Suggested acceptance record

Record the phone model/browser, model/delegate, lighting, camera position, manual and detected counts, individual false/missed reps and strikes, median/p95 inference and arrival intervals, longest tracking gap, render resolution/FPS, and whether each recovery path works. Keep unsuccessful runs in the record. Use this checklist when validating another device or configuration; automated software results do not replace its hardware measurements.
