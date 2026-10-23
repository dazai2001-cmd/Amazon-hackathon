# Third-party components

- MediaPipe Tasks Vision and Pose Landmarker: Google / Google AI Edge, Apache 2.0. [Source](https://github.com/google-ai-edge/mediapipe) and [web guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js).
- Lite pose model: [official model artifact](https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task). Used without modification.
- Manrope: Mikhail Sharanda and contributors, SIL Open Font License 1.1. Fonts are self-hosted through Fontsource; the full font license is included in public/licenses/Manrope-OFL.txt.
- React / React DOM: Meta and contributors, MIT. License included in public/licenses/React-MIT.txt.
- Lucide icons: Lucide contributors, ISC. License included in public/licenses/Lucide-ISC.txt.
- QRCode: node-qrcode contributors, MIT. License included in public/licenses/QRCode-MIT.txt.
- Three.js: mrdoob and contributors, MIT. [Official repository](https://github.com/mrdoob/three.js). License included in public/licenses/Three-MIT.txt. Used for the first-person courtyard and animated opponent.

Other dependencies retain their package licenses. npm package versions are locked in package-lock.json.

## Medieval artwork and model candidates

The 12 raster assets in public/assets/medieval were generated for this project using the built-in image generator. Their exact prompts and file manifest are included alongside the images. They are original project artwork, not downloaded artwork from a third-party game.

Two third-party 3D models are retained in assets/medieval/models as unused reference/fallback assets. The runtime courtyard cast now uses original procedural figures:

- KayKit Knight: Kay Lousberg, CC0. [Official repository](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0), revision 672074b73ba276876a19e8816ecdc5241817ab47. Unmodified license in assets/medieval/licenses/KayKit-CC0.txt.
- T1 Sentinel: AutoSprite, creator-published AI-generated asset under CC0. [Model page](https://www.autosprite.io/free-3d-models/t1-sentinel) and [license page](https://www.autosprite.io/free/license). Source notes in assets/medieval/licenses/AutoSprite-source.md and public/licenses/AutoSprite-source.md. Served as public/assets/medieval/models/sentinel.glb, with sword/shield attachments built by this project. Excluded from the separate generated-artwork archive.

See assets/medieval/README.md and model-inspection.json for model provenance, geometry, animation metadata, and remaining validation.

The Earned Valor crest and wordmark, legacy MoveRoom logo and SVG space illustration, arena graphics, and sound effects were created for this prototype; they do not use Amazon logos or third-party game artwork.

## Chapter voices, music and effects

- The 133 prerecorded chapter/training voice files (93 scripted lines, 15 earlier exercise cues and 25 active trainer/count cues) are synthetic stock voices generated locally with [Kokoro-82M v1.0](https://huggingface.co/hexgrad/Kokoro-82M), Apache 2.0, using [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx), MIT. Unmodified license texts are included in public/licenses/Kokoro-Apache-2.0.txt and public/licenses/Kokoro-ONNX-MIT.txt. The model and build-time Python dependencies remain under .local and are not downloaded by the running game.
- Cast presets: Alden `bm_george`, Mara `bf_emma`, Tomas `bm_lewis`, herald `bm_daniel`, remembered voice `bf_isabella`. These are model presets, not recordings of actors hired for this project or cloned voices of named people.
- The three music loops, three ambience loops and nine effects are original deterministic synthesis produced by scripts/generate-chapter-audio.py. No soundtrack or audio was copied from another game. The asset manifest records durations, cast and provenance at public/assets/medieval/audio/manifest.json.
- Alden and Tomas use original procedural figures with distinct faces, clothing and props. Mara and multiplayer opponents use the original articulated figure and combat clips in src/lib/maraFigure.ts; Sentinel is no longer loaded by the renderer. The generated portraits remain the visual direction for future bespoke character art.

## Local test fixtures

The optional test download script saves these fixtures under public/vision/testdata (ignored by Git). They are used for recorded-input validation and are not user camera recordings.

- pose.jpg: [MediaPipe's official asset](https://storage.googleapis.com/mediapipe-assets/pose.jpg), used by its [pose test](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/python/solutions/pose_test.py).
- pose_squats.mp4: [TensorFlow's test-data file](https://github.com/tensorflow/tfjs-models/blob/master/pose-detection/test_data/pose_squats.mp4). The [official test source](https://github.com/tensorflow/tfjs-models/blob/master/pose-detection/src/blazepose_tfjs/blazepose_test.ts) attributes the original recording to [Pexels, woman doing squats](https://www.pexels.com/video/woman-doing-squats-4838220/). That recording retains its original content license; TensorFlow's source-code license does not replace it.

## Submission video

The [uploaded demonstration](https://youtu.be/gmJccY-Ejcs) contains native Android TV emulator footage of this project. Its side panel visualizes the same synthetic landmarks supplied to the game; both multiplayer controllers are scripted. Training/rest are edited for length, and progression belongs to an isolated test profile. No external human-camera footage is used.

The narrator uses Kokoro's stock `af_heart` preset under the Kokoro licensing described above. Background music is this project's original `courtyard.mp3` synthesis. FFmpeg and Python/Pillow combine the footage, overlay and captions; their software is not incorporated as a runtime game service. Video labels and the submission description should preserve the distinction between synthetic input and live camera testing.

## Tracking upgrade

The official MediaPipe Full pose bundle is included alongside Lite. Both use the MediaPipe license already included under public/licenses. The preparation script downloads the pinned float16 version 1 bundles from Google's official model storage. [Model guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker).

The adaptive filter is an original TypeScript implementation of the 1 Euro algorithm described by Géry Casiez, Nicolas Roussel and Daniel Vogel (CHI 2012). [Paper and algorithm reference](https://gery.casiez.net/1euro/).
