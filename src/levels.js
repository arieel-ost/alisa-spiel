// 100 Levels — automatisch erzeugt, 10 Welten mit je 10 Levels
// Schwierigkeit steigt mit der Welt UND innerhalb der Welt.
// Ghost-Gegner erst ab Level 10 (per Anwender-Wunsch).
//
// Items in Blöcken: 'diamond' 💎, 'heart' ❤️, 'mushroom' 🍄, 'fire' 🔥, 'ice' ❄️,
//                    'rainbow' 🌈, 'shield' 🛡️, 'wizardshield' 🧿, 'feather' 🪶, 'crown' 👑
//                    'magnet' 🧲, 'bomb' 💣, 'clock' ⏰, 'coinbag' 💰, 'lightning' ⚡
// Gegner: 'monster' 👾, 'bug' 🐛, 'bat' 🦇, 'wizard' 🧙, 'ghost' 👻, 'dragon' 🐉

const THEMES = [
  // Welt 1: Wiese (Levels 1-10)
  {
    name: 'Wiese',
    bgColor: 'linear-gradient(180deg, #87ceeb 0%, #b8e6f5 70%, #c5e8a8 100%)',
    enemies: ['monster', 'bug'],
  },
  // Welt 2: Wolken (Levels 11-20)
  {
    name: 'Wolken',
    bgColor: 'linear-gradient(180deg, #ffd6e7 0%, #fff6cc 70%, #c8f0ff 100%)',
    enemies: ['monster', 'bat'],
  },
  // Welt 3: Berggipfel (Levels 21-30)
  {
    name: 'Berggipfel',
    bgColor: 'linear-gradient(180deg, #4a4e69 0%, #9a8c98 60%, #f2e9e4 100%)',
    enemies: ['bat', 'wizard', 'monster'],
  },
  // Welt 4: Dunkler Wald (Levels 31-40)
  {
    name: 'Dunkler Wald',
    bgColor: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
    enemies: ['wizard', 'ghost', 'monster'],
  },
  // Welt 5: Drachenburg (Levels 41-50)
  {
    name: 'Drachenburg',
    bgColor: 'linear-gradient(180deg, #450a0a 0%, #7f1d1d 40%, #b91c1c 80%, #fbbf24 100%)',
    enemies: ['wizard', 'dragon', 'bat'],
  },
  // Welt 6: Eishöhle (Levels 51-60)
  {
    name: 'Eishöhle',
    bgColor: 'linear-gradient(180deg, #0c4a6e 0%, #0ea5e9 50%, #e0f2fe 100%)',
    enemies: ['bat', 'ghost', 'monster'],
  },
  // Welt 7: Wüste (Levels 61-70)
  {
    name: 'Wüste',
    bgColor: 'linear-gradient(180deg, #f59e0b 0%, #fbbf24 50%, #fde68a 100%)',
    enemies: ['bug', 'wizard', 'dragon'],
  },
  // Welt 8: Tiefe Höhle (Levels 71-80)
  {
    name: 'Tiefe Höhle',
    bgColor: 'linear-gradient(180deg, #18181b 0%, #3f3f46 50%, #71717a 100%)',
    enemies: ['bat', 'wizard', 'ghost'],
  },
  // Welt 9: Weltraum (Levels 81-90)
  {
    name: 'Weltraum',
    bgColor: 'linear-gradient(180deg, #020617 0%, #1e293b 50%, #6366f1 100%)',
    enemies: ['bat', 'dragon', 'ghost'],
  },
  // Welt 10: Regenbogen-Land (Levels 91-100)
  {
    name: 'Regenbogen-Land',
    bgColor:
      'linear-gradient(180deg, #ec4899 0%, #fbbf24 30%, #4ade80 60%, #38bdf8 80%, #a855f7 100%)',
    enemies: ['dragon', 'wizard', 'ghost'],
  },
]

// Deterministischer Pseudo-Zufall
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

function generateLevel(index) {
  const worldIdx = Math.floor((index - 1) / 10)
  const localLvl = ((index - 1) % 10) + 1
  const theme = THEMES[worldIdx]
  // Schwierigkeit wächst: Welt > lokales Level
  const difficulty = worldIdx * 0.7 + localLvl * 0.18
  const rng = seededRandom(index * 1009 + 31)

  const width = Math.min(3200, Math.floor(1500 + difficulty * 90))
  const numPlatforms = Math.min(22, 6 + Math.floor(difficulty * 0.9))
  const numStars = Math.min(16, 5 + Math.floor(difficulty * 0.65))
  const numCoins = Math.min(28, 8 + Math.floor(difficulty * 1.4))
  const numBlocks = Math.min(16, 3 + Math.floor(difficulty * 0.45))
  const numEnemies = Math.min(16, 2 + Math.floor(difficulty * 0.55))

  // Plattformen — gleichmässig verteilt mit kleiner Zufallsvariation
  const platforms = []
  const usableWidth = width - 350
  for (let i = 0; i < numPlatforms; i++) {
    const zoneStart = 200 + (i * usableWidth) / numPlatforms
    const x = Math.floor(zoneStart + rng() * 50)
    const yMin = 130
    const yMax = 360
    const y = Math.floor(yMin + rng() * (yMax - yMin))
    const w = Math.floor(70 + rng() * 70)
    platforms.push({ x, y, w, h: 20 })
  }
  platforms.sort((a, b) => a.x - b.x)

  // Sterne — meistens auf oder über Plattformen
  const stars = []
  for (let i = 0; i < numStars; i++) {
    if (i < platforms.length && rng() < 0.7) {
      const p = platforms[i]
      stars.push({ x: p.x + Math.floor(p.w / 2 - 14), y: p.y - 35 })
    } else {
      stars.push({
        x: Math.floor(200 + rng() * (width - 400)),
        y: Math.floor(130 + rng() * 220),
      })
    }
  }

  // Münzen — entlang des Bodenpfades und über manche Plattformen
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

  // Fragezeichen-Blöcke
  const blocks = []
  const blockGap = (width - 400) / Math.max(1, numBlocks)
  for (let i = 0; i < numBlocks; i++) {
    const x = Math.floor(250 + i * blockGap + rng() * 30)
    const y = Math.floor(110 + rng() * 160)
    const item = ITEM_POOL[Math.floor(rng() * ITEM_POOL.length)]
    blocks.push({ item, x, y })
  }

  // Gegner — Geister erst ab Level 10
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
      enemy = {
        type: 'bat',
        x: baseX,
        y: Math.floor(80 + rng() * 100),
        range: 80 + Math.floor(rng() * 80),
      }
    } else if (enemyType === 'wizard') {
      enemy = { type: 'wizard', x: baseX, y: 384 }
    } else if (enemyType === 'ghost') {
      enemy = { type: 'ghost', x: baseX, y: Math.floor(150 + rng() * 100) }
    } else if (enemyType === 'dragon') {
      enemy = {
        type: 'dragon',
        x: baseX,
        y: Math.floor(80 + rng() * 80),
        range: 100 + Math.floor(rng() * 80),
      }
    }
    enemies.push(enemy)
  }

  return {
    name: theme.name,
    bgColor: theme.bgColor,
    width,
    platforms,
    stars,
    coins,
    blocks,
    enemies,
    goal: { x: width - 80, y: 360 },
  }
}

export const LEVELS = Array.from({ length: 100 }, (_, i) => generateLevel(i + 1))
