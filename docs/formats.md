# File formats — Mario Kart DS / mkjs

Reference for extensions found in an MKDS ROM: their role, support in the **mkjs** engine (`src/formats/`), and the **`debug.html`** viewer.

This document is meant as context for agents and contributors: prefer the code paths listed here rather than reinventing parsers.

---

## Legend

| Column | Meaning |
|--------|---------|
| **mkjs parser** | Class / module in `src/formats/` exported via `bundle.js` (`src/mkjs.ts`) |
| **Game** | Used at runtime in mkjs (racing, menus, audio, etc.) |
| **debug.html** | Click file in ROM browser → preview |
| **ROM freq.** | File count with this extension in a reference retail ROM (`test/mkds.nds`, `.carc` archives recursively decompressed) |

**debug.html** preview modes:

- **3D** — WebGL canvas, orbital camera, adjustable FPS
- **2D** — 2D canvas, mouse-wheel zoom
- **Text** — text panel + optional hex dump
- **—** — no click preview (listed only)
- **Container** — not listed; contents exposed after automatic unpacking

---

## ROM layout

```
.nds (ndsFS)
└── /data/*.carc          ← LZ77 + NARC, main archive per domain
    └── /file.ext         ← Nitro resource or binary data
```

- **`ndsFS`** (`src/formats/ndsFS.ts`): cartridge NitroFS filesystem.
- **`.carc`**: **LZ77**-compressed file (mode `0x10`) containing a **NARC** archive.
- **`debug.html`**: recursively walks the ROM, decompresses `.carc` files, lists **all** inner files; `.carc` entries themselves are hidden from the list.

Useful root paths:

| Path | Contents |
|------|----------|
| `/data/Course/<name>.carc` | Course model, collision, map (`course_map.nkm`, `course_collision.kcl`, `course_model.nsbmd`, …) |
| `/data/Course/<name>Tex.carc` | Course textures (`course_model.nsbtx`, `_V` variants, etc.) |
| `/data/KartModelMenu/` | Karts, characters, menu textures |
| `/data/KartModelSub.carc` | Character models / animations |
| `/data/MainRace.carc` | Race object models (items, etc.) |
| `/data/MainEffect.carc` | Particles (`RaceEffect.spa`, …) |
| `/data/Main2D[_<lang>].carc` | 2D UI, NFTR fonts |
| `/data/Scene/` | Menu and race scenes (Lakitu, counters, …) |
| `/*.sdat` | Main audio archive (NitroFS root) |

---

## Containers and compression

### `.carc` — Nintendo compressed archive

| | |
|--|--|
| **Contents** | LZ77 blob; once decompressed → NARC archive |
| **mkjs parser** | `lz77.decompress` then `new narc(buf)` |
| **Game** | Everywhere (`IngameRes`, course loading, etc.) |
| **debug.html** | **Container** (transparent) |
| **ROM freq.** | ~286 |

### NARC (no file extension of its own)

| | |
|--|--|
| **Magic** | `NARC` @0 |
| **Sections** | `BTAF` (files), `BTNF` (names / tree), `GMIF` (data) |
| **mkjs parser** | `narc`, `narcGroup` — `src/formats/narc.ts` |
| **API** | `list()`, `getFile(path)`, `tryGetFile(path)` — paths like `/course_map.nkm` |

### LZ77

| | |
|--|--|
| **mkjs parser** | `lz77` — `src/formats/lz77.ts` |
| **Details** | 4-byte header: decompressed size `<< 8`; some games prefix `"LZ77"` (`lz77.maybeDecompress`) |

### `.nds`

| | |
|--|--|
| **mkjs parser** | `ndsFS` — entire ROM |

---

## Nitro 3D formats (models, textures, animations)

All use the common Nitro header (`nitro.readHeader` in `src/formats/nitro.ts`): 4-letter magic, section offsets, unless noted otherwise.

### `.nsbmd` — Nitro Model (3D model)

| | |
|--|--|
| **Magic** | Wrapper `BMD0` → `MDL0` section |
| **Contents** | Geometry (DS GPU display lists), materials, nodes, sometimes embedded TEX0 bank |
| **mkjs parser** | `nsbmd` → rendered via `nitroModel` |
| **Game** | Karts, props, items, courses |
| **debug.html** | **3D** — loads model; auto-finds neighbouring `.nsbtx`, `.nsbca`, `.nsbtp`, `.nsbta` (same folder / same name prefix) |
| **ROM freq.** | ~766 |
| **Key files** | `/course_model.nsbmd`, kart/character models, `MapObj` |

Model coordinates: often per-node scale (`head.scale`); world positions use fixed-point units (×4096 in other formats).

### `.nsbtx` — Nitro Texture Bank

| | |
|--|--|
| **Magic** | `BTX0` → `TEX0` |
| **Contents** | Shared blocks: texel data, palettes, per-texture/palette info (names, format, dimensions), 4×4 compressed textures |
| **Texel formats** | 1=A3I5, 2=2bpp pal, 3=4bpp pal, 4=8bpp pal, 5=tex4x4 compressed, 6=A5I3, 7=direct RGBA5 |
| **mkjs parser** | `nsbtx` — `readTexWithPal(texId, palId)` → `HTMLCanvasElement` |
| **Game** | 3D model textures |
| **debug.html** | **2D** — texture / palette selectors |
| **ROM freq.** | ~335 |
| **Key files** | `course_model.nsbtx`, `P_<char>.nsbtx`, character textures |

### `.tex` — Raw TEX0 block

| | |
|--|--|
| **Magic** | `TEX0` @0 (no `BTX0` wrapper) |
| **Contents** | Same as the TEX0 section inside `.nsbtx` |
| **mkjs parser** | `new nsbtx(buf, true)` — 2nd argument `tex0=true` |
| **Game** | Rare in retail ROM; common in modding / tools (NitroExporter, etc.) |
| **debug.html** | **2D** (same viewer as `.nsbtx`); also accepts `BTX0` |
| **ROM freq.** | 0 (retail) |

### `.nsbca` — Nitro Skeletal Animation

| | |
|--|--|
| **Magic** | `BCA0` → `JNT0` |
| **Contents** | Skeletal animation (translation / rotation / scale per bone per frame) |
| **mkjs parser** | `nsbca` + `nitroAnimator` |
| **Game** | Wheels, characters, animated props |
| **debug.html** | **3D** — with associated `.nsbmd`; animation selector, FPS |
| **ROM freq.** | ~136 |

### `.nsbtp` — Nitro Texture Pattern Animation

| | |
|--|--|
| **Magic** | `BTP0` → `PAT0` |
| **Contents** | Per-frame sequence of (texture name, palette name) pairs — texture swap on model |
| **mkjs parser** | `nsbtp` → `nitroModel.loadTexPAnim` |
| **Game** | Multi-frame objects (lights, signs, items) |
| **debug.html** | **3D** with neighbouring model |
| **ROM freq.** | ~91 |

### `.nsbta` — Nitro Texture SRT Animation

| | |
|--|--|
| **Magic** | `BTA0` → `SRT0` |
| **Contents** | UV matrix animation (scale, rotation, S/T translation) per material |
| **mkjs parser** | `nsbta` → `nitroModel.loadTexAnim` |
| **Game** | Scrolling water, animated UV details |
| **debug.html** | **3D** with neighbouring model |
| **ROM freq.** | ~50 |

### `.nsbma` — Nitro Material Animation

| | |
|--|--|
| **Magic** | `BMA0` (standard Nitro format) |
| **Contents** | Material parameter animation (color, alpha, etc.) |
| **mkjs parser** | **Not implemented** (no dedicated class) |
| **Game** | Referenced (e.g. water) but partially worked around in code |
| **debug.html** | **3D** — shows neighbouring `.nsbmd` **without** playing material anim (animation selectors hidden) |
| **ROM freq.** | ~29 |

### `.nsbva` — Visibility Animation

| | |
|--|--|
| **Contents** | Model part visibility animation |
| **mkjs parser** | **No** |
| **debug.html** | **—** |

---

## Nitro 2D formats (tiles, sprites, screens)

File header: **big-endian** 4-character magic (e.g. `RGCN` stored as read by code — convention matches NCGR).

### `.ncgr` — Nitro Character Graphics (tiles)

| | |
|--|--|
| **Magic** | `RGCN` → `RAHC` blocks (tiles), optional `SOPC` |
| **Contents** | Grid of 8×8 px tiles; 4 bpp (palette index) or 8 bpp |
| **mkjs parser** | `ncgr` — `src/formats/2d/ncgr.ts` |
| **Game** | UI, 2D backgrounds, sprite atlases |
| **debug.html** | **2D** — all tiles; neighbouring `.nclr` if found, else greyscale |
| **ROM freq.** | ~672 |

### `.nclr` — Nitro Color (palette)

| | |
|--|--|
| **Magic** | `RLCN` → `TTLP`, `PMCP` |
| **Contents** | One or more RGB5 palettes (16 bits/color, 0–31 per channel) |
| **mkjs parser** | `nclr` — `pltt.palettes` |
| **Game** | NCGR / NCER / NSCR coloring |
| **debug.html** | **2D** — color strips per palette |
| **ROM freq.** | ~434 |

### `.ncer` — Nitro Cell Resource (sprites)

| | |
|--|--|
| **Magic** | `RECN` → `KBEC` |
| **Contents** | OAM cells: NCGR tile mapping, position, size, flip |
| **mkjs parser** | `ncer` |
| **Game** | 2D sprites (icons, HUD, menu objects) |
| **debug.html** | **2D** — composited image; neighbour `.ncgr` / `.nclr` selection |
| **ROM freq.** | ~284 |

### `.nscr` — Nitro Screen (screen / background)

| | |
|--|--|
| **Magic** | `RCSN` → `NRCS` |
| **Contents** | Screen map: 10-bit tile index, 4-bit palette, 2-bit flip per cell |
| **mkjs parser** | `nscr` |
| **Game** | Menu screens, static backgrounds |
| **debug.html** | **2D** — rendered with neighbouring NCGR/NCLR |
| **ROM freq.** | ~470 |

### `.nftr` — Nitro Font

| | |
|--|--|
| **Magic** | `RTFN` (wrapper) + `CGLP`, `CWDH`, `CMAP` blocks |
| **Contents** | Bitmap glyphs, widths, Unicode table |
| **mkjs parser** | `nftr` — rendered via `TileFlattener` / UI |
| **Game** | `marioFont.NFTR`, `LC_Font_m.NFTR`, `LC_Font_s.NFTR` in `Main2D` |
| **debug.html** | **—** |
| **ROM freq.** | ~14 |

### `.nanr` — Nitro 2D Animation

| | |
|--|--|
| **Contents** | 2D cell animation (NCER sequences) |
| **mkjs parser** | **No** |
| **debug.html** | **—** |
| **ROM freq.** | ~5 |

---

## Course, collision, gameplay

### `.nkm` — Mario Kart Map (track data)

| | |
|--|--|
| **Magic** | `NKMD` @0; version `u16` @4 |
| **Contents** | 4-character typed sections; entry list per section |
| **mkjs parser** | `nkm` — `src/formats/nkm.ts` |
| **Game** | Full race logic |

**Main sections** (non-exhaustive):

| Section | Role |
|---------|------|
| `STAG` | Course metadata: ID, laps, fog, KCL collision colors |
| `OBJI` | Map objects: `ID` (→ `ObjDatabase`), position/angle/scale, `routeID`, settings |
| `PATH` | Route definitions (AI, moving objects): `routeID`, loop, point count |
| `POIT` | Points along a route: position, index, duration |
| `KTPS` | Starting grid (positions / angles) |
| `KTPJ` | Respawn points |
| `CPOI` / `CPAT` | Checkpoints and lap paths |
| `MEPA` / `MEPO` | Mission points |
| `IPOI` / `EPOI` | Item / enemy points |
| `AREA` | Zones (triggers) |
| `CAME` | Scripted cameras |
| `KTP2` / `KTPC` / `KTPM` | Start / mission variants |
| `IPAT` / `EPAT` | Item / enemy paths (same handler as `CPAT`) |

| | |
|--|--|
| **debug.html** | **Text** — `OBJI` section summary with `ObjDatabase` resolution |
| **ROM freq.** | ~124 |
| **Key file** | `/course_map.nkm` in each course `.carc` |

NKM positions: integers **÷ 4096** (20.12 fixed-point).

### `.kcl` — Nintendo Collision Layout

| | |
|--|--|
| **Contents** | Collision triangles + octree; surface type per triangle (`MKDS_COLTYPE`) |
| **mkjs parser** | `kcl` — MKDS mode (`mkwii=false`) |
| **Game** | Kart ↔ world physics |
| **debug.html** | **—** |
| **ROM freq.** | ~59 |
| **Key file** | `/course_collision.kcl` |

### `.spa` — Nitro Particle Archive

| | |
|--|--|
| **Magic** | ` APS` @0; text version (e.g. `12_1`) |
| **Contents** | List of **emitters** (physics params, billboard flags, color/opacity/texture anims) + embedded textures (` TPS` per texture) |
| **mkjs parser** | `spa` — `NitroEmitter` / `NitroParticle` for in-game rendering |
| **Game** | `RaceEffect.spa` (`MainEffect.carc`), mission effects, etc. |
| **debug.html** | **3D** — modes: single particle, all particles, filter by `textureId`; auto-loop |
| **ROM freq.** | ~3 |
| **Limitations** | Particle format partially reverse-engineered; format-5 (4×4) textures not decoded in SPA |

---

## Miscellaneous binary data (`.bin` and related)

### `.bin` — Generic binary

| | |
|--|--|
| **mkjs parser** | Case by case; no single magic |

**Named files recognized in mkjs / debug.html**:

| File | Parser | Contents |
|------|--------|----------|
| `kartoffsetdata.bin` | `kartoffsetdata` | 37 entries: tire name, front wheel size, wheel offsets ×4, character offsets |
| `kartphysicalparam.bin` | `kartphysicalparam` | Mass, acceleration, drift, collision radius, per-surface tables |
| Ghost replay | — | Magic `NKDG` — ghost replay data |

| | |
|--|--|
| **debug.html** | **Text** + hex (64 KiB max); auto-parse if name/magic known |
| **ROM freq.** | ~56 |

### `.txt`

| | |
|--|--|
| **Contents** | In retail ROM: almost exclusively empty `dummy.txt` (placeholders in localized archives) |
| **mkjs parser** | **No** |
| **debug.html** | **—** (support intentionally removed) |
| **ROM freq.** | ~66 |

Do not confuse with **`.tex`** (TEX0 textures).

---

## Audio (Nitro Sound)

### `.sdat` — Sound Data Archive

| | |
|--|--|
| **Magic** | `SDAT` |
| **Contents** | FAT tables: sequences, banks, wave archives, groups, players |
| **mkjs parser** | `sdat` — loads nested SSEQ, SSAR, SBNK, SWAR |
| **Game** | `nitroAudio`, `SSEQPlayer` |
| **debug.html** | **—** |
| **ROM freq.** | 1 (ROM root) |

### `.sseq` — Sequence

| Magic `SSEQ` | Nitro MIDI-like sequence; played via `SSEQPlayer` |

### `.ssar` — Sequence Archive

| Magic `SSAR` | Sequence archive |

### `.sbnk` — Sound Bank

| Magic `SBNK` | Instrument definitions |

### `.swar` — Wave Archive

| Magic `SWAR` | Sample container |

### `.swav` — Wave

| Magic `SWAV` | Individual PCM/ADPCM sample |

All parsed in mkjs; **no** preview in `debug.html`.

---

## UI, localization, banners (not parsed in mkjs)

Extensions present in retail ROM, **without** a parser in this repo:

| Extension | Likely role | ROM freq. |
|-----------|-------------|-----------|
| `.bmg` | **Nintendo Message** — localized strings (menus, dialogue) | ~92 |
| `.bncl` | Banner / icon — color block | ~398 |
| `.bnll` | Banner — language / layout block | ~237 |
| `.bnbl` | Banner — bitmap block | ~211 |
| `.kbd` | Keyboard data (name entry) | ~10 |
| `.kbdmap` | Keyboard mapping table | ~28 |
| `.prm` | Binary parameters (various uses) | ~8 |
| `.tbl` / `.mtbl` / `.ktbl` | Data tables | a few |
| `.lld` | Unknown | ~4 |
| `.rpt` / `.rtt` | Unknown (1 each) | 1 |
| `.dat` | Generic data | 1 |
| `.nbfc` / `.nbfp` | Specialized Nitro blocks | 1 each |
| `.mr` | Unknown | 1 |

---

## debug.html — detailed behavior

File: `debug.html` at repo root; loads `bundle.js`.

### ROM loading

- ROM via IndexedDB (`fileStore`) or local file.
- `readROMFile(path)`: walks intermediate `.carc` files, LZ77-decompresses, opens NARC.

### Automatic pairing (3D)

For a clicked `.nsbmd` or animation file:

- `findSibling` / `findFilesForBMD`: same logical directory, same filename prefix.
- Selectors: `btxSelect`, `bcaSelect`, `btpSelect`, `btaSelect`.

### Automatic pairing (2D)

- **NCGR**: looks for neighbouring `.nclr`.
- **NCER**: lists `.ncgr` / `.nclr` in the same folder.
- **NSCR**: same to compose the screen.

### SPA preview

- Minimal mock scene (`gameRes.RaceEffect` = loaded SPA).
- `NitroEmitter` / `NitroParticle` identical to the game.
- Target with identity `mat4` (particles attached to emitter).

---

## Implementation notes

### Fixed point 4096

Many formats store `position`, `velocity`, `angle` as **signed or unsigned integers ÷ 4096** (12.4 or 20.12 fixed-point depending on context): NKM, SPA, KCL, kart offsets.

### Nitro 3D header

Magic string + `numSections` + offsets → inner section (`MDL0`, `TEX0`, `JNT0`, …).

### DS textures

- Palettes: RGB5; index 0 often transparent (unless `pal0trans` flag).
- **tex4x4** (format 5): 4×4 block compression; supported in `nsbtx`, not in SPA particle textures.

### Map objects

`OBJI.ID` → constructor in `ObjDatabase` (`src/entities/objDatabase.ts`). IDs partially documented via `rom.object-ids.spec.ts` tests.

---

## mkjs parser index

| Extension | Module |
|-----------|--------|
| `.nsbmd` | `src/formats/nsbmd.ts` |
| `.nsbtx`, `.tex` | `src/formats/nsbtx.ts` |
| `.nsbca` | `src/formats/nsbca.ts` |
| `.nsbtp` | `src/formats/nsbtp.ts` |
| `.nsbta` | `src/formats/nsbta.ts` |
| `.ncgr` | `src/formats/2d/ncgr.ts` |
| `.nclr` | `src/formats/2d/nclr.ts` |
| `.ncer` | `src/formats/2d/ncer.ts` |
| `.nscr` | `src/formats/2d/nscr.ts` |
| `.nftr` | `src/formats/nftr.ts` |
| `.nkm` | `src/formats/nkm.ts` |
| `.kcl` | `src/formats/kcl.ts` |
| `.spa` | `src/formats/spa.ts` |
| `.sdat` / `.sseq` / `.ssar` / `.sbnk` / `.swar` / `.swav` | `src/formats/sdat.ts` and audio modules |
| `.carc` | `lz77` + `narc` |
| ROM | `ndsFS` |
| `kartoffsetdata.bin` | `src/formats/kartoffsetdata.ts` |
| `kartphysicalparam.bin` | `src/formats/kartphysicalparam.ts` |

---

## External references

- [Nitro Files — VG Resource Wiki](https://wiki.vg-resource.com/Nitro_Files)
- [nsbmd_docs (scurest)](https://github.com/scurest/nsbmd_docs)
- [apicula FILETYPES](https://github.com/scurest/apicula/wiki/FILETYPES)
- [GBATEK — Nintendo DS textures](https://problemkaputt.de/gbatek.htm) (GPU texel formats)

---

*Last updated: aligned with `debug.html` and `src/formats/` in the mkjs repo. ROM frequencies from a recursive scan of `test/mkds.nds`.*
