# Clan wars and tutorial validation

Date: 12 October 2026. Build: local production frontend and Node game server. Browser: Codex in-app browser. Changes follow training commit `8f90697`.

## Automated checks

`npm run build` passed TypeScript checking and production bundling. Vite emitted the existing lucide-react module-directive warnings. `npm test` passed **86 tests, 0 failed**, including 16 multiplayer rule tests and one real two-client WebSocket relay test. The remaining 69 tests cover tracking, weapons, story combat/progression, audio assets, relay bounds and strict training routines.

Multiplayer checks include bounded inputs, replay rejection, stationary humans with no AI attacks, sword-tip sweeps, stamina, guard directions, perfect parries, later stroke segments, range/footwork, crouching, simultaneous draws, health-based wins, full/ready rosters, captain-only start, corresponding pairings, private pairing-token separation, once-only clan points, 30-second loss-of-controller handling, captain replacement, resumed feedback and harmless final packets after victory.

## Browser checks

Two independent player screens joined the same server: Rowan of Ashen Guard and Mira of Iron Hawks. Both used explicitly labelled desktop previews, not physical phone cameras. The lobby displayed both rosters and readiness consistently; the host could start only when both were ready.

An overhead cut from Rowan changed Mira’s health to 84 on both screens while Rowan stayed at 100. Rowan’s raised high shield parried Mira’s return cut without health loss. The war guide paused both participants, displayed its forfeit window, and returned to the active pairing when closed.

A separate final run after fixing the preview controller clock used seven deliberate cuts to reduce Mira’s health from 100 to zero. Both screens reported **Ashen Guard wins, 1:0**. Rowan’s result recorded exactly **100 damage dealt**. The final input/result race did not show a connection error. Both clients’ captured console error/warning lists were empty. The preview clock fix makes short simulated cuts independent of rendering FPS; live phone timestamps are unchanged.

The tutorial opened on a fresh chapter and fresh clan page. All five lessons were navigable by Next/Previous, D-pad and Select. Back closed the guide without leaving the game. Closing persisted onboarding; the title replay button reopened it. Connect my Android phone opened the existing pairing screen and its hands-free instructions.

Training guide opened directly to the exercise lesson. Holding the preview exercise key for 1.8 seconds while reading left the counter at **0/4**, with **0 completed sets** and a paused caption. Closing returned to calibration without granting a repetition or XP. The guide’s preview page displayed camera-off/XP-disabled status and keyboard-specific controls. Underlying game controls were inert while the modal was open.

Screenshots:

- [Player control tutorial](player-guide.png)
- [Synchronized clan lobby](multiplayer-clan-lobby.png)
- [Live player-controlled duel](multiplayer-live-duel.png)
- [Shared clan victory](multiplayer-clan-victory.png)

## Limits

The subsequent laptop/monitor setup passed the production build and all 86 tests. Multiplayer now releases held keys when focus changes, and pauses when the document becomes hidden. The local lobby loaded without captured console warnings/errors. The actual extended-display focus-switch and camera-plus-keyboard demonstration still needs to be tried on the user’s displays; automated server tests do not establish that hardware result.

These checks prove software behavior with simulated movements over real WebSockets. They do not validate live human pose accuracy, physical exercise form, end-to-end camera latency, two real phone controllers, six simultaneous human cameras, audible speaker quality, or physical Fire TV performance. No Fire TV/Vega simulator recording was made in this pass.

Clan membership and results are in memory; accounts, permanent clans, rankings, saved PvP rewards and an internet deployment remain unimplemented. The server validates controls and owns results but cannot establish that a client is an untampered human camera. Exercise bonuses remain local and apply only to story combat. Peer arm placement uses an approximate rig solver rather than full-body motion capture.
