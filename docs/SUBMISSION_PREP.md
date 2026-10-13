# The Ashen Gate — submission preparation

Prepared 13 October 2026. Rahul confirmed Devpost registration and completed identity verification on the Amazon developer portal. Video and final submission remain unfinished according to the latest available update. The project currently passes 112 automated tests; two camera recovery/lifecycle fixes identified by a separate fault audit remain outstanding.

The [official rules](https://amazonappdev2026.devpost.com/rules) require the Fire TV developer account, project description, accessible GitHub repository, public demonstration video and product feedback. The [FAQ](https://amazonappdev2026.devpost.com/details/faqs) accepts the Android TV emulator. The deadline is **24 October 2026 at 00:30 IST** (23 October at noon PDT).

## Suggested Devpost text

**Project name:** The Ashen Gate

**Tagline:** Train with a knight. Fight with your own movements. Grow through the journey.

**Primary track:** Fire TV

### Inspiration

We wanted exercise to have a place inside an adventure: a mentor, a reason to practise and progress that carries into the story. A television gives that adventure a shared screen, while a phone can supply movement tracking without buying a wearable controller. Our goal was to connect bodyweight training, medieval sword-and-shield play and live clan competition in one experience.

### What it does

The Ashen Gate is a medieval movement game designed for Fire TV. Players begin as a squire in a voiced first chapter, learn from Sir Alden and face a health-based sword duel. The Android phone estimates body joints locally. The right hand and forearm place and aim the sword; the left hand places the shield. Leaning, crouching and body-position changes provide bounded movement controls. Timing, attack line, stamina and distance influence the fight.

Players can enter Alden's training hall from the main menu or the story. They choose squat and push-up variations and a starting pace. The trainer assigns reps, sets and rest, calibrates a side view for each exercise and checks visible range, pace, support position and alignment. Missing joints, partial movements and interruptions reset the current attempt. Prerecorded voice guidance and captions explain what to do. Completed camera routines earn daily-capped XP and bounded story bonuses. The next recommendation uses completed practice and the player's effort feedback.

Clan Wars connects independent participant screens to a shared local server. Each clan brings one to three fighters, with corresponding pairs facing live human opponents. The server resolves health and contributes each completed duel to the clan score. Shared starter gear keeps this prototype's multiplayer matches on common terms. Camera video stays on the phone; movement data is sent for gameplay.

### How we built it

The TV application is a Java Android WebView APK with remote controls, a React/TypeScript interface and a Three.js first-person courtyard. An Android phone runs MediaPipe Pose Landmarker in its browser. A Node.js WebSocket relay pairs devices and supports the authoritative multiplayer simulation. Exercise counting uses a separate calibration and repetition state machine. Dialogue and instructor speech are prerecorded synthetic voices, accompanied by original synthesized music and effects. Artwork and third-party model provenance are documented in the repository.

### Challenges and accomplishments

Movement continuity mattered as much as rendering. We tested tracking gaps, hidden joints, repeated frames and interruptions so a resumed controller cannot fabricate a strike or finish an interrupted repetition. We also built remote text entry for clan names and invites, validated saved calibration and pairing data, and tested three simultaneous clan pairings and interrupted connections. The suite now passes 112 tests. Native emulator checks verified D-pad, Select, Back, Play/Pause and an actual 1920 × 1080 drawing buffer.

### What we learned and what's next

Phone framing and reliable interruption handling are central to a movement game. Our next work is broader human playtesting, exercise accuracy and end-to-end latency measurement, Fire TV hardware profiling, more bespoke character animation and later story regions. Permanent clans, saved multiplayer rewards and internet matchmaking are future scope. The current prototype provides local/LAN guest multiplayer and exercise-driven story progression.

**Before copying:** fix the two issues documented in [the camera streaming audit](../artifacts/camera-stream-audit.md), then replace or supplement this draft with what you personally learned during the phone rehearsal. Do not describe real-phone accuracy or physical Fire TV performance as validated until those checks happen.

## 2:45 recording script

Use English narration. Capture the native APK in the Android TV emulator and real Android phone movements. Rehearse before recording; edit normal setup/rest out of the final video and label the cuts. Keep captions visible where the instructor speaks.

| Time | Footage | Suggested narration |
| --- | --- | --- |
| 0:00–0:12 | Native emulator app main menu, then the courtyard. | "This is The Ashen Gate, a movement-controlled medieval adventure for Fire TV. Training with your mentor strengthens your character for the story." |
| 0:12–0:30 | Player in the phone camera view; native game sword and shield follow deliberate movements. Briefly show D-pad navigation. | "The Android phone estimates joints locally. My right arm places and aims the sword; my left arm places the shield. The TV remote handles the menus. Camera video stays on my phone." |
| 0:30–1:05 | Training menu, side-view calibration, a valid rep, a rejected partial rep and voice correction. Include squat and push-up excerpts; show completion and XP only from an actually completed camera routine. | "Alden assigns the routine and guides each exercise. Counting needs a controlled, visible movement through the calibrated range. This partial rep resets. Completed camera routines earn daily-capped story progression." |
| 1:05–1:35 | Story dialogue excerpt, a directional block or parry and a counter. Show health, stamina and brief tracking loss/return. | "In the story, skill matters: cover the incoming line, manage stamina and counter at the right time. Losing tracking holds the fight, and returning cannot turn a jump in position into damage." |
| 1:35–2:15 | Native camera player's clan match plus the second participant's labelled browser preview, visible together. Show shared health and clan result. | "This is live local multiplayer on one server. One player uses phone tracking; the other uses our labelled keyboard preview. There is a human on each side. Each paired duel contributes to the clan score, and both screens receive the same result." |
| 2:15–2:35 | Trainer/story/clan shots, player guide and two-hand controls. | "Fitness practice, a voiced mentor and family competition share one movement interface. Reps, sets and interruptions are checked separately from combat, while a player guide explains each mode." |
| 2:35–2:45 | Name, repository link and short closing shot. | "The prototype has 112 passing tests and a verified Full HD emulator path. The next steps are broader human playtesting, hardware profiling and more of the story." |

The training segment needs edits: a complete routine includes calibration for both exercises and its prescribed rest. Use on-screen text such as **"Routine and rest shortened for this recording"** when cutting between those stages. Never substitute preview completion for camera-earned XP.

If a real camera routine or correction is unreliable during rehearsal, fix and retest it before including that claim. The existing software tests validate the counting rules; they cannot stand in for the live exercise demonstration.

## Recording setup

1. The Amazon developer account/identity step is reported complete. Finish the outstanding camera fixes and plan the real-phone checks described in [the audit](../artifacts/camera-stream-audit.md) before recording.
2. Build and start the app server: `npm run build`, then `npm start` in a terminal that remains running.
3. Build/run the native emulator APK with `npm run android:build` and `npm run android:run`. For the Windows setup, use the existing emulator and its server configuration.
4. Connect the Android phone through `npm run phone:usb`, approve debugging on the phone and start its camera. Rehearse full upper-body framing for combat and the side view for training.
5. Use the native emulator as the camera player's screen. Put an independent browser window at `http://127.0.0.1:8787/arena` on the other display for the second person's clearly labelled preview. Create/join a 1 vs 1 war and keep both screens visible. See [two-screen instructions](TWO_SCREEN_DEMO.md).
6. Record app audio plus clear narration. Hide private phone notifications and pairing tokens. Capture actual game footage, including the native application, rather than a slide-only pitch.
7. Export under three minutes, upload publicly to YouTube or Vimeo, and check the link in a signed-out browser.

## Submission fields to finish

- Video URL: **not created yet**.
- GitHub URL: https://github.com/dazai2001-cmd/Amazon-hackathon. The private repository still needs the official reviewers' access.
- Build/testing instructions: README.md and docs/DEMO.md. Include the native emulator and local server route.
- Product feedback: review and copy the relevant text from [PRODUCT_FEEDBACK.md](PRODUCT_FEEDBACK.md).
- Primary track: Fire TV. Optional AWS Builder/Open Source claims need their own qualifying evidence; none is currently established.
- Team/entrant details, eligibility and rights: complete with your own accurate information.
- Final status: saving a draft does not confirm the hackathon entry has been submitted. Verify the submission confirmation before the deadline.
