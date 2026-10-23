# Earned Valor — additional Devpost fields

Updated 23 October 2026 from the implemented project, test reports and [official rules](https://amazonappdev2026.devpost.com/rules). The [public project](https://devpost.com/software/earned-valor) is associated with the hackathon, but its private feedback and track fields are not visible while signed out. These are copy-ready answers for the entrant to review against the saved form. The repository is private; no AWS/Kiro integration or qualifying additional public contribution is documented. Phone testing is treated complete at Rahul's instruction.

## AWS Builder Mini Challenge

**Selection:** No.

**AWS services description:** leave blank when No is selected. If the form still requires an answer, use:

> Not applicable. Earned Valor is entered in the Fire TV track. This prototype uses a local Node.js server and does not incorporate AWS services or Kiro Crew.

## Open Source Mini Challenge

**Selection:** No.

Leave the contribution URL, mini-challenge repository URL, GitHub username and contribution description blank when No is selected. Using open-source dependencies does not by itself establish a qualifying contribution. The primary project repository remains https://github.com/dazai2001-cmd/Amazon-hackathon.

## Optional feature requests

**Priority: Important.** A maintained Fire TV reference project for a TV app paired with a phone camera controller. It should include remote-only navigation and text entry, secure camera onboarding, pairing/reconnection, tracking-loss handling and Android TV emulator instructions. These pieces were central to Earned Valor and needed custom integration across the phone, TV interface and server. A complete example would reduce setup time and help developers build reliable fitness and movement games.

**Priority: Nice-to-have.** A companion test harness with recorded pose input, network interruption cases and remote-button sequences. This would help developers distinguish problems in camera inference, transport, gameplay and TV focus handling before involving human players.

## Optional friction log URL

https://github.com/dazai2001-cmd/Amazon-hackathon/blob/main/docs/FRICTION_LOG.md

The log contains reproduction steps, expected/observed behavior, severity, fixes or containment, actionable suggestions and evidence links. Reviewers need access to the private repository.

## Optional project testing link

There is no public playable deployment. Leave this field blank for now. If the form accepts a link to testing instructions, use:

https://github.com/dazai2001-cmd/Amazon-hackathon/blob/main/docs/DEMO.md

The repository README contains the setup, native APK build and emulator instructions. Localhost addresses are for the evaluator's own setup, rather than externally hosted demo links.

## Feedback 1 — tools, APIs and SDKs used

- Android SDK, Java, Gradle and Android WebView: package the TV application, support remote navigation and run the native APK in an Android TV emulator.
- React, React DOM, TypeScript and Vite: build the menus, dialogue, trainer, pairing interface, tutorials and clan lobby, with shared typed game logic.
- Three.js/WebGL: render the courtyard, first-person camera, characters, sword and shield.
- MediaPipe Tasks Vision/Pose Landmarker: estimate body landmarks locally on the Android phone. Application calibration and movement rules convert those landmarks into controls and exercise measurements.
- Node.js, ws and selfsigned: host the local HTTP/HTTPS interfaces, relay movement over WebSockets and run server-owned multiplayer health and clan scoring.
- node-qrcode, Lucide React and Fontsource Manrope: provide pairing QR codes, interface icons and self-hosted typography.
- tsx and Node's test runner: run the TypeScript server and automated tests.
- Playwright: automate browser journeys for remote navigation, camera lifecycle, rendering, profiles and pairing. GitHub Actions automates the test/build/browser and native APK checks.
- Kokoro-82M, kokoro-onnx and Python: generate prerecorded story and trainer voices during development. The running app plays the resulting audio files.
- FFmpeg and Python/Pillow: assemble the native emulator recording, logged synthetic skeleton, offline narration, original music and captions into the demonstration video.
- OpenAI Codex and its built-in image generation tool: assist with development, debugging, tests, documentation and original character, equipment and environment artwork.

## Feedback 2 — what worked well

Android/Java/Gradle/WebView provided a working native wrapper for the existing web interface. Emulator checks verified remote controls and Full HD rendering. React/React DOM supported the shared menus and state-driven story, trainer and lobby flows. Three.js supported a common 3D view across exploration and duels.

MediaPipe recorded-input checks worked with both GPU and CPU inference and let us transmit movement data without sending camera video. Node.js/ws supported real two-client tests with shared health and results; selfsigned enabled the local development HTTPS endpoint. TypeScript, Vite, tsx and Node's test runner supported type checking, production builds and 128 passing tests.

Kokoro produced reusable scripted voices with corresponding captions. QR codes, labelled Lucide icons and bundled Manrope fonts supported setup and navigation. Codex and image generation helped iterate on implementation, test coverage, submission material and the medieval visual direction.

## Feedback 3 — what needs work

For the Android/WebView and React route, remote focus, text entry, Back handling and modal isolation needed explicit application logic. Physical Fire TV performance still needs profiling. Three.js graphics quality and animation require further asset and performance work.

MediaPipe integration depends on framing, visible joints and calibrated exercise views. Estimated depth is not precise weapon motion capture. Two fault-injection checks found application defects in runtime inference recovery and old-camera cleanup; both are now fixed and covered by regression checks. We have not attributed them to an SDK defect.

Node.js/ws active sessions and wars live in server memory; clan records and completed results persist on disk. Account-backed membership and internet matchmaking need further implementation. selfsigned certificates add wireless camera-onboarding friction. Synthetic software tests do not establish human exercise accuracy or live latency. Vite completes the build with Lucide module-directive warnings. Kokoro dialogue is prerecorded, so new lines need regeneration and audio review. AI-generated code and artwork still need inspection, testing and integration. QR pairing does not remove the separate camera permission/setup step, and typography/icons need viewing-distance checks.

## Feedback 4 — onboarding

The Android route required Java, Gradle, SDK/platform tools and an Android TV emulator image, followed by APK installation and local server configuration. Project scripts now reproduce those steps. My Amazon developer account and identity verification are complete; I have not evaluated Appstore publishing.

React, React DOM, TypeScript, Vite, Three.js and the supporting npm libraries were set up through the project's dependency installation and build process. MediaPipe additionally required matching model/WASM assets, camera permission and a secure context. USB localhost simplified the local camera setup; wireless camera access requires HTTPS.

Node.js/ws setup involved starting the server and configuring pairing and test connections; selfsigned supplies development certificates. tsx and Node's runner execute the test suite. Kokoro used local Python/model tooling to create audio assets. Codex and image generation were used iteratively with repository inspection and verification.

## Feedback 5 — reuse decision

**Suggested answer, subject to the entrant's own opinion:**

Yes. I would use the Android/WebView route and React/Three.js again for a TV prototype that combines menus and 3D gameplay. MediaPipe is useful for movement controls when calibration, confidence checks and tracking loss are handled carefully. Node.js/ws and the TypeScript/Vite/test stack made the prototype reproducible and testable. I would reuse Kokoro for scripted voices and the supporting interface libraries for setup and navigation. I would also use Codex and image generation again while reviewing and testing their outputs. Before a broader release, I would add human playtesting, physical-device profiling and durable multiplayer infrastructure.

## AI tools disclosure

OpenAI Codex assisted with brainstorming, architecture, coding, debugging, tests and documentation. Codex's built-in image generation tool created original character, equipment and environment artwork. MediaPipe Pose Landmarker supplies the phone's runtime computer vision. Kokoro-82M through kokoro-onnx generated prerecorded dialogue and trainer cues. Rep counting, combat rules and multiplayer scoring use application logic; instructor speech is scripted rather than a runtime conversational AI.

The uploaded demo also uses a Kokoro stock synthetic narrator. Its skeleton and both multiplayer controllers are scripted pose inputs, labelled throughout, rather than a live camera or human multiplayer recording. FFmpeg combines the native footage, skeleton overlay, original project music and captions.

## Personal declarations and survey

- Age, eligible jurisdiction and employment/conflict declarations must be confirmed by the entrant for themself and any teammates. Do not check them based on software status.
- Learning-level dropdown: select the actual option closest to **Some learning**, confirmed by Rahul on 13 October. The provided screenshots do not show the dropdown's option labels.
- Career AI value: **Yes**, confirmed by Rahul on 13 October as useful career skills.
