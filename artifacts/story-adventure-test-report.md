# Chapter One and movement tracking validation

Updated 12 October 2026. This report distinguishes recorded human inputs, simulated controls and physical-device work still needed.

## Automated checks and builds

- `npm test`: **54 passed, 0 failed**. Checks cover dialogue branches, saved checkpoints, collision-safe routes, all 108 voice files and 15 sound assets, health combat, directional defence, stamina, timed ripostes/evasion, reach, rewards and authenticated relay roles.
- Tracking checks cover adaptive filtering, confidence preservation, 3D packet validation and relay delivery, independent hands, forearm direction, depth-source changes, whole-body movement without phantom cuts, bounded footwork, seated controls, late crouching, tracking gaps, hidden elbows and viewport changes without phantom strikes.
- `npm run build`: TypeScript and Vite pass. Vite reports harmless `use client` warnings from Lucide in this browser application.
- `npm run android:build`: APK build passes; output is `artifacts/MoveRoom-debug.apk`. The native wrapper loads the frontend from the included server, rather than embedding a separate game build.

## Recorded human vision checks

The `/diagnostics` page used Google's public pose image and TensorFlow's recorded squat fixture. These are not recordings of the user. All three runs passed human recognition, 3D joint output, empty-image handling, recorded movement, tracking loss and reacquisition without a teleport strike.

| Model / delegate | Checks | Detected / usable video samples | Desktop median / p95 inference |
| --- | --- | --- | --- |
| Full / GPU | 6/6 | 24/24, 24/24 | 61 / 80 ms |
| Full / CPU | 6/6 | 24/24, 24/24 | 103 / 143 ms |
| Lite / GPU | 6/6 | 24/24, 24/24 | 53 / 65 ms |

Screenshots: [Full GPU](tracking-full-gpu.png), [Full CPU](tracking-full-cpu.png), [Lite GPU](tracking-fast-gpu.png). Inference time is not end-to-end camera latency and does not predict an Android phone's performance. Sparse samples verify recognition and data handling, rather than sword accuracy, squat repetition counting or live form correction. Filter behaviour was checked separately with controlled noisy and fast-moving inputs.

## Browser game walkthroughs

- The opening, arrival choices and motive responses played with their recorded voice assets. The three interactive weapon lessons completed. Automatic dialogue and manual reading both worked; choices waited for input.
- A complete health trial was won before the tracking upgrade with six blocks/counters, 100 health remaining and 100 damage dealt. Three strikes did not finish it.
- After the final tracking and animation changes, the simulated desktop controller visibly changed the viewpoint and HUD to **CROUCHING**. A complete trial ended with **84 health, 100 damage dealt, six blocks, zero perfect blocks and zero evasions**, awarding the first-win 20 coins. Four counters had left Mara at 23 health. The browser reported no console errors. This used a 1280 × 720 viewport with camera tracking explicitly off.
- The forge conversation awarded a once-only travel purse, bringing 20 coins to 40. Buying steel cost 30 and left 10; the other unaffordable item disabled its purchase button.
- Guided routes reached the forge, Orders board and gate. The Orders conversation, letter, closing truth choice and chapter ending completed. Reloading resumed the completed chapter with its 10 coins and choice retained.
- Pausing a voiced conversation held the audio playback position; resuming restarted it. Menus held keyboard/remote focus. Captions remained available with sound disabled.

Proof: [crouching view](adventure-body-controls.png), [final health result](adventure-health-victory.png), [letter choice](adventure-letter-choice.png), [saved chapter ending](adventure-chapter-complete.png).

## Native emulator baseline

On 10 October, the actual Android TV APK rendered the chapter at its 30 FPS cap. Remote navigation, voiced opening decoding, guided walking and key-release stopping were checked. A health duel through the authenticated relay at 18 simulated pose frames/second finished with **100 health, 100 damage dealt and seven blocks**. [Native result](adventure-emulator-health-result.png).

That native run preceded the final body controls, arm sizing and animation blending. The latest APK build passes, while the final changes have browser and recorded-input validation. The emulator was headless with audio output disabled: playback state and decoding were observed, but speaker audibility was not tested there. The included [cast preview](ashen-gate-voices.mp3) contains Alden, Mara and Tomas.

## Practical limits

Live Android camera access, framing, latency, fast-swing accuracy and physical Fire TV performance still need hardware validation. Full pose trades more model detail for greater phone load; Fast remains available. Keep shoulders, elbows, wrists and hips visible. World joints are monocular estimates, and approach distance is inferred from body scale. Weapon roll, exact physical sword depth/contact, a retargeted full-body player rig and third-person leg animations are not implemented.

This chapter has one courtyard and one computer rival. Bodyweight repetition detectors, exercise-driven stats, live multiplayer, Orders contests and later regions remain future work. Current 3D characters are placeholders. See `THIRD_PARTY.md` for model, audio and recorded-fixture provenance.
