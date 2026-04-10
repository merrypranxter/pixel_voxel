# pixel_voxel

> A curated, remixable database of pixel art and voxel art concepts, techniques, palettes, styles, and pipelines — designed for use in **shader art**, **AI generative art**, and **JavaScript tooling**.

---

## What Is This?

`pixel_voxel` is a structured knowledge database, not a code library. It captures:

- **Styles** — visual aesthetics (8-bit, ditherpunk, isometric voxel diorama, hybrid…)
- **Techniques** — how-to knowledge (Bayer dithering, hue-shift ramps, greedy meshing, SDF raymarching…)
- **Palettes** — curated color sets with hex values and ramp roles
- **Rendering / Shader blocks** — reusable GPU pass definitions (pixel grid lock, palette map, outline…)
- **Pipelines** — composable multi-step recipes (AI image → pixel art, voxel → sprite bake, SDF voxel shader…)
- *(future)* Motifs, composition rules, animation conventions, references

Every entry is a single YAML file. The format is designed to be human-readable, machine-parseable, and cross-referenceable via stable IDs.

---

## Repo Layout

```
pixel_voxel/
  db/
    _schema/
      tagsets.yaml          ← canonical tag axes + allowed values
      entry.schema.yaml     ← field-by-field schema spec
    entries/
      styles/               ← visual style entries (type: style)
      techniques/           ← technique entries (type: technique)
      palettes/             ← palette entries (type: palette)
      rendering_shader/     ← shader/GPU pass entries (type: shader)
      pipelines/            ← multi-step pipeline entries (type: pipeline)
      motifs_subjects/      ← motif/subject entries (type: motif)
      composition/          ← composition rule entries (type: composition)
      animation/            ← animation technique entries (type: animation)
      voxel_modeling/       ← voxel-specific modeling entries (type: voxel)
      references/           ← reference entries (type: reference)
    indices/
      entries.json          ← generated full index (run tools/build_index.js)
      tags.json             ← generated inverted tag index
  tools/
    build_index.js          ← index generator script (see below)
  README.md
```

---

## Entry Format

Every entry is one YAML file: `db/entries/<category>/<slug>.yaml`

### Minimal example

```yaml
id: pxv.style.ditherpunk.v1
type: style
name: Ditherpunk
summary: "High-contrast pixel aesthetic where dithering is the dominant texture."
tags:
  medium: [pixel]
  era: [8bit, modern_retro]
  mood: [brutal, nostalgic]
version: 1
created_at: "2026-04-10"
```

### Full field reference

See [`db/_schema/entry.schema.yaml`](db/_schema/entry.schema.yaml) for the complete schema.

Key fields:

| Field | Required | Description |
|---|---|---|
| `id` | ✓ | Globally unique. Format: `pxv.<type>.<slug>.v<n>` |
| `type` | ✓ | `style`, `technique`, `palette`, `pipeline`, `shader`, `motif`, `composition`, `animation`, `voxel`, `reference` |
| `name` | ✓ | Human display name |
| `summary` | ✓ | ≤200-char one-liner |
| `tags` | ✓ | Map of tag axes → values (see `tagsets.yaml`) |
| `description` | — | Long-form notes (multiline YAML `|` block) |
| `constraints.do` | — | Recommended practices |
| `constraints.avoid` | — | Anti-patterns |
| `parameters` | — | Tunable params (for techniques, shaders, pipelines) |
| `compat.works_with` | — | Entry IDs this pairs well with |
| `compat.requires` | — | Entry IDs that must be present |
| `outputs` | — | Reusable fragments: `prompt_fragment`, `shader_hint`, `code_snippet` |
| `steps` | — | Pipeline steps (pipeline entries only) |
| `colors` | — | Color list with hex values (palette entries only) |
| `provenance` | — | Sources, artists, URLs |
| `version` | ✓ | Integer. Increment on breaking changes. |
| `created_at` | ✓ | ISO date string `YYYY-MM-DD` |

---

## Naming Conventions

- **ID prefix**: always `pxv.`
- **ID format**: `pxv.<type>.<slug>.v<version>` — all lowercase, underscores for spaces
  - Examples: `pxv.style.ditherpunk.v1`, `pxv.palette.endesga_32.v1`, `pxv.pipeline.ai_to_pixel_shader.v1`
- **File name**: slug portion of the ID + `.yaml`
  - `pxv.style.ditherpunk.v1` → `db/entries/styles/ditherpunk.yaml`
- **Versioning**: IDs are **stable**. If a field change is breaking, bump `v<n>` and keep the old file.
- **One entry per file**. No multi-document YAML (`---` separators).

---

## Adding a New Entry

1. Pick the right category folder under `db/entries/`.
2. Create `<slug>.yaml` (slug = lowercase, underscores, no spaces).
3. Fill in all required fields (`id`, `type`, `name`, `summary`, `tags`, `version`, `created_at`).
4. Use only tag values defined in `db/_schema/tagsets.yaml`. To add a new tag value, add it to `tagsets.yaml` first.
5. Cross-reference related entries in `compat.works_with` using their full IDs.
6. Run `node tools/build_index.js --validate-only` to check your entry.
7. Commit. The JSON index will be regenerated on the next full `build_index.js` run.

### Entry template

```yaml
id: pxv.<type>.<slug>.v1
type: <type>
name: <Human Name>
aliases: []
summary: "<One sentence, ≤200 chars>"
description: |
  Longer notes here.
tags:
  medium: [pixel]         # required: pixel | voxel | hybrid
  era: [modern_retro]
  mood: [cozy]
constraints:
  do:
    - "Do this."
  avoid:
    - "Avoid this."
compat:
  works_with:
    - pxv.technique.bayer_4x4.v1
outputs:
  - kind: prompt_fragment
    value: "ai prompt fragment here"
provenance:
  sources:
    - kind: note
      value: "Curated by merrypranxter"
version: 1
created_at: "2026-04-10"
```

---

## Referencing Entries in Pipelines

Pipeline entries define ordered `steps`, each referencing another entry by its `id`:

```yaml
id: pxv.pipeline.my_pipeline.v1
type: pipeline
name: My Custom Pipeline
inputs:
  - kind: image
steps:
  - use: pxv.shader.pixelate_grid_lock.v1
    with:
      virtual_width: 320
      virtual_height: 180
  - use: pxv.shader.ordered_dither.v1
  - use: pxv.shader.palette_map_nearest.v1
  - use: pxv.shader.outline_sobel.v1
outputs:
  - kind: image
```

The `steps[].with` map overrides default parameter values for that step only.

---

## YAML → JSON Index Generation

The `tools/build_index.js` script scans all `db/entries/**/*.yaml` files, validates them,
and emits:

- `db/indices/entries.json` — full entry array with all fields
- `db/indices/tags.json` — inverted index: `{ axis: { value: [id, id, ...] } }`

### Setup

```bash
npm install js-yaml glob
```

### Usage

```bash
# Validate all entries (no file writes):
node tools/build_index.js --validate-only

# Build full index:
node tools/build_index.js

# Custom output path:
node tools/build_index.js --out db/indices/entries.json
```

### Using the JSON index in JavaScript

```js
import entries from './db/indices/entries.json' assert { type: 'json' };

// Find all pixel style entries
const pixelStyles = entries.entries.filter(
  e => e.type === 'style' && e.tags?.medium?.includes('pixel')
);

// Find all entries tagged mood: cozy
const cozy = entries.entries.filter(
  e => e.tags?.mood?.includes('cozy')
);

// Get a specific entry by ID
const ditherpunk = entries.entries.find(e => e.id === 'pxv.style.ditherpunk.v1');
```

### Using the tag index

```js
import tags from './db/indices/tags.json' assert { type: 'json' };

// All entries with era: 8bit
const eightBitIds = tags.tags.era?.['8bit'] ?? [];
```

---

## Current Entries (Starter Set)

| ID | Type | Name |
|---|---|---|
| `pxv.style.pixel_8bit.v1` | style | Classic 8-bit Pixel Art |
| `pxv.style.pixel_16bit.v1` | style | 16-bit / SNES-Era Pixel Art |
| `pxv.style.ditherpunk.v1` | style | Ditherpunk |
| `pxv.style.gameboy_dmg.v1` | style | Game Boy DMG Monochrome |
| `pxv.style.isometric_voxel.v1` | style | Isometric Voxel Diorama |
| `pxv.style.blocky_voxel.v1` | style | Blocky Minimal Voxel |
| `pxv.style.hybrid_voxelsprite.v1` | style | Hybrid Voxel-to-Sprite |
| `pxv.technique.bayer_4x4.v1` | technique | Bayer 4×4 Ordered Dithering |
| `pxv.technique.blue_noise_dither.v1` | technique | Blue-Noise Stochastic Dithering |
| `pxv.technique.manual_aa.v1` | technique | Manual Anti-Aliasing |
| `pxv.technique.palette_ramp_hueshift.v1` | technique | Palette Ramp with Hue Shifting |
| `pxv.technique.greedy_meshing.v1` | technique | Greedy Meshing |
| `pxv.technique.voxel_sdf_raymarch.v1` | technique | Voxel SDF Ray Marching |
| `pxv.palette.endesga_32.v1` | palette | ENDESGA 32 |
| `pxv.palette.apollo.v1` | palette | Apollo (Lospec) |
| `pxv.palette.gameboy_dmg_4.v1` | palette | Game Boy DMG 4-Shade |
| `pxv.shader.pixelate_grid_lock.v1` | shader | Stable Pixel Grid Lock |
| `pxv.shader.palette_map_nearest.v1` | shader | Nearest-Color Palette Mapping |
| `pxv.shader.ordered_dither.v1` | shader | Ordered Dither (Screen-Space) |
| `pxv.shader.outline_sobel.v1` | shader | Pixel-Art Outline (Sobel) |
| `pxv.pipeline.ai_to_pixel_shader.v1` | pipeline | AI Image → Pixel-Locked Shader Render |
| `pxv.pipeline.voxel_to_sprite_bake.v1` | pipeline | Voxel Model → Pixel Sprite Sheet Bake |
| `pxv.pipeline.sdf_voxel_render.v1` | pipeline | SDF Voxel Raymarch → Pixel-Art Shader Render |

---

## Philosophy

- **Canonical source is YAML** — human-editable, commentable, diffable.
- **JSON index is generated** — never edit it by hand.
- **Entries are cross-referenced by stable IDs** — not file paths.
- **Pipelines are composable** — mix and match any entries in `steps`.
- **Everything is remixable** — entries are meant to be referenced in shaders, AI prompts, JS tools, and generative art pipelines.

---

*Curated by merrypranxter.*
