# Alisa-Spiel — Game Design Document

A complete reference for the game's design, mechanics, and architecture.
Update this file whenever a feature is added or changed.

## Project

- **User:** Alysa (9 years old, daughter of Ariel) — German-speaking, building this with Claude.
- **Path:** `C:\Users\ariee\work\alisa-spiel`
- **GitHub:** https://github.com/arieel-ost/alisa-spiel (public)
- **Live:** https://alisa-spiel.vercel.app (Vercel team `artware-studio`, auto-deploy on push to `main`)
- **Stack:** React 19 + Vite 8 + pnpm + plain CSS (no TypeScript).

## Working Rules

- **Always reply in German**, kid-friendly and encouraging.
- All UI text in German.
- Stay strictly inside the project folder; no system-level changes.
- Code change workflow: edit → `pnpm build` → `git add -A && git commit && git push` → Vercel auto-deploys (~1 min).
- **Levels 1–5 are hand-crafted** and must stay that way. Don't replace them with the procedural generator.

## File Layout

```
src/
  App.jsx           Home screen with character picker
  App.css           Home-screen styles
  Game.jsx          Main game (~1600 lines)
  Game.css          Game styles
  levels.js         Levels 1-5 hand-crafted, 6-100 generated
  audio.js          Chiptune synth (Web Audio API)
  index.css         Global styles, pixel fonts
  main.jsx
index.html          Loads Press Start 2P + Silkscreen fonts
CLAUDE.md           Project pointers for Claude
game-design.md      THIS FILE
README.md           Public-facing readme
```

## Characters (App.jsx `CHARACTERS`)

🐈 Katze · 🐕 Hund · 🐇 Hase · 🐢 Schildkröte · 🐅 Tiger · 🦄 Einhorn · 🦔 Igel · 🦘 Känguru · 🐘 Elefant · 🐎 Pferd · 🦒 Giraffe · 🐒 **Alisa** (monkey) · 🦜 **Niki** (farting parrot, marked `goofy: true`, emits 💨 cloud every ~2 s and occasional **PUPS!** floating text)

## Controls

### Keyboard

- **Arrows:** run left/right
- **↑ / Space:** jump (double-jump on edge re-press, with spin animation)
- **↓ in air:** ground slam (locks horizontal, breaks blocks from above)
- **X:** shoot (when fire/ice power active)
- **P:** refill wizard shield to 3 charges
- **9:** restart current level
- **A:** skip current level

### Touch (mobile)

- ◀ ▶ left pad
- 🧿 center pad — tap to refill wizard shield
- 🔥 ⬇️ ⬆️ right pad

## Movement Mechanics

- **Double jump:** edge-detected; `jumpsLeft = 2` (3 with feather).
- **Ground slam:** `SLAM_SPEED = 22`; locks horizontal movement; breaks ❓ blocks from above (item pops sideways with gravity, see Items below).
- **Lives:** start 5 ❤️; refill to 5 on level transition.
- **Death = level restart**, not Game Over (no `lost` status anymore).

## Items (in ❓ blocks; floating text on collect)

| Item | Effect |
|---|---|
| 💎 diamond | +3 points |
| ❤️ heart | +1 life |
| 🍄 mushroom | Super-jump for ~6 s |
| 🔥 fire | Shoot fireballs, 20 s |
| ❄️ ice | Shoot ice, 20 s |
| 🌈 rainbow | Invincible + kills enemies on touch, 8 s |
| 🛡️ shield | Blocks 1 hit |
| 🧿 wizardshield | 3 charges of wizard protection. Renders as **pink bubble sibling div** around player |
| 🪶 feather | **Glide forward** for 20 s — hold jump = slow descent + forward thrust |
| 👑 crown | +10 points |
| 🧲 magnet | Pulls stars + coins toward player, 15 s |
| 💣 bomb | Instantly kills all enemies + white-orange flash overlay |
| ⏰ clock | Freezes all enemies and projectiles, 8 s (cyan tint) |
| 💰 coinbag | +5 coins immediately |
| ⚡ lightning | 2× shoot speed + double-shot, 10 s |

Loose collectibles distributed in levels: 🪙 coins (+1) and ⭐ stars (+1).

## Enemies (with HP system)

| Enemy | HP | Behavior |
|---|---|---|
| 👾 monster | 1 | Walks back and forth |
| 🐛 bug | 1 | Slow ground crawler |
| 🦇 bat | 1 | Flies sideways + bobs vertically |
| 🧙 wizard | 1 | Stationary, shoots 🔮 bolts at player |
| 👻 ghost | 1 | Free-flying chaser. **Only spawns from level 10 onward** |
| 🐉 dragon | 1 | Flies + spits 🔥 horizontal fireballs |
| 🧟 zombie | 2 | Very slow shuffle |
| 💀 skeleton | 2 | Throws 🦴 bones with arc/gravity |
| 🦅 eagle | 1 | Flies sideways, swoops down when player passes underneath |
| 👹 ogre | 3 | Big and slow |
| 🦂 scorpion | 2 | Faster than bug |

### Damage Rules

- **Stomp** (jump on top): 1 damage
- **Ground slam:** 3 damage (one-shots most)
- **Player projectile** (fire/ice): 1 damage
- **Rainbow power:** instant kill regardless of HP
- Hit-flash white tint when damaged but not killed

### Elite Buff

In worlds 6+, 20% chance for any generated enemy to gain +1 HP (automatic variation).

## Worlds (10 × 10 levels)

1. **Wiese** (1–10) — Level 1 hand-crafted
2. **Wolken** (11–20) — Level 2 hand-crafted
3. **Berggipfel** (21–30) — Level 3 hand-crafted
4. **Dunkler Wald** (31–40) — Level 4 hand-crafted
5. **Drachenburg** (41–50) — Level 5 hand-crafted
6. **Eishöhle**
7. **Wüste** (scorpions)
8. **Tiefe Höhle** (skeletons)
9. **Weltraum** (eagles)
10. **Regenbogen-Land**

Additional world themes available for high levels: Vulkan, Schloss-Garten, Sumpf, Sternenmeer, Endkampf.

Levels 1–5 are hand-crafted (specific platform/enemy/star layouts that must not change). Levels 6–100 are procedurally generated via `seededRandom(level * 1009 + 31)`. Difficulty scales linearly with level: width, platform count, star count, coin count, block count, enemy count.

## Background Decoration

Each theme has a `decor` set used by the `Decor` and `BackgroundFlair` components in `Game.jsx`:

`meadow / clouds / mountains / forest / castle / snow / sand / cave / stars / rainbow / lava / swamp`

Background symbols (trees, clouds, stars, lava, etc.) drift in the sky; ground-level flair (plants, mushrooms, rocks) sits on the floor.

## Audio

- Chiptune synth in `audio.js` using Web Audio API (square/triangle/sine oscillators).
- 32-step melody in D-minor at ~135 BPM with bass + chord pads.
- 🔊 / 🔇 toggle in HUD. Starts muted because of browser autoplay policy.
- `playSfx()` helper exists with `jump / collect / hurt / powerup` sounds — not yet wired everywhere.

## Visual Style

- **Pixel fonts:** Press Start 2P (titles), Silkscreen (HUD).
- Player has a soft **shadow** that fades with jump height.
- **Animations:** idle bob, run squash/stretch, spin on second jump, slam trail, landing flash, floating `+1`-style score text on collect.
- Platforms use a hard **pixel-art** look (no gradients).
- Niki has a JS-driven wobble rotation + green glow.

## Mobile

- Touch buttons use Pointer Events (multi-touch capable).
- HUD is `position: fixed` at the top, horizontally scrollable when many power-ups are active.
- Viewport wrapper scales the 800×480 game via `transform: scale(var(--game-scale))` to fit the screen.
- **Landscape gate:** on mobile portrait, an overlay "Bitte dreh dein Handy" + "Bereit!" → 3-2-1 countdown → game starts.
- Fullscreen button tries `screen.orientation.lock('landscape')`.
- `<meta viewport>`: `user-scalable=no, viewport-fit=cover`.

## Memory Files

Located in `~/.claude/projects/C--Users-ariee-work-alisa-spiel/memory/`:

- `MEMORY.md` — index
- `alysa_user.md` — Alysa is the 9-year-old user
- `alisa_spiel_project.md` — project context, folder boundaries
- `feedback_german_tone.md` — always German, kid-friendly tone

## Tunable Constants (Game.jsx)

```
GRAVITY               0.7
MOVE_SPEED            4
JUMP_POWER            14
SUPER_JUMP_POWER      22
SLAM_SPEED            22
PLAYER_W              36
PLAYER_H              44
VIEW_W                800
VIEW_H                480
GROUND_Y              420
ENEMY_W               36
ENEMY_H               36
PROJECTILE_SIZE       24
PROJECTILE_SPEED      8
SHOOT_COOLDOWN        18 frames
SUPER_JUMP_DURATION   360 frames (~6 s)
POWER_DURATION        1200 frames (~20 s)
RAINBOW_DURATION      480 frames (~8 s)
FEATHER_DURATION      1200 frames (~20 s)
MAGNET_DURATION       900 frames (~15 s)
FREEZE_DURATION       480 frames (~8 s)
LIGHTNING_DURATION    600 frames (~10 s)
```

## Implementation Notes / Quirks

- **Block-break-from-above (slam):** items pop **sideways** out of the block with gravity rather than being auto-collected, so the player can grab them after.
- **Wizard shield bubble:** rendered as a sibling `<div className="bombshield-bubble">`, not a `::before` pseudo — earlier pseudo-element approach didn't render reliably.
- **Jump key behaviour:** edge-press triggers a jump; held while in the air with feather active = glide.
- **Touch buttons** must call `e.preventDefault()` so iOS doesn't fire a phantom click.
- **HMR caveat:** while editing in multiple steps, Vite occasionally hits a stale-state error on partial reload — full browser refresh fixes it.

## Adding New Features (workflow)

1. Edit code in `src/`.
2. Run `pnpm build` to verify.
3. `git add -A && git commit -m "..." && git push`.
4. Vercel auto-deploys in ~1 min.
5. Reply to Alysa briefly in German: what changed and how to test it.
6. **Update this file** if the change touches mechanics, items, enemies, controls, or worlds.
