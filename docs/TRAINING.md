# Earned Valor — Alden’s training hall

Implemented 12 October 2026. This is the fitness progression slice of Earned Valor. Open **Enter training hall** on the chapter title, **Train** in the chapter header, or **Train with Alden** in the pause menu. The story, dialogue, walking and combat freeze while training is open. Leaving an unfinished routine keeps the existing character save and gives no training reward.

## Routine and progression

Players choose Starting out or Steady practice, shallow or regular squats, and wall, knee or floor push-ups. Alden assigns one set of four repetitions per exercise for Starting out, or two sets of six for Steady practice. Every set and exercise transition has a 45-second rest. These are short prototype targets, not a prescribed complete exercise programme.

After a completed routine, players report Too demanding, About right or Ready for a little more. A lighter recommendation removes a repetition and uses one set. A completed camera routine plus a request for more adds one repetition to the next recommendation. The camera does not infer age, fitness level, injury status or a medical exercise prescription. Preview completions do not qualify for a harder recommendation.

A complete camera routine earns 60 XP once per local calendar day. Further practice remains available. Each 60 XP raises the squire level; Strength and Endurance cap at five. Strength adds up to 8% to base story sword power before integer hit rounding and the existing 25-damage cap. Endurance adds up to 10% to stamina recovery. Bonuses apply when a new story duel starts, preserving an interrupted duel’s existing rules. Training XP and preferences have their own validated version-one save, so existing story choices, coins, equipment and checkpoints stay intact.

Rewards are local prototype progression. They are not authenticated proof of exercise, and changing device storage or time can bypass them. Real PvP needs server-side identity, progression and match authority. The proposed ranked mode should normalize combat stats or match equivalent progression; family mode should reward participation and cooperation instead of ranking raw exercise volume. Live PvP and family profiles are still unimplemented.

## Camera checks

The Android phone runs the existing local pose model. The TV receives joints, confidence and the video’s image aspect; it receives no images or microphone audio. Training uses a separate side-view measurement, independent of the upright combat calibration. The phone’s In view status changes to exercise framing, including floor push-ups.

For each exercise, hold the start for 1.2 seconds, show a comfortable lower pose for 0.6 seconds, then return and hold for one second. Counting starts automatically, so the player can stay in the camera frame. The prototype requires a start angle of at least 165 degrees and a lower angle within the selected variation’s setup range: 135/110 degrees for shallow/regular squats, 125 degrees for wall push-ups, or 105 degrees for knee/floor push-ups. These are engineering thresholds to reject incomplete demonstrations, not clinical definitions of universally correct depth. The observed calibration sets the subsequent repetition target. Change variation if calibration is uncomfortable or cannot pass.

Only a controlled lower-and-return cycle counts. A rep requires a visible bottom for at least 0.2 seconds, return for 0.3 seconds, a cycle of at least 1.4 seconds, and enough observed time on both sides of the movement. Repeated frames, camera gaps over 0.3 seconds, occlusion, changed camera view, support-point movement, excessive visible torso tilt or push-up hip-line drift discard the current attempt. Push-ups additionally require a stable support wrist and visible body travel toward the hands; arm-only flexion cannot complete a rep. Completed reps remain when pausing; an incomplete cycle must restart from the top. Rest clocks pause with manual pause or a hidden tab.

Side-view angles restore the video’s pixel aspect ratio. Both body sides must be visible enough to check the view; the camera-facing side must have at least 0.65 landmark confidence. Squats observe the shoulder, hip, knee and ankle. Push-ups observe shoulder, elbow, wrist, hip and ankle or knee support. The calibrated side stays locked. This conservative framing may reject usable real movements, particularly with far-side occlusion. It needs physical testing and threshold tuning across phones and body types.

Alden has 25 new local voice clips for setup, visible corrections, pause, rest, completion and counts one through ten. Captions always show the current instruction. The trainer can check visible movement and consistency; it cannot certify spinal alignment, joint load, pain, wall contact, or every aspect of technique from one camera.

## Preview and validation

The labelled desktop preview uses the same measurement, calibration and repetition engine with synthetic side-view joints. Hold **B** to lower and release it to return, or use the Preview lower position / Preview return to start buttons. Movements interpolate over 0.8 seconds with a fixed simulation step, so slower display frames do not manufacture tracking gaps or add a rep directly. Live camera frames retain their actual capture timestamps and are never filled in with synthetic poses. Preview records a practice completion but awards zero XP. The covered 3D courtyard stops rendering during training and resumes on return.

Fifteen focused tests cover framing, portrait/landscape image aspect, all variations, calibration, sets, rest, invalid repetitions, gaps, duplicates, pose loss, pause, adaptation, save validation, reward limits, capped battle bonuses and trainer script coverage. The relay test also checks exercise setup commands and image aspect delivery. Current full suite: 89 tests. Human-camera rep accuracy, real form-label validation and long-term fitness outcomes remain untested.

## Research basis and limits

- [Hackathon requirements](https://amazonappdev2026.devpost.com/): Fire TV priorities include fitness, family entertainment, multimodal UX and computer vision. The [official FAQ](https://amazonappdev2026.devpost.com/details/faqs) accepts an Android TV Emulator or Fire TV/Vega simulator. Record the native APK and phone-camera workflow.
- [MediaPipe Pose Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker): joint positions and visibility support movement analysis. Monocular estimated landmarks are not an anatomical assessment.
- [NHS strength exercises](https://www.nhs.uk/live-well/exercise/strength-exercises/): gradual repetition increases, comfortable squat ranges and controlled wall press-ups inform the exercise choices. Our short demo targets differ from its exercise routines.
- [CDC adult activity guidance](https://www.cdc.gov/physical-activity-basics/guidelines/adults.html): regular strengthening is one part of physical activity. This two-exercise routine does not cover all major muscle groups or replace broader activity.
