// Levels 1-5: original handcrafted layouts (Wiese, Wolken, Berggipfel, Dunkler Wald, Drachenburg)
// Levels 6-100: procedurally generated, themed in 10 worlds with rising difficulty.
//
// Items in Blöcken: 'diamond' 💎, 'heart' ❤️, 'mushroom' 🍄, 'fire' 🔥, 'ice' ❄️,
//                    'rainbow' 🌈, 'shield' 🛡️, 'wizardshield' 🧿, 'feather' 🪶, 'crown' 👑,
//                    'magnet' 🧲, 'bomb' 💣, 'clock' ⏰, 'coinbag' 💰, 'lightning' ⚡
// Feinde:
//   'monster' 👾, 'bug' 🐛, 'bat' 🦇, 'wizard' 🧙, 'ghost' 👻 (ab Lvl 10), 'dragon' 🐉

const HANDCRAFTED = [
  {
    name: 'Wiese',
    decor: 'meadow',
    bgColor: 'linear-gradient(180deg, #87ceeb 0%, #b8e6f5 70%, #c5e8a8 100%)',
    width: 1600,
    platforms: [
      { x: 200, y: 350, w: 120, h: 20 },
      { x: 400, y: 280, w: 120, h: 20 },
      { x: 600, y: 220, w: 100, h: 20 },
      { x: 800, y: 300, w: 140, h: 20 },
      { x: 1050, y: 240, w: 120, h: 20 },
      { x: 1300, y: 320, w: 120, h: 20 },
    ],
    stars: [
      { x: 230, y: 310 },
      { x: 440, y: 240 },
      { x: 640, y: 180 },
      { x: 850, y: 260 },
      { x: 1100, y: 200 },
      { x: 1340, y: 280 },
    ],
    blocks: [
      { item: 'diamond', x: 280, y: 240 },
      { item: 'fire', x: 460, y: 200 },
      { item: 'mushroom', x: 700, y: 200 },
      { item: 'shield', x: 900, y: 220 },
      { item: 'heart', x: 1170, y: 200 },
      { item: 'crown', x: 1280, y: 150 },
      { item: 'diamond', x: 1380, y: 250 },
    ],
    coins: [
      { x: 100, y: 380 }, { x: 140, y: 380 }, { x: 180, y: 380 },
      { x: 360, y: 240 }, { x: 530, y: 240 },
      { x: 740, y: 250 }, { x: 780, y: 250 },
      { x: 880, y: 380 }, { x: 920, y: 380 },
      { x: 1220, y: 250 },
      { x: 1450, y: 380 }, { x: 1490, y: 380 },
    ],
    enemies: [
      { type: 'monster', x: 500, y: 400, range: 80 },
      { type: 'bug', x: 950, y: 405, range: 60 },
      { type: 'monster', x: 1200, y: 400, range: 70 },
    ],
    goal: { x: 1500, y: 360 },
  },
  {
    name: 'Wolken',
    decor: 'clouds',
    bgColor: 'linear-gradient(180deg, #ffd6e7 0%, #fff6cc 70%, #c8f0ff 100%)',
    width: 1800,
    platforms: [
      { x: 180, y: 360, w: 100, h: 20 },
      { x: 360, y: 290, w: 100, h: 20 },
      { x: 540, y: 220, w: 80, h: 20 },
      { x: 700, y: 290, w: 80, h: 20 },
      { x: 860, y: 220, w: 80, h: 20 },
      { x: 1020, y: 290, w: 100, h: 20 },
      { x: 1220, y: 200, w: 100, h: 20 },
      { x: 1420, y: 280, w: 100, h: 20 },
      { x: 1600, y: 340, w: 100, h: 20 },
    ],
    stars: [
      { x: 210, y: 320 },
      { x: 390, y: 250 },
      { x: 560, y: 180 },
      { x: 720, y: 250 },
      { x: 880, y: 180 },
      { x: 1050, y: 250 },
      { x: 1250, y: 160 },
      { x: 1450, y: 240 },
    ],
    blocks: [
      { item: 'diamond', x: 280, y: 240 },
      { item: 'ice', x: 460, y: 130 },
      { item: 'mushroom', x: 620, y: 130 },
      { item: 'feather', x: 800, y: 250 },
      { item: 'heart', x: 950, y: 130 },
      { item: 'fire', x: 1130, y: 220 },
      { item: 'crown', x: 1380, y: 130 },
      { item: 'diamond', x: 1500, y: 200 },
    ],
    coins: [
      { x: 100, y: 380 }, { x: 140, y: 380 },
      { x: 320, y: 250 }, { x: 360, y: 250 },
      { x: 590, y: 180 }, { x: 630, y: 180 },
      { x: 880, y: 180 },
      { x: 1100, y: 380 }, { x: 1140, y: 380 }, { x: 1180, y: 380 },
      { x: 1380, y: 380 },
      { x: 1660, y: 380 }, { x: 1700, y: 380 },
    ],
    enemies: [
      { type: 'monster', x: 600, y: 400, range: 120 },
      { type: 'bat', x: 800, y: 150, range: 80 },
      { type: 'monster', x: 1100, y: 400, range: 150 },
      { type: 'bat', x: 1350, y: 130, range: 100 },
      { type: 'bug', x: 1500, y: 405, range: 80 },
    ],
    goal: { x: 1700, y: 360 },
  },
  {
    name: 'Berggipfel',
    decor: 'mountains',
    bgColor: 'linear-gradient(180deg, #4a4e69 0%, #9a8c98 60%, #f2e9e4 100%)',
    width: 2000,
    platforms: [
      { x: 150, y: 370, w: 80, h: 20 },
      { x: 280, y: 310, w: 70, h: 20 },
      { x: 400, y: 250, w: 70, h: 20 },
      { x: 520, y: 190, w: 70, h: 20 },
      { x: 680, y: 250, w: 70, h: 20 },
      { x: 820, y: 320, w: 80, h: 20 },
      { x: 980, y: 250, w: 70, h: 20 },
      { x: 1120, y: 180, w: 70, h: 20 },
      { x: 1280, y: 240, w: 70, h: 20 },
      { x: 1420, y: 300, w: 80, h: 20 },
      { x: 1580, y: 230, w: 70, h: 20 },
      { x: 1740, y: 290, w: 80, h: 20 },
      { x: 1880, y: 350, w: 80, h: 20 },
    ],
    stars: [
      { x: 170, y: 330 },
      { x: 300, y: 270 },
      { x: 420, y: 210 },
      { x: 540, y: 150 },
      { x: 700, y: 210 },
      { x: 840, y: 280 },
      { x: 1000, y: 210 },
      { x: 1140, y: 140 },
      { x: 1300, y: 200 },
      { x: 1600, y: 190 },
    ],
    blocks: [
      { item: 'diamond', x: 250, y: 240 },
      { item: 'fire', x: 380, y: 180 },
      { item: 'wizardshield', x: 470, y: 200 },
      { item: 'rainbow', x: 500, y: 110 },
      { item: 'mushroom', x: 600, y: 110 },
      { item: 'ice', x: 880, y: 250 },
      { item: 'heart', x: 1050, y: 130 },
      { item: 'shield', x: 1200, y: 150 },
      { item: 'diamond', x: 1340, y: 170 },
      { item: 'fire', x: 1500, y: 230 },
      { item: 'mushroom', x: 1620, y: 130 },
      { item: 'crown', x: 1760, y: 140 },
      { item: 'ice', x: 1830, y: 220 },
    ],
    coins: [
      { x: 100, y: 380 },
      { x: 250, y: 200 }, { x: 290, y: 200 },
      { x: 420, y: 220 },
      { x: 700, y: 200 }, { x: 740, y: 200 },
      { x: 950, y: 220 },
      { x: 1200, y: 380 }, { x: 1240, y: 380 },
      { x: 1430, y: 270 }, { x: 1470, y: 270 },
      { x: 1700, y: 380 },
      { x: 1900, y: 320 }, { x: 1940, y: 320 },
    ],
    enemies: [
      { type: 'monster', x: 450, y: 400, range: 100 },
      { type: 'wizard', x: 700, y: 384 },
      { type: 'bat', x: 850, y: 100, range: 120 },
      { type: 'monster', x: 1050, y: 400, range: 100 },
      { type: 'bug', x: 1400, y: 405, range: 80 },
      { type: 'wizard', x: 1700, y: 384 },
    ],
    goal: { x: 1920, y: 370 },
  },
  {
    name: 'Dunkler Wald',
    decor: 'forest',
    bgColor: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
    width: 2000,
    platforms: [
      { x: 200, y: 340, w: 100, h: 20 },
      { x: 380, y: 270, w: 90, h: 20 },
      { x: 560, y: 200, w: 80, h: 20 },
      { x: 740, y: 280, w: 90, h: 20 },
      { x: 920, y: 220, w: 90, h: 20 },
      { x: 1110, y: 300, w: 100, h: 20 },
      { x: 1300, y: 220, w: 80, h: 20 },
      { x: 1470, y: 290, w: 90, h: 20 },
      { x: 1650, y: 200, w: 90, h: 20 },
      { x: 1820, y: 320, w: 100, h: 20 },
    ],
    stars: [
      { x: 230, y: 300 },
      { x: 410, y: 230 },
      { x: 580, y: 160 },
      { x: 760, y: 240 },
      { x: 940, y: 180 },
      { x: 1140, y: 260 },
      { x: 1320, y: 180 },
      { x: 1500, y: 250 },
      { x: 1680, y: 160 },
      { x: 1850, y: 280 },
    ],
    blocks: [
      { item: 'fire', x: 300, y: 250 },
      { item: 'wizardshield', x: 420, y: 200 },
      { item: 'shield', x: 500, y: 150 },
      { item: 'heart', x: 650, y: 130 },
      { item: 'mushroom', x: 850, y: 250 },
      { item: 'ice', x: 1050, y: 220 },
      { item: 'diamond', x: 1240, y: 150 },
      { item: 'rainbow', x: 1370, y: 130 },
      { item: 'fire', x: 1400, y: 220 },
      { item: 'mushroom', x: 1580, y: 130 },
      { item: 'feather', x: 1700, y: 250 },
      { item: 'crown', x: 1800, y: 130 },
      { item: 'diamond', x: 1900, y: 250 },
    ],
    coins: [
      { x: 100, y: 380 }, { x: 140, y: 380 },
      { x: 230, y: 300 }, { x: 270, y: 300 },
      { x: 470, y: 200 },
      { x: 770, y: 240 }, { x: 810, y: 240 },
      { x: 1050, y: 380 },
      { x: 1330, y: 180 },
      { x: 1620, y: 380 }, { x: 1660, y: 380 },
      { x: 1850, y: 280 }, { x: 1900, y: 280 },
    ],
    enemies: [
      { type: 'bat', x: 350, y: 100, range: 100 },
      { type: 'wizard', x: 600, y: 384 },
      { type: 'monster', x: 800, y: 400, range: 80 },
      { type: 'bat', x: 1000, y: 100, range: 130 },
      { type: 'dragon', x: 1200, y: 130, range: 150 },
      { type: 'wizard', x: 1450, y: 384 },
      { type: 'monster', x: 1650, y: 400, range: 100 },
      { type: 'bat', x: 1850, y: 100, range: 100 },
    ],
    goal: { x: 1940, y: 370 },
  },
  {
    name: 'Drachenburg',
    decor: 'castle',
    bgColor: 'linear-gradient(180deg, #450a0a 0%, #7f1d1d 40%, #b91c1c 80%, #fbbf24 100%)',
    width: 2200,
    platforms: [
      { x: 180, y: 340, w: 100, h: 20 },
      { x: 360, y: 270, w: 90, h: 20 },
      { x: 540, y: 340, w: 100, h: 20 },
      { x: 720, y: 240, w: 90, h: 20 },
      { x: 900, y: 320, w: 100, h: 20 },
      { x: 1080, y: 250, w: 90, h: 20 },
      { x: 1260, y: 320, w: 100, h: 20 },
      { x: 1440, y: 230, w: 90, h: 20 },
      { x: 1620, y: 310, w: 100, h: 20 },
      { x: 1800, y: 240, w: 90, h: 20 },
      { x: 1980, y: 320, w: 100, h: 20 },
    ],
    stars: [
      { x: 210, y: 300 },
      { x: 390, y: 230 },
      { x: 570, y: 300 },
      { x: 750, y: 200 },
      { x: 930, y: 280 },
      { x: 1110, y: 210 },
      { x: 1290, y: 280 },
      { x: 1470, y: 190 },
      { x: 1650, y: 270 },
      { x: 1830, y: 200 },
      { x: 2010, y: 280 },
    ],
    blocks: [
      { item: 'fire', x: 280, y: 250 },
      { item: 'shield', x: 380, y: 180 },
      { item: 'wizardshield', x: 420, y: 100 },
      { item: 'heart', x: 470, y: 200 },
      { item: 'ice', x: 650, y: 280 },
      { item: 'rainbow', x: 750, y: 100 },
      { item: 'mushroom', x: 820, y: 170 },
      { item: 'feather', x: 950, y: 220 },
      { item: 'diamond', x: 1000, y: 250 },
      { item: 'fire', x: 1180, y: 180 },
      { item: 'heart', x: 1370, y: 250 },
      { item: 'crown', x: 1500, y: 100 },
      { item: 'ice', x: 1550, y: 160 },
      { item: 'mushroom', x: 1730, y: 240 },
      { item: 'rainbow', x: 1850, y: 100 },
      { item: 'diamond', x: 1900, y: 170 },
      { item: 'crown', x: 2050, y: 240 },
    ],
    coins: [
      { x: 100, y: 380 }, { x: 140, y: 380 }, { x: 180, y: 380 },
      { x: 380, y: 230 },
      { x: 590, y: 300 }, { x: 630, y: 300 },
      { x: 920, y: 280 },
      { x: 1130, y: 220 }, { x: 1170, y: 220 },
      { x: 1410, y: 380 },
      { x: 1670, y: 270 }, { x: 1710, y: 270 },
      { x: 2010, y: 380 }, { x: 2050, y: 380 }, { x: 2090, y: 380 },
    ],
    enemies: [
      { type: 'dragon', x: 300, y: 130, range: 130 },
      { type: 'wizard', x: 500, y: 384 },
      { type: 'bat', x: 700, y: 100, range: 120 },
      { type: 'dragon', x: 900, y: 110, range: 150 },
      { type: 'wizard', x: 1100, y: 384 },
      { type: 'monster', x: 1300, y: 400, range: 100 },
      { type: 'dragon', x: 1500, y: 130, range: 160 },
      { type: 'wizard', x: 1700, y: 384 },
      { type: 'bat', x: 1900, y: 100, range: 130 },
      { type: 'dragon', x: 2050, y: 100, range: 120 },
    ],
    goal: { x: 2140, y: 370 },
  },
]

// ----------------------------------------------------------------------
// Levels 6-100: prozedural generiert
// ----------------------------------------------------------------------

const THEMES = [
  // Welt 1: Eishöhle — Wasser + Eiszapfen vom Himmel
  { name: 'Eishöhle', decor: 'snow', bgColor: 'linear-gradient(180deg, #0c4a6e 0%, #0ea5e9 50%, #e0f2fe 100%)', enemies: ['bat', 'ghost', 'monster', 'zombie'], hazard: 'water', faller: { emoji: '🧊', interval: 180 } },
  // Welt 2: Wüste — keine Gefahr im Boden, nur Skorpione + Sandstürme bleiben weg
  { name: 'Wüste', decor: 'sand', bgColor: 'linear-gradient(180deg, #f59e0b 0%, #fbbf24 50%, #fde68a 100%)', enemies: ['bug', 'wizard', 'scorpion', 'dragon'], hazard: null, faller: null },
  // Welt 3: Tiefe Höhle — Lava-Adern + fallende Felsen!
  { name: 'Tiefe Höhle', decor: 'cave', bgColor: 'linear-gradient(180deg, #18181b 0%, #3f3f46 50%, #71717a 100%)', enemies: ['bat', 'wizard', 'ghost', 'skeleton'], hazard: 'lava', faller: { emoji: '🪨', interval: 150 } },
  // Welt 4: Weltraum — Meteoriten!
  { name: 'Weltraum', decor: 'stars', bgColor: 'linear-gradient(180deg, #020617 0%, #1e293b 50%, #6366f1 100%)', enemies: ['bat', 'dragon', 'ghost', 'eagle'], hazard: null, faller: { emoji: '☄️', interval: 140 } },
  // Welt 5: Regenbogen-Land
  { name: 'Regenbogen-Land', decor: 'rainbow', bgColor: 'linear-gradient(180deg, #ec4899 0%, #fbbf24 30%, #4ade80 60%, #38bdf8 80%, #a855f7 100%)', enemies: ['dragon', 'wizard', 'ghost', 'eagle', 'scorpion'], hazard: null, faller: null },
  // Welt 6: Vulkan — Lava + Feuerbälle vom Himmel + Bienen
  { name: 'Vulkan', decor: 'lava', bgColor: 'linear-gradient(180deg, #450a0a 0%, #ef4444 50%, #fbbf24 100%)', enemies: ['dragon', 'wizard', 'ogre', 'skeleton', 'bee'], hazard: 'lava', faller: { emoji: '🔥', interval: 110 } },
  // Welt 7: Schloss-Garten — Burggraben + Augen + Pfeile
  { name: 'Schloss-Garten', decor: 'castle', bgColor: 'linear-gradient(180deg, #6b21a8 0%, #c084fc 60%, #fce7f3 100%)', enemies: ['wizard', 'ghost', 'zombie', 'eagle', 'eye'], hazard: 'water', faller: { emoji: '🏹', interval: 130 } },
  // Welt 8: Sumpf — Säure + Säuretropfen
  { name: 'Sumpf', decor: 'swamp', bgColor: 'linear-gradient(180deg, #14532d 0%, #65a30d 50%, #a3e635 100%)', enemies: ['bug', 'zombie', 'wizard', 'skeleton', 'scorpion', 'bee'], hazard: 'acid', faller: { emoji: '🟢', interval: 130 } },
  // Welt 9: Sternenmeer — Sternschnuppen
  { name: 'Sternenmeer', decor: 'stars', bgColor: 'linear-gradient(180deg, #1e1b4b 0%, #6366f1 50%, #c4b5fd 100%)', enemies: ['ghost', 'dragon', 'eagle', 'skeleton', 'eye'], hazard: null, faller: { emoji: '☄️', interval: 100 } },
  // Welt 10: Endkampf — Lava + Feuer & Meteor-Hagel!
  { name: 'Endkampf', decor: 'lava', bgColor: 'linear-gradient(180deg, #18181b 0%, #ef4444 30%, #f97316 60%, #fde047 100%)', enemies: ['dragon', 'wizard', 'ghost', 'ogre', 'eagle', 'skeleton', 'zombie', 'scorpion', 'bee', 'eye'], hazard: 'lava', faller: { emoji: '🔥', interval: 70 } },
]

function seededRandom(seed) {
  let x = seed
  return () => {
    x = (x * 9301 + 49297) % 233280
    return x / 233280
  }
}

const ITEM_POOL = [
  'diamond', 'diamond', 'diamond',
  'mushroom', 'mushroom',
  'fire', 'fire',
  'ice', 'ice',
  'shield', 'feather',
  'wizardshield', 'wizardshield',
  'rainbow',
  'crown',
  'heart', 'heart',
  'magnet', 'magnet',
  'bomb',
  'clock',
  'coinbag', 'coinbag',
  'lightning',
]

// Theme-spezifische Bonus-Items: kommen ZUSÄTZLICH zum Pool, mit höherer
// Wahrscheinlichkeit (mehrfach gelistet → öfter gewählt).
const THEME_BONUS_ITEMS = {
  snow:    ['skates', 'skates', 'skates'],         // Eishöhle: Schlittschuhe
  sand:    ['waterbottle', 'waterbottle'],         // Wüste: Wasserflasche
  cave:    ['waterbottle'],                        // Höhle: Wasser hilft auch
  stars:   ['rocket', 'rocket', 'rocket'],         // Weltraum/Sterne: Rakete
  rainbow: ['rocket'],
  lava:    ['extinguisher', 'extinguisher', 'extinguisher'], // Vulkan: Löscher
  castle:  ['sword', 'sword', 'sword'],            // Schloss: Schwert
  swamp:   ['sword'],
  // meadow / clouds / forest / mountains: kein Bonus
}

function generateLevel(index) {
  // Levels 6-100 → Welten ab Index 0 (also Eishöhle für Level 6-15, etc.)
  const genIdx = index - 6 // 0-basierter generierter Index (0..94)
  const worldIdx = Math.floor(genIdx / 10) % THEMES.length
  const localLvl = (genIdx % 10) + 1
  const theme = THEMES[worldIdx]
  // Schwierigkeit wächst stetig mit dem Level
  const difficulty = 1.5 + (index - 6) * 0.12
  const rng = seededRandom(index * 1009 + 31)

  const width = Math.min(3200, Math.floor(1500 + difficulty * 90))
  const numPlatforms = Math.min(22, 6 + Math.floor(difficulty * 0.9))
  const numStars = Math.min(16, 5 + Math.floor(difficulty * 0.65))
  const numCoins = Math.min(28, 8 + Math.floor(difficulty * 1.4))
  const numBlocks = Math.min(16, 3 + Math.floor(difficulty * 0.45))
  const numEnemies = Math.min(16, 2 + Math.floor(difficulty * 0.55))

  const platforms = []
  const usableWidth = width - 350
  for (let i = 0; i < numPlatforms; i++) {
    const zoneStart = 200 + (i * usableWidth) / numPlatforms
    const x = Math.floor(zoneStart + rng() * 50)
    const y = Math.floor(130 + rng() * 230)
    const w = Math.floor(70 + rng() * 70)
    platforms.push({ x, y, w, h: 20 })
  }
  platforms.sort((a, b) => a.x - b.x)

  const stars = []
  for (let i = 0; i < numStars; i++) {
    if (i < platforms.length && rng() < 0.7) {
      const p = platforms[i]
      stars.push({ x: p.x + Math.floor(p.w / 2 - 14), y: p.y - 35 })
    } else {
      stars.push({ x: Math.floor(200 + rng() * (width - 400)), y: Math.floor(130 + rng() * 220) })
    }
  }

  const coins = []
  for (let i = 0; i < numCoins; i++) {
    const onPlatform = rng() < 0.35 && platforms.length > 0
    if (onPlatform) {
      const p = platforms[Math.floor(rng() * platforms.length)]
      coins.push({ x: p.x + Math.floor(p.w / 2 - 11), y: p.y - 30 })
    } else {
      const x = Math.floor(100 + (i * (width - 200)) / numCoins + rng() * 25)
      coins.push({ x, y: Math.floor(370 + rng() * 25) })
    }
  }

  // Theme-Bonus-Items mischen (haben hohere Wahrscheinlichkeit per Mehrfachlistung)
  const themedPool = [...ITEM_POOL, ...(THEME_BONUS_ITEMS[theme.decor] || [])]
  const blocks = []
  const blockGap = (width - 400) / Math.max(1, numBlocks)
  for (let i = 0; i < numBlocks; i++) {
    const x = Math.floor(250 + i * blockGap + rng() * 30)
    const y = Math.floor(110 + rng() * 160)
    const item = themedPool[Math.floor(rng() * themedPool.length)]
    blocks.push({ item, x, y })
  }

  const allowedEnemies = theme.enemies.filter((e) => e !== 'ghost' || index >= 10)
  const enemies = []
  const enemyGap = (width - 500) / Math.max(1, numEnemies)
  for (let i = 0; i < numEnemies; i++) {
    const enemyType = allowedEnemies[Math.floor(rng() * allowedEnemies.length)]
    const baseX = Math.floor(300 + i * enemyGap + rng() * 30)
    let enemy
    if (enemyType === 'monster') {
      enemy = { type: 'monster', x: baseX, y: 400, range: 60 + Math.floor(rng() * 70) }
    } else if (enemyType === 'bug') {
      enemy = { type: 'bug', x: baseX, y: 405, range: 50 + Math.floor(rng() * 60) }
    } else if (enemyType === 'bat') {
      enemy = { type: 'bat', x: baseX, y: Math.floor(80 + rng() * 100), range: 80 + Math.floor(rng() * 80) }
    } else if (enemyType === 'wizard') {
      enemy = { type: 'wizard', x: baseX, y: 384 }
    } else if (enemyType === 'ghost') {
      enemy = { type: 'ghost', x: baseX, y: Math.floor(150 + rng() * 100) }
    } else if (enemyType === 'dragon') {
      enemy = { type: 'dragon', x: baseX, y: Math.floor(80 + rng() * 80), range: 100 + Math.floor(rng() * 80) }
    } else if (enemyType === 'zombie') {
      enemy = { type: 'zombie', x: baseX, y: 400, range: 50 + Math.floor(rng() * 60), hp: 2 }
    } else if (enemyType === 'skeleton') {
      enemy = { type: 'skeleton', x: baseX, y: 384, range: 60 + Math.floor(rng() * 70), hp: 2 }
    } else if (enemyType === 'eagle') {
      enemy = { type: 'eagle', x: baseX, y: Math.floor(70 + rng() * 70), range: 110 + Math.floor(rng() * 80) }
    } else if (enemyType === 'ogre') {
      enemy = { type: 'ogre', x: baseX, y: 396, range: 50 + Math.floor(rng() * 60), hp: 3 }
    } else if (enemyType === 'scorpion') {
      enemy = { type: 'scorpion', x: baseX, y: 405, range: 60 + Math.floor(rng() * 60), hp: 2 }
    } else if (enemyType === 'bee') {
      enemy = { type: 'bee', x: baseX, y: Math.floor(120 + rng() * 100), range: 100 + Math.floor(rng() * 80) }
    } else if (enemyType === 'eye') {
      enemy = { type: 'eye', x: baseX, y: Math.floor(160 + rng() * 80), range: 100 + Math.floor(rng() * 80), hp: 2 }
    }
    // Elite-Buff in höheren Welten: 20% Chance auf +1 HP
    if (worldIdx >= 5 && enemy && rng() < 0.2) {
      enemy.hp = (enemy.hp || 1) + 1
    }
    enemies.push(enemy)
  }

  // Mario-Style Hindernisse am Boden — theme-spezifische Auswahl
  const OBSTACLE_BY_THEME = {
    snow:      ['icicle', 'stone'],
    sand:      ['cactus', 'stone'],
    cave:      ['stone', 'stone', 'brick'],
    mountains: ['stone', 'stone', 'brick'],
    lava:      ['stone', 'pipe', 'brick'],
    castle:    ['brick', 'brick', 'pipe'],
    swamp:     ['stump', 'stone'],
    forest:    ['stump', 'stump', 'stone'],
    stars:     ['crystal', 'stone'],
    rainbow:   ['crystal', 'pipe'],
    clouds:    ['pipe', 'crystal'],
    meadow:    ['pipe', 'brick', 'stone'],
  }
  const obstaclePool = OBSTACLE_BY_THEME[theme.decor] || ['pipe', 'brick', 'stone']
  const obstacles = []
  const numObstacles = Math.min(6, 2 + Math.floor(difficulty * 0.3))
  const obstZone = width - 600
  const obstGap = obstZone / Math.max(1, numObstacles)
  for (let i = 0; i < numObstacles; i++) {
    const baseX = Math.floor(300 + i * obstGap + rng() * (obstGap * 0.4))
    const type = obstaclePool[Math.floor(rng() * obstaclePool.length)]
    let w, h
    if (type === 'pipe') { w = 50; h = 50 + Math.floor(rng() * 50) }
    else if (type === 'brick') { w = 60 + Math.floor(rng() * 60); h = 30 }
    else if (type === 'icicle') { w = 30; h = 50 + Math.floor(rng() * 50) }
    else if (type === 'cactus') { w = 36; h = 60 + Math.floor(rng() * 50) }
    else if (type === 'stump') { w = 70; h = 40 + Math.floor(rng() * 20) }
    else if (type === 'crystal') { w = 40 + Math.floor(rng() * 20); h = 70 + Math.floor(rng() * 30) }
    else { w = 50 + Math.floor(rng() * 30); h = 40 + Math.floor(rng() * 30) } // stone
    obstacles.push({ type, x: baseX, y: 420 - h, w, h })
  }

  // Gefahren-Felder (Lava / Wasser / Säure) — direkt am Boden, überspringbar
  const hazards = []
  if (theme.hazard) {
    // Anzahl wächst mit Schwierigkeit, max 5
    const numHazards = Math.min(5, 1 + Math.floor(difficulty * 0.35))
    const hazardZone = width - 600 // Sicherheitsabstand zu Spawn (300) + Goal (300)
    const hazardGap = hazardZone / Math.max(1, numHazards)
    for (let i = 0; i < numHazards; i++) {
      const baseX = Math.floor(300 + i * hazardGap + rng() * (hazardGap * 0.3))
      // Breite skaliert sanft mit Schwierigkeit, bleibt gut springbar
      // (Sprung ohne Boost ~140px, mit Anlauf ~200px → max Hazard 130px)
      const w = Math.floor(60 + rng() * Math.min(70, difficulty * 8))
      // Hazard sitzt auf Boden-Höhe (GROUND_Y=420), Höhe 28px
      hazards.push({ type: theme.hazard, x: baseX, y: 412, w, h: 30 })
    }
  }

  return {
    name: theme.name,
    decor: theme.decor,
    bgColor: theme.bgColor,
    width,
    platforms,
    stars,
    coins,
    blocks,
    enemies,
    hazards,
    obstacles,
    faller: theme.faller,
    goal: { x: width - 80, y: 360 },
  }
}

const GENERATED = []
for (let i = 6; i <= 100; i++) GENERATED.push(generateLevel(i))

export const LEVELS = [...HANDCRAFTED, ...GENERATED]
