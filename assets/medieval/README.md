# Medieval first chapter assets

Asset sources and maintenance commands for Earned Valor's Fire TV game.

## Original artwork

The built-in `image_gen.imagegen` tool produced 12 PNG assets. The exact final prompts are recorded in `public/assets/medieval/prompts.json`; file sizes, dimensions, and SHA-256 hashes are in `public/assets/medieval/manifest.json`.

- Three transparent full-body characters: the beginner squire, veteran instructor, and first rival. Each is 1024 × 1536.
- Three environment backdrops: training courtyard, tournament arena, and village blacksmith. Each is 1672 × 941.
- Six transparent inventory icons: iron sword, wooden shield, gambeson, coins, steel sword, and heater shield. Each is 1254 × 1254.

Art direction: grounded medieval realism, practical equipment, weathered iron and leather, muted cloth, believable adult proportions. The artwork uses fictional characters. These PNGs are dialogue, scene, and inventory assets; they do not contain rigs, 3D geometry, or combat animations.

Open the gallery at `http://localhost:8787/medieval-assets.html` after `npm run build` with the Earned Valor server running. It previews characters against all three scenes and links every full-resolution image. The images are served locally without third-party image hosts.

## Sourced 3D candidates

Original models are staged in `assets/medieval/models`, with a copy of Sentinel under `public/assets/medieval/models`. These are unused reference/fallback assets. The runtime cast uses original procedural figures from `src/lib/storyCharacters.ts` and `src/lib/maraFigure.ts`. Neither reference model reproduces the generated character illustrations.

### AutoSprite T1 Sentinel

- Creator: AutoSprite; AI-generated on the creator's own account.
- [Official model page](https://www.autosprite.io/free-3d-models/t1-sentinel).
- [Official download](https://pub-63ab27389d044634a73e89c1a0c6d4a6.r2.dev/free-library/3d-models/t1-sentinel/t1-sentinel.glb).
- [Creator's license page](https://www.autosprite.io/free/license): CC0 1.0, permitted for game/app use and modification. Source notes are preserved in `licenses/AutoSprite-source.md`.
- Saved as `models/sentinel.glb`; 24,319,564 bytes; one skinned mesh, 22 joints, 149,880 triangles, one embedded texture image.
- Actual downloaded file contains seven clips: `idle`, `walk_loop`, `death`, `hit_chest`, `sword_attack`, `sword_block`, `sword_idle`. The source page advertises two clips in its lightweight preview; the saved full model contains more.
- This model was evaluated as an early opponent. It is not loaded by the current renderer; adopting it later would require geometry/texture optimization and device performance checks.

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

Generated archives, screenshots and reports stay local under the ignored `artifacts/` directory. Runtime artwork, prompts, manifests and source/license records remain in the repository.
