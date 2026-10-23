# Earned Valor — final submission details

Updated 23 October 2026. Phone testing is treated as complete at Rahul's instruction. The demonstration still honestly labels its input as synthetic.

| Field | Value |
| --- | --- |
| Project | Earned Valor |
| Primary track | Fire TV |
| Devpost project | https://devpost.com/software/earned-valor |
| Demo video | https://youtu.be/gmJccY-Ejcs |
| Source code | https://github.com/dazai2001-cmd/Amazon-hackathon |
| Setup / testing instructions | https://github.com/dazai2001-cmd/Amazon-hackathon/blob/main/README.md |
| Reviewer requirements and walkthrough | https://github.com/dazai2001-cmd/Amazon-hackathon/blob/main/docs/REVIEWER_GUIDE.md |
| Passing software / browser / APK verification | https://github.com/dazai2001-cmd/Amazon-hackathon/actions/runs/39905234049 |
| Product feedback: five answers | [DEVPOST_ADDITIONAL_FIELDS.md](DEVPOST_ADDITIONAL_FIELDS.md) |
| Tool-by-tool feedback | [PRODUCT_FEEDBACK.md](PRODUCT_FEEDBACK.md) |
| Optional friction log URL | https://github.com/dazai2001-cmd/Amazon-hackathon/blob/main/docs/FRICTION_LOG.md |
| AWS Builder / Open Source mini-challenges | No / No, unless additional qualifying work is supplied |

The published source at `4cd91f65de14dbf9610943df66ccd80fc53a7beb` passed a fresh GitHub Actions installation, 128 unit tests, 10 browser checks, production build, HTTPS/WSS production smoke check and native APK build. A separate fresh clone also loaded the production game and 3D courtyard in a fresh TV emulator. Later documentation-only changes do not alter that tested application.

## Public-page corrections

The live Devpost page includes the project story, uploaded video and source link and lists the Amazon hackathon under **Submitted to**. Its narrative still describes the earlier implementation. These replacement paragraphs match the current source:

### Accomplishments

We built a complete first-chapter story path, a voiced training instructor, exercise-driven story progression and live local clan duels. Six local squire profiles keep separate story, equipment, calibration and training saves. Completed clan results and records persist on the server.

Our automated suite passes 128 tests covering camera recovery, combat, training, multiplayer, pairing, saved-state recovery, profiles and progression. Ten browser checks cover remote navigation, pairing and tracking interruptions, camera replacement, real worker inference, rendering and TV-density layouts. Native Android TV emulator checks verified remote navigation and a Full HD rendering path.

### What's next

The camera recovery and restart fixes are implemented and covered by regression checks. Our next work is broader human playtesting, measured camera-to-display latency, physical Fire TV profiling, more bespoke character animation and later story regions. Local clan records are already persistent; account-backed membership, ranked internet matchmaking and multiplayer rewards remain future work.

### Video / testing disclosure

The video records the native Android TV APK in an emulator. Its skeleton and two multiplayer controllers supply synthetic pose input through the real relay and game rules. Training and rest are edited for length, and progression belongs to an isolated test profile. This demonstrates the software path and platform integration; it is not a recording of live camera inference or a quantitative accuracy/latency benchmark.

## Private fields

- Confirm the saved primary track is **Fire TV**.
- Confirm the tools-used, successes, limitations, onboarding and reuse answers are all saved. The linked feedback draft provides each answer.
- Complete the entrant's own eligibility, rights, conflict/support and representation declarations accurately.
- Keep the entry associated with **Build, Ship, Shape: Amazon Developer Hackathon** and retain its submission confirmation.

The uploaded video plays without sign-in but carries YouTube's **Unlisted** badge. Set it to **Public** to remove ambiguity with the publicly-visible-video requirement. The rules do not expressly clarify the Unlisted setting, so this audit does not certify that setting as compliant.

Deadline: **24 October 2026, 00:30 IST**. See [the readiness audit](HACKATHON_READINESS.md) and [official rules](https://amazonappdev2026.devpost.com/rules).
