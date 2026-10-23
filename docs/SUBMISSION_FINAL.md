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

### Vision / Inspiration

Earned Valor brings fitness, adventure and friendly competition to the living-room TV. Our goal is to give people three reasons to move: their own progress, an entertaining story and time with other people. Train with a medieval mentor, grow your squire through completed routines and use your movement and timing in sword-and-shield duels. Families and friends can take turns and keep their own local progress; the working prototype also supports local clan matches across independent screens. Our longer-term vision is online play with friends and family across households, followed by opt-in matchmaking against new rivals and clans. Fair competition remains central: exercise rewards strengthen the story experience, while multiplayer begins on common terms. Internet hosting, account-backed clans and public matchmaking are planned work.

### Accomplishments

We built a complete first-chapter story path, a voiced training instructor, exercise-driven story progression and live local clan duels. Six local squire profiles keep separate story, equipment, calibration and training saves. Completed clan results and records persist on the server.

Our automated suite passes 128 tests covering camera recovery, combat, training, multiplayer, pairing, saved-state recovery, profiles and progression. Ten browser checks cover remote navigation, pairing and tracking interruptions, camera replacement, real worker inference, rendering and TV-density layouts. Native Android TV emulator checks verified remote navigation and a Full HD rendering path.

### What's next

The camera recovery and restart fixes are implemented and covered by regression checks. Our next work is broader human playtesting, measured camera-to-display latency, physical Fire TV profiling, more bespoke character animation and later story regions. Local clan records are already persistent; account-backed membership, ranked internet matchmaking and multiplayer rewards remain future work.

### Video / testing disclosure

The video records the native Android TV APK in an emulator. Its skeleton and two multiplayer controllers supply synthetic pose input through the real relay and game rules. Training and rest are edited for length, and progression belongs to an isolated test profile. This demonstrates the software path and platform integration; it is not a recording of live camera inference or a quantitative accuracy/latency benchmark.

## Confirmed submission status

Rahul confirmed on 23 October that he completed everything required to submit, in response to the question about Fire TV and all five feedback answers. Required private fields and declarations are recorded as **completed per entrant**; their contents are not independently exposed on the public page. The project publicly lists **Build, Ship, Shape: Amazon Developer Hackathon** under Submitted to. Retain its submission confirmation.

The uploaded video is **Unlisted** and plays without sign-in. [YouTube's documentation](https://support.google.com/youtube/answer/157177?hl=en) confirms that anyone with an Unlisted link can view without a Google account. The [rules](https://amazonappdev2026.devpost.com/rules) require a publicly visible video link but do not explicitly name YouTube's Public setting. We interpret the observed anonymous link access as meeting the viewing requirement; this is not a separate organizer ruling about visibility labels. The earlier instruction to switch to Public was overly strict and is withdrawn. Keep the current link accessible through judging.

Deadline: **24 October 2026, 00:30 IST**. See [the readiness audit](HACKATHON_READINESS.md) and [official rules](https://amazonappdev2026.devpost.com/rules).
