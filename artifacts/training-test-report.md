# Anytime training validation

12 October 2026. Tested the training feature locally, independently of the human-pose model accuracy checks in the earlier chapter report.

## Automated checks

`npm test`: **69 passed, 0 failed**. Fifteen exercise/progression tests cover all five variation choices, aspect-correct side views, start/lower/return calibration, no rep during setup, incomplete/fast/held movements, missing joints, duplicate timestamps, camera gaps, pauses, support movement, push-up hip-line drift, arm-only flexion, wrist support, multiple sets, rest, personalization, XP limits, save validation, battle-bonus caps and trainer voice-script coverage. The authenticated relay test verifies exercise commands and image aspect transmission. All 133 voice files and 15 music/effect assets are present.

`npm run build`: TypeScript and Vite pass. The same existing Lucide directive warnings remain. Native Java was unchanged; the existing APK loads the updated server-hosted frontend. No new physical Fire TV or Android-phone exercise test was performed.

## Browser walkthrough

Used an isolated local origin to keep user story progress separate. Interacted through visible buttons and keyboard controls; did not mutate application state or local storage through browser evaluation.

- Opened the hall from the chapter title and opened camera pairing over it. The pairing dialog received focus; training remained behind it. Training now has separate pairing readiness and does not require weapon-control calibration.
- Completed start/lower/return calibration: the counter remained at zero.
- Completed four squats through animated preview movements: four reps, one completed set, zero rejected attempts.
- Paused a rest in the earlier walkthrough: it resumed at 45 seconds after the pause, with the completed set preserved.
- Completed the final enforced rest, then a fresh push-up calibration.
- Completed four wall push-ups through the final support-aware preview: the result showed **eight reps, two sets, zero rejected attempts**.
- The result explicitly showed **Preview complete · No XP awarded**, and all character stats remained one with zero XP.
- Chose Too demanding, returned to the adventure and reloaded. The next Starting out circuit showed one set of three squats and three wall push-ups, preserving effort feedback and zero XP.
- Alden’s speaking state was visible during calibration and guidance. Voice files played through the browser player; physical TV speaker audibility was not tested. Captions and sound controls remain available.
- No browser console errors were present after the final walkthrough.

During testing, the covered 3D courtyard consumed rendering work, and slower browser frames disrupted the original simulated controller. The hall now suspends the covered scene and uses a fixed-step, clearly labelled preview. This change does not interpolate live camera frames. Returning from the hall restores the courtyard.

Evidence: [live rep counter](training-live.png), [preview completion](training-preview-complete.png), [training hall](training-hall.png).

## Practical limits

The scripted joint fixtures and browser preview prove software behavior, not human movement accuracy. Side-view gating, form thresholds and rep detection still need recorded ground truth and live Android testing across body types, clothing, lighting and phone performance. This two-exercise demo does not establish fitness improvement or certify every aspect of exercise technique. Rewards are local saves, not secure competitive progression. Actual multiplayer, family profiles and server-verified rewards are separate work.

See [the implementation and research sources](../docs/TRAINING.md). Hackathon submission proof must use an actual Fire TV or Fire TV/Vega simulator.
