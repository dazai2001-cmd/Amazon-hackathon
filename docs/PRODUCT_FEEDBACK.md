# Earned Valor — product feedback draft for review

Updated 23 October 2026 from implementation and test evidence. The public Devpost project is associated with the hackathon, but saved private feedback cannot be verified from its public page. Use these answers to check the submitted form. Phone testing is treated complete at Rahul's instruction; device-specific measurements and personal reuse decisions must reflect his actual experience.

The five form answers, optional challenge selections, feature requests and AI disclosure are collected in [DEVPOST_ADDITIONAL_FIELDS.md](DEVPOST_ADDITIONAL_FIELDS.md). The optional URL field can point to [FRICTION_LOG.md](FRICTION_LOG.md), which contains reproduction steps and supporting evidence.

The [official submission requirements](https://amazonappdev2026.devpost.com/rules) ask for tools used and their purpose, successes, limitations, onboarding experience and whether the entrant would use them again. Dependencies and asset provenance are recorded in package-lock.json and THIRD_PARTY.md.

## Fire TV application route: Android SDK, Java, Gradle and WebView

**Use:** packaged the TV interface and 3D game into a Java WebView APK, mapped the TV remote to the focused interface and tested on the Android TV emulator. The Fire TV track allows this implementation route; the app does not call an Amazon-specific runtime SDK.

**Worked well:** the native APK built, installed and ran. Emulator checks exercised D-pad, Select, Back and Play/Pause. Full HD verification measured a 1920 × 1080 drawing buffer. The same interface could be iterated in the browser before native checks.

**Needs work / project friction:** remote focus, text entry and Back handling needed a deliberate application layer. Our fixes routed key events to the focused element and added a D-pad keyboard. These were implementation issues, not demonstrated Android or Fire TV SDK defects. The 3D content still needs physical Fire TV profiling.

**Onboarding:** the project needed a Java/Gradle toolchain, SDK platform and emulator image, then install/launch and server configuration. Scripts now make this route reproducible. Rahul has since reported identity verification completed on the Amazon developer portal. His account-onboarding experience and ratings still need to be added in his own words. Appstore publishing has not been evaluated.

**Suggested reuse answer:** Yes, for rapid TV prototypes that reuse a web interface, provided remote navigation and hardware performance are treated as core work. Review this answer using your account setup experience and phone rehearsal.

## MediaPipe Tasks Vision and Pose Landmarker

**Use:** phone-local inference of image and estimated world landmarks. Lite/Full models and GPU/CPU delegates support the camera controller. Original filtering and game/calibration logic convert those points into weapons, bounded body movement and exercise measurements.

**Worked well:** recorded-input checks passed on GPU and CPU. The application can exchange landmarks without transmitting camera video. Model assets are bundled and pinned for reproducible setup.

**Needs work / limitations:** framing and joint visibility directly affect the game. Estimated monocular depth is not a precise physical sword measurement. Exercise coaching needs a calibrated side view and separate visibility/range/timing rules; pose output alone cannot certify form. Actual phone inference speed, exercise accuracy and full camera-to-display latency still need measurement.

Separate fault-injection checks also found application integration defects in runtime inference recovery and camera-session cleanup. Those fixes were implemented on 14 October and are covered by regular and browser regressions; they are documented in [the camera audit](../artifacts/camera-stream-audit.md), rather than attributed to a demonstrated MediaPipe defect.

**Onboarding:** prepare the model and WASM assets, obtain camera permission in a secure context, choose the delegate and feed video frames into the task. USB localhost is a useful development route; Wi-Fi requires HTTPS. First-load camera/model setup needs a clear user guide.

**Suggested reuse answer:** Yes, for camera movement prototypes with explicit confidence checks, dropout handling and human validation.

## Three.js and its model loader

**Use:** the courtyard, first-person camera, sword/shield placement, procedural character parts and temporary animated opponent.

**Worked well:** the native renderer reached a verified Full HD buffer and the scene runs in both browser and emulator. Reusable geometry and model loading let combat, exploration and multiplayer use a common view.

**Needs work / limitations:** visual fidelity and device performance depend on our asset budget, rigging, animation and renderer settings. The opponent now uses an original lightweight articulated model. Projected sword-tip hit checks are application logic; they are not full physical weapon contact. Physical Fire TV profiling remains outstanding.

**Onboarding:** begin with the scene/camera/renderer, load model assets and connect the simulation snapshots. The project separately handles drawing-buffer density, resize and a 720p performance option.

**Suggested reuse answer:** Yes, for an accessible web-based 3D prototype, with an explicit TV performance budget.

## React and React DOM

**Use:** main menu, story dialogue, training hall, pairing, tutorials, clan lobby, settings and portal-based remote text entry.

**Worked well:** a shared component layer served desktop iteration and the native WebView. State-driven UI could express calibration, training and multiplayer transitions with captions and controls.

**Needs work / project friction:** remote navigation needs deliberate focus scopes and inert modal backgrounds. Rapidly closing one text editor and selecting the next field exposed an application timing issue, resolved with synchronous close/focus restoration. Saved data and interrupted connections also need validation at their boundaries.

**Onboarding:** the interface is built with TypeScript components and hooks. The native shell still has to deliver remote events to the focused DOM element; the framework does not design that interaction for the application.

**Suggested reuse answer:** Yes, for TV interfaces when focus and input behavior are verified with the remote.

## Node.js, ws and selfsigned

**Use:** local HTTP/HTTPS hosting, temporary paired device rooms, WebSocket pose relay, authoritative human combat and clan scoring. selfsigned supplies the local development HTTPS certificate.

**Worked well:** real two-client relay tests verify shared health and results. Malformed messages, device replacement, excessive traffic and oversized packets are handled without crashing the other participant's room. The local/LAN route supports the laptop-and-monitor demo.

**Needs work / limitations:** active rooms and wars remain in server memory with expiry and reconnection behavior; clan names, members and completed results now persist on disk. Hosted matchmaking and account-backed membership remain additional product work. A development HTTPS certificate adds Wi-Fi setup friction; USB localhost is an optional way to simplify local camera setup. These are deployment/design limitations, not evidence of a ws defect.

**Onboarding:** start the server, pair the phone, join the war with its separate invite and send bounded control packets. The project supplies scripts and documented local ports. Tests need loopback network access.

**Suggested reuse answer:** Yes, for a small real-time prototype; add durable state and appropriate deployment infrastructure when expanding beyond the local demo.

## TypeScript, Vite, tsx and Node's test runner

**Use:** typed shared protocols and simulations, browser builds, server execution and automated tests.

**Worked well:** the production build and type checking pass. The suite has 128 passing tests, including real relay integration and deterministic training/combat interruption cases. Shared logic can be exercised independently of the 3D view.

**Needs work / limitations:** automated synthetic cases do not establish human exercise accuracy or hardware latency. The build emits Lucide module-directive warnings; the production build completes. Recorded and live device checks remain separate evidence.

**Onboarding:** `npm install`, prepare the pinned vision assets, then run the documented build/server/test commands. Android SDK and emulator setup are separate steps.

**Suggested reuse answer:** Yes, because type checking and fast simulation tests helped catch errors during iteration.

## Kokoro-82M and kokoro-onnx

The same local stock-voice tooling also supplies the clearly synthetic narration for the uploaded native-emulator demonstration.

**Use:** build-time generation of prerecorded story dialogue and trainer/counting cues using stock synthetic voice presets. The running game plays audio assets and does not call a speech model or language model.

**Worked well:** the repository includes 133 voice files, and catalogue/asset tests confirm each scripted line and training cue has its expected audio. This supports repeatable voice guidance alongside captions.

**Needs work / limitations:** fixed recordings support scripted lines and visible-form corrections. New dialogue needs regeneration, and voice quality, timing and mix still benefit from listening and rehearsal. This is not open-ended conversational coaching.

**Onboarding:** the local model and build-time Python tooling produce files that are then included in the web assets. License notices and cast presets are documented. Runtime setup does not download the speech model.

**Suggested reuse answer:** Yes, for licensed, scripted prototype dialogue; review voice quality during the final recording.

## Browser verification, CI and video preparation

**Use:** Playwright runs 10 browser checks covering navigation, pairing, camera lifecycle, profiles and rendering. GitHub Actions runs software/browser checks and an Android APK build; [the final source verification passed](https://github.com/dazai2001-cmd/Amazon-hackathon/actions/runs/39903798362). FFmpeg and Python/Pillow prepare the narrated demo and visualize its recorded synthetic pose stream.

**Worked well:** browser checks reproduced camera replacement and cancellation behavior in a real browser. The final video exports as a 143.961-second 1080p H.264/AAC file with captions and original project music. Signed-out YouTube playback and the Devpost embed work.

**Needs work:** automated and synthetic inputs cannot quantify human exercise accuracy or physical TV performance. Emulator WebView updates can interrupt recording takes; the affected take was repeated after its update. The uploaded video's Unlisted setting should be changed to Public for the final requirement check.

**Onboarding:** install Playwright's browser on other machines, run the supplied verification commands, and configure the Android toolchain for the APK job. Video preparation uses installed local tools and stock offline speech assets, with no runtime speech dependency in the game.

**Suggested reuse:** Yes, for reproducible browser regressions, automated build checks and clear demonstrations, while preserving separate real-device validation.

## Supporting interface libraries

| Component | Purpose and observed result | Onboarding, limitation and proposed reuse |
| --- | --- | --- |
| node-qrcode | Renders the phone pairing QR alongside a readable code. | Ordinary npm dependency. Camera setup remains a separate phone step; manually entering the code is available. Suggested reuse: Yes. |
| Lucide React | Supplies interface icons alongside labels. | Imported React components. The build reports module-directive warnings but completes; icons alone do not explain remote actions. Suggested reuse: Yes, with labels. |
| Fontsource Manrope | Self-hosted interface font assets. | Bundled through npm and served locally. Legibility still needs checks at television distance. Suggested reuse: Yes. |

Generated artwork, the temporary Sentinel model and original synthesized effects are content assets. Their origin and licenses are in THIRD_PARTY.md; they are not Amazon APIs. The unused KayKit fallback model is retained in the source assets and is not the current runtime opponent.

## Suggested Amazon developer-experience feature request

**Request:** a complete reference project for a TV app paired with a phone-local pose controller, including remote-only text entry, secure camera onboarding, temporary room recovery and emulator recording instructions.

**Why it matters:** these pieces bridge a TV navigation interface and a hands-free movement game. Our prototype needed custom glue for each, and their interactions produced more friction than a standalone browser demo.

**Priority:** Important for this project. This is a request based on our workflow, not a claim that a documented Amazon feature malfunctioned.

## Entrant review still needed

Add your completed Amazon account/identity onboarding experience; actual Android phone framing, model startup and exercise results after rehearsal; any measured end-to-end latency; and your own decision on which tools you would use again. Both camera fixes are now implemented and covered by regression checks; retain the real-phone rehearsal results as separate evidence. Keep physical Fire TV claims limited to tests actually performed. Submit the reviewed feedback as part of the Devpost entry.
