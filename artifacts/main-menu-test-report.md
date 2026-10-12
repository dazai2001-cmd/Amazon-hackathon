# Medieval main-menu validation

Date: 12 October 2026. Local production build served by the existing game server.

The root page now presents Story, Training, Clan Wars, Controller Setup, Settings and Player Guide. Orbit Arena, Reach & Reset, their home cards and their screen components are removed. Calibration remains available through Controller Setup. The browser title and description identify The Ashen Gate.

`npm run build` passed TypeScript and production bundling. `npm test` passed **86 tests, 0 failures**. Existing lucide-react build directive warnings remain. The shared tracking/combat tests still validate the primitives used by the medieval game.

Browser checks used separate test origins to avoid modifying the user’s story, coins or exercise progress:

- At 1280×720, document height was exactly 720 and every main-menu option fit without scrolling; the last utility buttons ended at y=584. The final 1080×790 view also showed all options.
- Remote Down followed by Select opened Training directly at `/training`. Direct reload retained the training view; its camera pairing opened above the hall, and Back closed pairing without leaving the routine.
- Sound and auto-dialogue toggles persisted after reload. Beginning the story respected sound-off preferences and displayed captions. Story navigation used `/chapter`; browser Back returned to `/`.
- Controller Setup offered phone pairing, calibration and an explicitly labelled desktop preview. Preview status remained visible on the main menu and in the story.
- Selecting Clan Wars opened `/arena`. With an explicitly synthetic 18-fps phone fixture, hands-free setup completed neutral/lean/reach calibration and returned to the **same** clan lobby and invite (`R23ATW`). Returning to Main menu left the lobby. No real camera was used for that check.
- Starting a Steady practice plan saved the 2×6 routine preference. Leaving before completing the circuit and reloading kept the preference while XP remained 0 and Squire level remained 1.
- Captured console warnings/errors were empty on the final menu and the checked story/training/clan flows.

Initial checks exposed the standalone training hall’s missing height container and calibration accidentally leaving a clan lobby. Both were repaired and the affected flows were repeated successfully.

Proof: [finished main menu](ashen-main-menu.png).

Physical Fire TV performance, native D-pad input on a real device and real phone exercise accuracy remain outside these browser/software checks. Existing saves keep their keys and formats; a new `moveroom.settings.v1` record stores sound and auto-dialogue preferences. The menu does not award XP or reset story/gear data.
