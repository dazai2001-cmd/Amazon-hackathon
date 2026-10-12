# The Orders: live clan wars

Open `/arena`, or choose **Clan war hall** from the chapter. This prototype replaces bases with live champions: two clans field equal rosters of one, two or three fighters. Each roster slot fights the corresponding opposing slot in a separate first-person sword-and-shield duel. A victory contributes one clan point; a draw contributes half a point to each clan. The higher total wins after every pairing finishes.

## Playing together

1. Run one game server. Each participant opens the app on their own TV/browser screen and pairs their own Android phone. On a LAN, all screens must use the same server address. A labelled desktop preview is also available for software demonstrations.
2. The captain enters a fighter name and clan name, selects the roster size, and creates the war. Share the six-character **war invite** with the other participants.
3. Each participant enters that invite and chooses **Join host clan** or **Opposing clan**. The first opposing participant names that clan. The war invite is different from the camera pairing QR/code.
4. Connect and calibrate the movement controller, keep the required joints in view, and choose **I’m ready**. The captain can start once both rosters are full, connected and ready.
5. Take guard through the shared countdown. Use the right hand/forearm to place and swing the sword; use the left hand to cover incoming high/left/right lines. Lean, crouch and small physical steps affect target placement and range. Lower the shield to recover stamina.
6. Follow the health bars and clan score. Remain on the result screen until the remaining pairings finish. Returning to the hall permits another war.

**War guide** reopens the relevant tutorial. Opening it during a pairing pauses both blades. Closing it resumes unless the fighter was already paused. A paused, disconnected or untracked fighter has 30 seconds to return before forfeiting; if both remain unavailable, the pairing is drawn. **Yield & leave** forfeits immediately.

Preview controls: J/K/L cut, Shift+Z/X/C guard left/high/right, A/D lean, V crouch, W/S duel footwork. Space pauses. These are synthetic movements; no camera is running.

A laptop and an extended monitor can host two separate, visible browser windows on the same PC. Keyboard focus can change while the visible phone-controlled fighter continues receiving movements. Hiding or minimizing a game pauses its pairing. With one Android phone, use a second person on the labelled keyboard preview for the other fighter. See [the two-screen demo setup](TWO_SCREEN_DEMO.md).

## Implemented rules and transport

The existing authenticated TV WebSocket routes clan commands. Phone clients cannot create wars, claim damage or declare results. Public fighter IDs are separate from private camera pairing codes and TV tokens. Clients send bounded hand/forearm/body controls at 20 Hz; the server simulates pairings at 30 Hz and publishes snapshots at approximately 15 Hz. No camera frames or microphone audio are transmitted.

The server owns health, stamina, sword reach, sweep checks, directional guards, timed parries, counters, simultaneous draws, disconnect handling and once-only clan scoring. Replayed/out-of-order inputs are rejected. Missing movement freezes both players and rebases the next frame, so a tracking jump cannot become a hit. Late packets after a result cannot award another point or create a false connection error. Displayed damage counts actual health lost, including the final hit.

The opponent is another participant’s pose, rather than the story rival’s AI. The renderer follows peer lean/crouch/footwork and estimates arm placement with a two-bone rig solver. This remains an approximate rig: finger articulation, full body animation and exact sword roll are not captured. The preview controller clock is independent of rendering so multiple 3D screens do not skip short simulated cuts.

## Prototype limits

Wars, guest identities, rosters and results are held in server memory. They end when the server restarts and expire after an hour. Permanent clan membership, accounts, ranked matchmaking, seasons, clan chat, saved PvP coins and a competitive gear shop are not implemented. Internet play needs a reachable deployment of the WebSocket server; this build supplies a local/LAN server.

All PvP fighters use the same starter sword and shield. Local exercise XP and story purchases do not alter competitive damage. Bounded client controls are not proof of a human body or tamper-resistant exercise verification, so the prototype does not claim ranked anti-cheat.

Browser validation used two independent screens with labelled synthetic controllers. It verifies shared controls, health, defenses and scoring over real WebSockets, not two physical phone cameras or Fire TV hardware performance. See [the test report](../artifacts/multiplayer-tutorial-test-report.md).
