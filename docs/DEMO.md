# Earned Valor — The First Oath demonstration

Install and start the project using [the reviewer guide](REVIEWER_GUIDE.md), which lists software/hardware requirements, clean-clone commands, native TV setup and phone pairing. The [uploaded video](https://youtu.be/gmJccY-Ejcs) records the native emulator with clearly labelled synthetic input; the following steps are a suggested interactive walkthrough.

1. Launch the native APK in the Android TV emulator with the local server running. Open **Controller Setup** on the main menu and pair/calibrate the Android phone over USB, then choose **Story**.
2. Set **Game sound** on in Settings and begin the story. Show the opening memory, walk to Alden, and choose a reason for becoming his squire. Voice playback advances conversations; dialogue choices wait for the player.
3. Complete the shield, cut and evasion lessons. The right wrist places the sword and the forearm aims it; the left wrist places the shield. Keep the relevant joints visible.
4. Meet Mara or use **Go straight to sparring** for a shorter presentation. Point out the two health bars and stamina. Cover a high/left/right attack line, then cut into her recovery opening. A late block earns a stronger riposte; cutting into her guard is parried. Use distance to stay within sword reach.
5. Briefly leave the camera view during a trial to show that both fighters pause. Return to view without awarding damage from the jump in position.
6. After a win, speak to Mara, walk to Tomas's forge and choose equipment. The first victory awards 20 coins and Tomas's travel purse awards 20 more; each reward is collected once. Steel costs 30 and trades stamina for reach.
7. Follow the Orders board conversation and the letter scene at the gate. Select the closing response and finish the chapter. Reload and resume to demonstrate the saved quest, choice, coins and gear.

For a short recording, show excerpts from the story and one complete combat exchange. The anytime exercise hall and live guest clan wars are playable. Present live multiplayer with a second independent participant screen, keeping it distinct from Mara’s computer-controlled story trial.

Desktop preview uses explicitly simulated landmarks: **J / K / L** cut, mouse movement places the sword hand, **Shift + Z / X / C** covers left / high / right, **A / D** leans, and **W / S** advances or retreats in the trial. **Space** pauses. In exploration, WASD walks, arrows turn, E interacts, and each objective provides a guided route. To repeat the relay path at 18 fps without a phone, attach scripts/relay-fixture.ts to the pairing code; identify this as synthetic input in the recording.

## Revised video with the vision

The revised export is **2:34.753, 1920×1080 at 30 fps**, with English narration, music and burned-in captions. It replaces the opening and closing with the fitness, adventure, family and competition vision, while retaining all ten middle gameplay sections. The [judging criteria](https://amazonappdev2026.devpost.com/rules) give equal weight to implementation, design, potential impact and idea quality; the pitch is grounded in the functioning prototype.

Local upload file: `artifacts/EarnedValor-YouTube-Demo-Vision.mp4`. Companion files: [YouTube title, description and updated chapters](../artifacts/EarnedValor-YouTube-Upload-Vision.txt), [English captions](../artifacts/EarnedValor-YouTube-Captions-Vision.srt), and [export verification](../artifacts/EarnedValor-Video-Verification-Vision.json). The MP4 remains a local artifact; small companion files are committed to the repository. The original export is preserved.

**Opening, 17.73 seconds:**

> Earned Valor brings fitness, adventure, and friendly competition to the living room TV. Train with a medieval mentor, grow your squire through completed routines, and challenge another fighter. Our goal is to give families and friends a reason to move, play, and return together.

The opening combines the native main menu, training and duel footage with a fitness/adventure/competition panel. Synthetic-input labels remain visible.

**Closing, 20.37 seconds:**

> Today, the prototype supports personal progress and local clan duels, with equal starting gear for competitive matches. Our vision is online play with family and friends across homes, followed by opt-in matches against new rivals and clans. Online matchmaking is planned. Train your body. Forge your legend.

The closing explicitly separates **Working prototype** from **Planned online experience**, and keeps **Online play is planned** on screen. Full audio/video decoding, ordered captions, audio levels and sampled visuals were checked. The audio mix averages −16.35 LUFS with a −4.40 dBTP true peak.

**Upload status:** the revision is ready for Rahul to reupload. The existing YouTube link still points to the original video. After uploading this export, replace the Devpost video link and use the revised description/chapters. No new upload URL has been claimed.

The same vision can go into Devpost's Inspiration/What's next fields. See [the copy-ready submission text](SUBMISSION_FINAL.md). Account-backed clans, public matchmaking, rankings and player protections are roadmap work; current simultaneous clan play uses independent screens/controllers on the same local server. Training bonuses apply to the story; PvP uses common starting terms.

## Before recording

- Keep the PC server running and the phone display awake.
- Avoid showing pairing tokens or private phone notifications in a public recording.
- Check the room code and camera before beginning; the first model load can take a few seconds.
- Use uncluttered framing and adequate light. Both hands and hips must remain visible.
- For native platform proof, use the actual emulator APK. Label synthetic or desktop-preview input when demonstrating software; only live camera footage supports a camera-tracking demonstration claim.
- Report measured latency only after a hardware test. The footer's relay round trip is not end-to-end camera latency.

## Honest presentation

Position this as a phone-powered movement platform for Fire TV, with playable sword combat and reusable movement coaching. Camera-based movement games already exist; do not claim that concept is new. Emphasize the Fire TV workflow, two-hand combat mapping, personal calibration, and a common tracking interface for games and practice.

## Fitness progression demo

Choose **Training** directly from the main menu, or **Enter training hall** from the chapter. Show the assigned circuit and variation choices. In a live camera demo, set the phone at the side and demonstrate the start/lower/return calibration without reaching for the screen. Complete the squat set, wait or pause during its rest, reposition the phone for the push-up calibration, and complete the assigned push-ups. Show the saved XP and capped Strength/Endurance effects on the next story duel. This must be a real camera exercise demonstration to support a tracking claim.

For a clearly labelled software-only walkthrough, connect the desktop preview and hold **B** to lower/release to return. Show that completing the circuit awards no XP. The preview uses synthetic joints and cannot validate human exercise accuracy. Alden’s voice can be toggled from the hall header; all instructions remain captioned.

The [official FAQ](https://amazonappdev2026.devpost.com/details/faqs) explicitly accepts an Android TV Emulator or Fire TV/Vega simulator; physical Fire TV hardware is not required. Record the native emulator APK in the final video. A desktop browser alone does not demonstrate that platform workflow.


## Player guide and multiplayer demo

For the available laptop, extended monitor and one Android phone, follow [the two-screen setup](TWO_SCREEN_DEMO.md). One fighter uses the camera and a second person uses the labelled preview controller. Visible browser windows keep receiving their respective controls even when keyboard focus changes.

1. On a fresh browser/device, show the main menu and its six options, then open **Player Guide** to show the five-lesson field guide. Demonstrate Next/Previous and Back with the remote. Close it and reopen **Player guide** to show it remains available.
2. From Alden’s exercise hall, open **Training guide**. Show that the counter is paused while reading and resumes without an extra rep when the guide closes.
3. On two independent screens, open **Clan war hall**. Create a 1 vs 1 war, join the opposing clan with its invite, and pair one phone per participant. For a software-only recording, label both controllers as desktop previews.
4. Ready both fighters and let the captain start. Show one person’s cut updating the opponent health on both screens, then a correct guard or timed parry. There is no opponent AI in this mode.
5. Open **War guide** briefly during the fight: both players pause and the guide explains the 30-second return window. Close it promptly and resume.
6. Complete the health-based fight. Show the shared clan point and result. Explain that 2 vs 2 and 3 vs 3 wars consist of paired duels; the final total waits for every pairing.

Guest sessions and active wars expire with the server session. Clan records and completed scores persist on disk. Account-backed membership, PvP economy, seasons and internet matchmaking remain future scope. The submitted video already demonstrates the accepted native emulator workflow with labelled synthetic inputs.
