# Hackathon readiness — 23 October 2026

The public [Devpost project](https://devpost.com/software/earned-valor) shows **Submitted to** the Amazon hackathon, embeds [the uploaded demo](https://youtu.be/gmJccY-Ejcs), and links to the correct GitHub repository. These observations were made while signed out. All listed reviewers have accepted repository access. Rahul instructed us to treat phone testing as complete; Devpost registration and Amazon developer account/identity verification were already confirmed.

**Software verification complete:** [GitHub Actions run 39905234049](https://github.com/dazai2001-cmd/Amazon-hackathon/actions/runs/39905234049) passed for published source commit `4cd91f65de14dbf9610943df66ccd80fc53a7beb`: 128 unit tests, 10 browser checks, production build, HTTPS/WSS production smoke check and native APK build. A separate fresh GitHub clone also passed the documented setup, built its APK and displayed the production game and 3D courtyard in a fresh TV emulator. See [reviewer requirements and instructions](REVIEWER_GUIDE.md) and [reproduction evidence](../artifacts/reviewer-setup-test-report.md).

**Submission status:** Rahul confirmed on 23 October that all required submission fields are completed, in response to the Fire TV/feedback confirmation question. The video is **Unlisted** and its link plays while signed out. The rules require a publicly visible video link but do not explicitly specify YouTube's Public setting; YouTube documents that anyone with an Unlisted link can watch without an account. This audit treats the observed link access as satisfying the access requirement, rather than claiming an organizer ruling on the setting. The earlier instruction to change to Public was overly strict and is withdrawn. No outstanding mandatory action has been identified from the checked requirements and entrant confirmation. See [final submission details](SUBMISSION_FINAL.md).

Earlier implementation audited: `3392b36fff6dad5b90a5fc0a1fb2e93cf1533793`. The earlier native remote/graphics checks used `2676823204ef9bc89e9f59794520776aca18b754`. Repository: [dazai2001-cmd/Amazon-hackathon](https://github.com/dazai2001-cmd/Amazon-hackathon).

Sources: [official rules](https://amazonappdev2026.devpost.com/rules), [official FAQ](https://amazonappdev2026.devpost.com/details/faqs), [submission and judging overview](https://amazonappdev2026.devpost.com/). The FAQ explicitly accepts an Android TV emulator. A physical Fire TV is not mandatory.

## Requirement checks

| Check | Status | Evidence or remaining action |
| --- | --- | --- |
| Fire TV theme | Meets | Fitness routines, computer vision, movement gaming, voice guidance and clan duels match the track. Every priority category need not be implemented. |
| Permitted implementation | Meets | Android/Fire OS WebView APK, React/TypeScript/Three.js, Android phone MediaPipe inference and local Node relay. No special Amazon runtime API is mandatory for this track. |
| Emulator demonstration route | Meets | The APK built and ran on Android TV 30 x86, with native D-pad/Select/Back/Play-Pause inputs. This is an accepted emulator according to the FAQ. |
| Working prototype | Software verified; phone testing treated complete | 128 automated tests and 10 browser checks passed. Camera recovery fixes, profiles, training progression and saved clan records are implemented. Phone testing is closed at Rahul's instruction; no specific accuracy or latency numbers were supplied. |
| Source, assets and setup | Published; fresh clone and cloud verification passed | The reviewer guide lists requirements and Windows/macOS/Linux commands. A fresh GitHub clone passed installation, 128 tests, production build/smoke and 10 browser checks; its APK built and loaded the game/3D courtyard on a fresh TV AVD. GitHub Actions run 39905234049 also passed. Models, artwork, audio, package lock, Gradle wrapper and notices are included. |
| Judge access | **Verified** | Private repo collaborators include `knmeiss`, `giolaq`, `anishamalde`, `mosesroth`, `emersonsklar`, `chris-trag` and `devposttesting`. No pending invitations were returned. |
| Project open-source license | Not required for the current private route | GitHub reports no project license. That does not block a private submission shared with judges. A public submission would need an open-source license. |
| Demo video access | Unlisted link; signed-out playback verified | [YouTube demo](https://youtu.be/gmJccY-Ejcs) is embedded in Devpost and displays 2:23. Local file is 143.961 seconds, 1080p/30 fps H.264/AAC with English narration and captions. Anyone with the link can watch without an account. The rules do not explicitly name YouTube's Public setting. Synthetic skeleton input is labelled throughout. |
| Product feedback | Completed per entrant | Rahul confirmed all required submission fields are complete on 23 October. Five answer drafts are in DEVPOST_ADDITIONAL_FIELDS.md, with tool-by-tool detail in PRODUCT_FEEDBACK.md. Saved private fields are not independently visible from the public page. |
| Written description and track selection | Public description verified; private fields completed per entrant | Public story, source link, video and event association are present. Rahul confirmed completion in response to the Fire TV/feedback question. The earlier public-page check found a 112-test count and completed camera/clan work described as future scope; optional copy-ready factual updates are in SUBMISSION_FINAL.md. |
| English | Verified for public materials | App, repository instructions, live Devpost description and narrated/captioned demo are English. |
| Work during the event | Evidence present | Recorded implementation commits are dated 12 October 2026. Generated-art provenance dates are within the event window. Explain these contributions in the submission. |
| Third-party rights | Documented; required declarations completed per entrant | THIRD_PARTY.md and included notices cover MediaPipe, React, Three.js, fonts, icons, Kokoro and model assets. The creator currently identifies Sentinel as CC0. Rahul confirmed completion of the required submission fields. |
| Devpost registration and submission fields | Confirmed by entrant | Registration was already confirmed; Rahul additionally confirmed on 23 October that all required submission fields are complete. |
| Amazon developer account and identity | Confirmed by entrant | Rahul reported identity verification completed in the Amazon developer portal on 13 October. Account setup is no longer an outstanding action. Appstore publishing has not been claimed or evaluated. |
| Entrant declarations | Completed per entrant | Rahul confirmed all required submission fields are complete. This records completion of the declarations; personal eligibility facts were not independently verified. |

## Final checklist

1. **Complete:** [cloud verification passed](https://github.com/dazai2001-cmd/Amazon-hackathon/actions/runs/39905234049) for the published application and tests. Fresh-clone installation, production serving and native emulator launch also passed locally. Judge access is already accepted.
2. **Complete:** the [uploaded video](https://youtu.be/gmJccY-Ejcs) plays while signed out and is linked in Devpost. Leave it accessible; no mandatory change from Unlisted to Public is asserted.
3. **Completed per entrant:** required track/feedback fields and submission declarations. Keep the submission confirmation. The [feedback draft](DEVPOST_ADDITIONAL_FIELDS.md) remains a reference; [public-page factual updates](SUBMISSION_FINAL.md) are optional polish.
4. Keep the submitted links and repository access unchanged unless correcting a real issue before the deadline.
5. Keep reviewer access, video and reproducible setup available through 20 November 2026. Public hosting is optional for this local prototype.

Deadline: **24 October 2026 at 00:30 IST**, equivalent to **23 October at noon PDT**. Judging ends 20 November 2026.

## How we address the judging criteria

These are assessments of the current implementation, not guaranteed judge scores. The four areas are equally weighted in the rules.

| Area | Current evidence | Strongest improvement |
| --- | --- | --- |
| Technical implementation | Native remote handling, local pose inference, calibrated sword/shield movement, strict rep/set state machines, server-owned human duels and 128 passing tests. | Record real phone inputs and corrections. Show both participant screens changing together. |
| Design | Medieval main menu, voiced Chapter I, player guide, hands-free calibration, anytime training and remote text entry. | Rehearse one short, coherent journey. Avoid spending the video on setup or long dialogue. |
| Potential impact | Exercise practice creates bounded story progression; the TV is a shared screen and video stays on the phone. | Explain the intended household/player and show why they would return. Keep fitness claims within demonstrated behavior. |
| Quality of the idea | Camera-controlled sword/shield play and a medieval instructor connect exercise, story progression and cooperative clan competition. | Lead with the fitness-to-game loop and embodied controls. Show what vision adds to the experience. |

## Optional challenges and scope

- **AWS Builder:** not currently evidenced. No AWS integration or Kiro Crew use was found. This does not block Fire TV entry.
- **Open Source:** not currently evidenced. The game repository is private and no qualifying public contribution was identified. This does not block Fire TV entry.
- **Friction log:** [drafted with reproduction steps and evidence](FRICTION_LOG.md), for entrant review and the optional URL field. The rules allow up to a 10% judging bonus for assessed friction logs; submitting this draft does not guarantee a bonus.
- **Graphics:** Auto starts with a 1920×1080 buffer and lowers to a 720p cap after sustained low frame rate; fixed 1080p/720p choices are also saved. The Full HD path has been verified in the emulator. The event does not list a resolution minimum.
- **Internet hosting, permanent clans, ranked matchmaking, later chapters and an Appstore release:** not necessary for this prototype's submission. Describe the implemented local/LAN guest multiplayer and story-only exercise bonuses accurately.
- **Physical Fire TV:** useful additional compatibility testing, but not required by the FAQ. Physical camera/form validation still improves the credibility of our central feature.

Relevant evidence: [remote/graphics checks](../artifacts/remote-controls-test-report.md), [multiplayer checks](../artifacts/multiplayer-tutorial-test-report.md), [training checks](../artifacts/training-test-report.md), [asset notices](../THIRD_PARTY.md), [demo plan](DEMO.md).

The [camera streaming audit](../artifacts/camera-stream-audit.md) preserves the original failure observations and links to implemented regression checks. Phone testing is treated complete at Rahul's instruction. No phone model, rep-accuracy percentage, measured motion-to-display latency or physical Fire TV benchmark was supplied; those values are not invented.

Submission resources: [final links and copy-ready corrections](SUBMISSION_FINAL.md), [written draft and historical recording script](SUBMISSION_PREP.md), [product feedback](PRODUCT_FEEDBACK.md), [video verification](../artifacts/EarnedValor-Video-Verification.json). Current official rules and FAQ were rechecked on 23 October 2026.

Historical 13 October evidence: [23 additional edge cases](../artifacts/edge-test-report.md) brought the earlier suite to 112 tests. The current snapshot has 128 tests plus 10 browser checks; use the current audit above for remaining actions.
