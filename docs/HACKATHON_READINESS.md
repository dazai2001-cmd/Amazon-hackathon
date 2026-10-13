# Hackathon readiness — 13 October 2026

The Ashen Gate fits the Fire TV track and has a working, tested prototype. The submission is **not fully ready**: Rahul confirmed that Devpost registration is complete, the Amazon developer account is not created, and no demo video or submitted product feedback exists. Judge access is absent. Local submission and feedback drafts are now available for review.

Implementation audited: `3392b36fff6dad5b90a5fc0a1fb2e93cf1533793`. The earlier native remote/graphics checks used `2676823204ef9bc89e9f59794520776aca18b754`. Repository: [dazai2001-cmd/Amazon-hackathon](https://github.com/dazai2001-cmd/Amazon-hackathon).

Sources: [official rules](https://amazonappdev2026.devpost.com/rules), [official FAQ](https://amazonappdev2026.devpost.com/details/faqs), [submission and judging overview](https://amazonappdev2026.devpost.com/). The FAQ explicitly accepts an Android TV emulator. A physical Fire TV is not mandatory.

## Requirement checks

| Check | Status | Evidence or remaining action |
| --- | --- | --- |
| Fire TV theme | Meets | Fitness routines, computer vision, movement gaming, voice guidance and clan duels match the track. Every priority category need not be implemented. |
| Permitted implementation | Meets | Android/Fire OS WebView APK, React/TypeScript/Three.js, Android phone MediaPipe inference and local Node relay. No special Amazon runtime API is mandatory for this track. |
| Emulator demonstration route | Meets | The APK built and ran on Android TV 30 x86, with native D-pad/Select/Back/Play-Pause inputs. This is an accepted emulator according to the FAQ. |
| Working prototype | Tested, with limits | 112 automated tests passed; manual native and browser checks cover menus, story, 1080p, training setup and multiplayer. Human exercise accuracy and camera latency need demonstration on the phone. |
| Source, assets and setup | Present | Source, models, artwork, audio, pose models, package lock, Gradle wrapper, license notices and run instructions are tracked. Runtime dependencies can be prepared through npm installation. The APK can be rebuilt from source. |
| Judge access | **Not met** | Authenticated GitHub checks show a PRIVATE repository, only `dazai2001-cmd` as collaborator, and no pending invitations. The listed reviewers need access. |
| Project open-source license | Not required for the current private route | GitHub reports no project license. That does not block a private submission shared with judges. A public submission would need an open-source license. |
| Public demo video | **Not made** | Rahul confirmed this on 13 October. Follow the timed recording script in SUBMISSION_PREP.md, then upload the final video publicly to YouTube or Vimeo. |
| Product feedback | **Drafted locally; not submitted** | Rahul confirmed no feedback has been entered. PRODUCT_FEEDBACK.md now provides a draft grounded in implementation and test evidence; personal opinions and account/device experience need review. |
| Written description and track selection | External status unverified | README explains the product; the actual Devpost fields and final submission have not been inspected. Select Fire TV. |
| English | Meets for existing material | App text, dialogue, captions and repository documentation are English. Final video and submission text still need checking. |
| Work during the event | Evidence present | Recorded implementation commits are dated 12 October 2026. Generated-art provenance dates are within the event window. Explain these contributions in the submission. |
| Third-party rights | Documented | THIRD_PARTY.md and included notices cover MediaPipe, React, Three.js, fonts, icons, Kokoro and model assets. The creator currently identifies Sentinel as CC0. Entrant ownership and final video permissions remain personal confirmations. |
| Devpost registration | Confirmed by entrant | Rahul confirmed that Devpost registration is done. This does not confirm completion of the project submission form. |
| Amazon developer account | **Not created** | Rahul confirmed only Devpost is done. The Fire TV entry instructions require a developer account; complete that at developer.amazon.com/apps-and-games. |
| Entrant eligibility and representation | Unverified | Age/residence eligibility, conflicts/support restrictions and team representative if applicable remain personal confirmations. |

## Immediate submission work

1. Create the [Amazon developer account](https://developer.amazon.com/apps-and-games/) required by the Fire TV entry instructions. Devpost registration is already confirmed.
2. Rehearse and record a public English YouTube/Vimeo demo under three minutes using [the timed script and submission draft](SUBMISSION_PREP.md). Show the native emulator APK, actual phone camera movement, a controlled exercise with a correction/rejected rep, and shared multiplayer health/score. Label any preview opponent clearly. Remove private notifications and pairing credentials from footage.
3. Review [the product feedback draft](PRODUCT_FEEDBACK.md), add your actual account/device experience and opinions, and enter it into Devpost. Distinguish implementation fixes from SDK/platform faults.
4. Give the official reviewers access to the private repository: `chris-trag`, `knmeiss`, `giolaq`, `anishamalde`, `mosesroth`, `emersonsklar`, and Devpost's `testing@devpost.com` contact as directed by the event. Check accepted access; invitation expiry is seven days. Time invitations around submission and re-send expired invitations.
5. Complete the project description, Fire TV selection, applicable optional challenge fields and final Devpost submission. Confirm personal eligibility, rights and the public video URL. Keep judge access and reproducible setup available through judging.

Deadline: **24 October 2026 at 00:30 IST**, equivalent to **23 October at noon PDT**. Judging ends 20 November 2026.

## How we address the judging criteria

These are assessments of the current implementation, not guaranteed judge scores. The four areas are equally weighted in the rules.

| Area | Current evidence | Strongest improvement |
| --- | --- | --- |
| Technical implementation | Native remote handling, local pose inference, calibrated sword/shield movement, strict rep/set state machines, server-owned human duels and 112 passing tests. | Record real phone inputs and corrections. Show both participant screens changing together. |
| Design | Medieval main menu, voiced Chapter I, player guide, hands-free calibration, anytime training and remote text entry. | Rehearse one short, coherent journey. Avoid spending the video on setup or long dialogue. |
| Potential impact | Exercise practice creates bounded story progression; the TV is a shared screen and video stays on the phone. | Explain the intended household/player and show why they would return. Keep fitness claims within demonstrated behavior. |
| Quality of the idea | Camera-controlled sword/shield play and a medieval instructor connect exercise, story progression and cooperative clan competition. | Lead with the fitness-to-game loop and embodied controls. Show what vision adds to the experience. |

## Optional challenges and scope

- **AWS Builder:** not currently evidenced. No AWS integration or Kiro Crew use was found. This does not block Fire TV entry.
- **Open Source:** not currently evidenced. The game repository is private and no qualifying public contribution was identified. This does not block Fire TV entry.
- **Friction log:** optional, potentially useful for the event's judging bonus. Document actual steps, expected/observed behavior, severity, workaround and an actionable suggestion.
- **1080p:** implemented as the default and verified as an actual 1920×1080 drawing buffer. 720p is a saved performance option. The event does not list a resolution minimum.
- **Internet hosting, permanent clans, ranked matchmaking, later chapters and an Appstore release:** not necessary for this prototype's submission. Describe the implemented local/LAN guest multiplayer and story-only exercise bonuses accurately.
- **Physical Fire TV:** useful additional compatibility testing, but not required by the FAQ. Physical camera/form validation still improves the credibility of our central feature.

Relevant evidence: [remote/graphics checks](../artifacts/remote-controls-test-report.md), [multiplayer checks](../artifacts/multiplayer-tutorial-test-report.md), [training checks](../artifacts/training-test-report.md), [asset notices](../THIRD_PARTY.md), [demo plan](DEMO.md).

Submission preparation: [written draft and 2:45 recording script](SUBMISSION_PREP.md), [product feedback draft](PRODUCT_FEEDBACK.md). These files are preparation material, not a submitted entry or a recorded video.

13 October follow-up: [23 additional edge cases](../artifacts/edge-test-report.md) and their fixes raise the automated suite to 112 passing tests. This improves interruption handling, corrupted-save recovery and remote-visible feedback; the submission and real-device evidence gaps listed above remain.
