# Medieval movement RPG direction

Updated 12 October 2026. Chapter One now has a continuous story path with courtyard exploration, staged dialogue, choices and callbacks, three interactive weapon lessons, the trial, forge, Orders board and letter reveal. Five prerecorded synthetic cast voices, original score/ambience/effects, subtitles, audio settings and saved quest checkpoints are implemented. The sections below distinguish that local prototype from the larger game proposal.

## Agreed direction

- A grounded medieval game in a 3D world, with first-person sword-and-shield combat controlled by the player's body movement, using an Android phone camera and a Fire TV display.
- Start as a beginner with a plain sword and shield. Exercise develops in-game stats; victories earn coins for equipment with meaningful tradeoffs.
- Training consists of bodyweight exercises, with selectable variations and repetition targets, rather than a large standalone workout library.
- An instructor teaches through voice guidance, rep counting, and observable movement feedback.
- Combine the disgraced mentor mystery, the journey through five masters, and the dying king's final tournament.
- Clans or teams have live multiplayer fights against other players. The multiplayer mode must connect actual players and resolve their shared match state.

## Training implementation and next steps

| Exercise | Initial variation choices | In-game reward |
| --- | --- | --- |
| Push-ups | Wall, knee-supported, standard | Implemented: complete the circuit to grow Strength and Endurance |
| Squats | Shallow or regular, with calibrated range and controlled repetitions | Implemented: complete the circuit to grow Strength and Endurance |
| March or jog in place | March, jog; timed target | Planned: dedicated endurance progression |

The anytime hall now assigns reps/sets, calibrates visible range, counts controlled cycles, enforces rest, gives Alden’s local voice cues, saves effort feedback and awards bounded story bonuses. See [the implementation and validation limits](TRAINING.md). Live guest clan wars are now playable at `/arena`. Permanent clans, family profiles, verified server-side exercise rewards and long-term fitness validation remain future work.

Players explicitly choose their variation and a manageable target; the app should not infer their fitness level or force the same repetition target on everyone. Camera setup and calibration are specific to the chosen exercise. Floor push-ups need a side view with relevant joints visible, while standing exercises use a separate setup.

Award progress for completing a calibrated task, with bounded stat improvements and chapter caps. More repetitions should not produce unlimited competitive power. Equipment retains tradeoffs, and competitive matches use comparable progression and skill bands. Lunges, holds, and further variations can follow after the initial detectors are reliable.

The instructor gives short, evidence-based cues: the repetition number, when to reset, whether required joints are out of view, and validated timing/range feedback. Do not invent precise anatomical corrections from uncertain or occluded landmarks. Losing tracking pauses counting and clears an unfinished repetition; returning to view cannot award a phantom rep.

The current prototype's coach counts overhead reaches, and its movement calibration assumes an upright torso. Push-ups and squats need new exercise-specific measurements, repetition state machines, calibration, and recorded/live-camera validation. [MediaPipe's official pose guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js) describes landmark outputs; the game must implement and validate the exercise rules on top of those outputs.

## Combined story proposal

A dying king announces a final tournament to select the protector of his heir. Your instructor is a disgraced veteran whose knightly order was accused of betrayal. He cannot compete himself, so he trains you and sends you across the kingdom to qualify under five masters.

Each regional master teaches a combat discipline and reveals part of the order's downfall. Training improvements unlock practical techniques needed in the next trial. Rivals belong to competing orders, factions offer their support, and the journey introduces choices about loyalty, mercy, and ambition.

The tournament's reigning champion was the instructor's former pupil. By the final chapter, you discover that your mentor has withheld part of the truth. Your decisions affect whose secrets are exposed, which order earns your loyalty, and how the heir is protected. This makes the final tournament the meeting point of the personal mystery, regional journey, and political competition.

## Knightly Orders and live multiplayer proposal

Use the medieval name **Knightly Orders** for clans. Friends create or join an order, choose a banner, build a roster, and challenge another order.

Start order competition with three-player rosters. A challenge consists of three paired, live 1v1 duels; each victory earns an order point. The order with the most duel wins takes the contest. These are shared team contests assembled from direct player combat, rather than a simultaneous six-fighter arena.

Individual wins award coins; order victories can award banners, cosmetic insignia, and shared standings. A clan hall and additional team formats can follow. The three-player format is a proposal, not a fixed user requirement.

Each active duelist pairs their own phone with their own TV session. A multiplayer match service links the two sessions, checks input order and timing, and owns health, stamina, damage, results, and rewards. Clients animate the match and may predict input for responsiveness, but cannot declare their own wins or coin rewards. Define disconnect and tracking-loss rules before ranked play.

## Implementation sequence

1. Medieval training courtyard with instructor dialogue, selectable bodyweight exercise, and validated rep counting.
2. One readable sword-and-shield duel against a story rival, plus bounded progression and a small equipment shop.
3. A live duel between two player sessions, verified from both sides before presenting it as multiplayer.
4. Create/join an order, roster, and a three-duel order challenge with shared results.
5. Expand the five-master story, equipment variety, and competitive matchmaking.

This sequence is a delivery proposal; the user has agreed to the concept, not a particular release schedule.

## Assets and current status

A complete first-chapter screenplay is drafted in [CHAPTER_01_SCRIPT.md](CHAPTER_01_SCRIPT.md). The prototype uses its opening, choices, royal summons, weapon briefing, Mara's health-based trial, win/loss branches, shop, Orders introduction and letter reveal. Its working title is “The Gate That Stayed Shut.” The anytime training hall connects bodyweight routines to calibrated squat/push-up detectors and Alden’s voiced guidance.

Twelve original raster assets are saved under `public/assets/medieval`: three characters, three locations, and six inventory icons. The local gallery is `http://localhost:8787/medieval-assets.html`. Exact generation prompts, dimensions, and file hashes are included in that folder.

Two rigged 3D knights were evaluated, with source/license records and animation metadata under `assets/medieval`. The AutoSprite Sentinel is bundled as the temporary Mara opponent, with idle, attack, guard and hit animations. Alden and Tomas have original procedural figures with distinct clothing and faces; the generated portraits are not matching 3D character models. The courtyard and first-person sword/shield are procedural 3D geometry. Desktop and Android TV emulator playback have been checked; model optimization and physical Fire TV performance checks remain.

The running app offers the chapter at `/chapter`, alongside Orbit Arena and reach coaching. Walk or follow a guided route between characters, the forge, the Orders board and the gate. Both duelists have 100 health. Wrist placement and forearm direction control the sword, the other wrist places the shield, and sword-tip sweeps can damage the rival. High/left/right guards, timed blocks, ripostes, late evasion, footwork, stamina and equipment tradeoffs affect the trial; holding a lean throughout a wind-up no longer grants repeated free evasions. Local saves retain quest checkpoints, choices, completion, coins and gear; first-win and travel rewards can each be collected once. The prototype is a single courtyard. Bodyweight exercise counting and bounded exercise-driven story stats are implemented. Live Orders contests support 1–3 paired human duels per clan with shared scoring. Guest membership lasts for the server session; permanent clans and the five-master regions remain pending. The first-visit field guide explains each mode and can be reopened contextually. See [multiplayer](MULTIPLAYER.md) and [player guidance](PLAYER_GUIDE.md).
