# Medieval first chapter assets

Prepared for Rahul's Fire TV movement-controlled medieval game concept on 10 October 2026.

## Original artwork

The built-in `image_gen.imagegen` tool produced 12 PNG assets. The exact final prompts are recorded in `public/assets/medieval/prompts.json`; file sizes, dimensions, and SHA-256 hashes are in `public/assets/medieval/manifest.json`.

- Three transparent full-body characters: the beginner squire, veteran instructor, and first rival. Each is 1024 × 1536.
- Three environment backdrops: training courtyard, tournament arena, and village blacksmith. Each is 1672 × 941.
- Six transparent inventory icons: iron sword, wooden shield, gambeson, coins, steel sword, and heater shield. Each is 1254 × 1254.

Art direction: grounded medieval realism, practical equipment, weathered iron and leather, muted cloth, believable adult proportions. The artwork uses fictional characters. These PNGs are dialogue, scene, and inventory assets; they do not contain rigs, 3D geometry, or combat animations.

Open the gallery at `http://localhost:8787/medieval-assets.html` after `npm run build` with the Earned Valor server running. It previews characters against all three scenes and links every full-resolution image. The images are served locally without third-party image hosts.

## Sourced 3D candidates

Original models are staged in `assets/medieval/models`. A copy of Sentinel is now served from `public/assets/medieval/models/sentinel.glb` for the first-person chapter trial. KayKit remains an unused fallback. Neither model reproduces the generated character illustrations.

### AutoSprite T1 Sentinel

- Creator: AutoSprite; AI-generated on the creator's own account.
- [Official model page](https://www.autosprite.io/free-3d-models/t1-sentinel).
- [Official download](https://pub-63ab27389d044634a73e89c1a0c6d4a6.r2.dev/free-library/3d-models/t1-sentinel/t1-sentinel.glb).
- [Creator's license page](https://www.autosprite.io/free/license): CC0 1.0, permitted for game/app use and modification. Source notes are preserved in `licenses/AutoSprite-source.md`.
- Saved as `models/sentinel.glb`; 24,319,564 bytes; one skinned mesh, 22 joints, 149,880 triangles, one embedded texture image.
- Actual downloaded file contains seven clips: `idle`, `walk_loop`, `death`, `hit_chest`, `sword_attack`, `sword_block`, `sword_idle`. The source page advertises two clips in its lightweight preview; the saved full model contains more.
- The current chapter uses this model's sword idle, attack, block and chest-hit clips as a temporary Mara opponent. Playback has been checked in the desktop browser and Android TV emulator. Its geometry and texture sizes still need optimization and a physical Fire TV performance check before final adoption.

### KayKit Knight

- Creator: Kay Lousberg.
- [Official repository](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0), pinned revision `672074b73ba276876a19e8816ecdc5241817ab47`.
- CC0; unmodified license saved in `licenses/KayKit-CC0.txt`.
- Saved as `models/kaykit-knight.glb`; 3,659,532 bytes; 15 meshes, 41-joint skin, 6,952 triangles, one embedded texture image. A copy of the original `knight_texture.png` is also retained.
- 76 animation clips, including one-handed chop, diagonal and horizontal cuts, thrust, block, blocking, hit, death, idle, walking, and running.
- Lighter combat-development fallback. Its stylized proportions do not match the grounded raster art direction, so it should be treated as a prototype rather than the final visual choice.

## Verification and packaging

`node scripts/inspect-medieval-models.mjs` checks GLB headers, chunk bounds, embedded/external resources, skins, geometry counts, and animation metadata. Its output is saved in `model-inspection.json`.

`node scripts/catalog-medieval-assets.mjs` checks PNG file signatures and alpha channels and produces the artwork manifest. Corner pixels were additionally checked as fully transparent for all nine character/item assets.

`artifacts/medieval-artwork.zip` contains the generated artwork, gallery, manifest, and prompts. The third-party models stay in the local project; they are excluded from the artwork archive.

The chapter now has first-person combat, functional equipment tradeoffs, local saved progression and an abridged story flow. Live multiplayer, bodyweight detectors, final matching character rigs and physical Fire TV performance validation remain separate work. See `artifacts/first-person-test-report.md` for the prototype checks.
