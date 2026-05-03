import { memo, useEffect, useRef, useState } from 'react'
import { LEVELS } from './levels'
import { startMusic, stopMusic, setMuted, playSfx } from './audio'
import './Game.css'

const GRAVITY = 0.7
const MOVE_SPEED = 4
const JUMP_POWER = 14
const SUPER_JUMP_POWER = 22
const PLAYER_W = 36
const PLAYER_H = 44
const VIEW_W = 800
const VIEW_H = 480
const GROUND_Y = 420
const ENEMY_W = 36
const ENEMY_H = 36
const STAR_SIZE = 28
const ITEM_SIZE = 32
const BLOCK_SIZE = 40
const SUPER_JUMP_DURATION = 360 // ~6 Sekunden bei 60fps
const POWER_DURATION = 1200 // 20 Sekunden
const PROJECTILE_SIZE = 24
const PROJECTILE_SPEED = 8
const SHOOT_COOLDOWN = 18 // Frames zwischen Schüssen
const SLAM_SPEED = 22
const RAINBOW_DURATION = 480 // 8 Sekunden
const FEATHER_DURATION = 1200 // 20 Sekunden
const COIN_SIZE = 22

const ENEMY_EMOJI = {
  monster: '👾',
  bug: '🐛',
  bat: '🦇',
  wizard: '🧙',
  ghost: '👻',
  dragon: '🐉',
  zombie: '🧟',
  skeleton: '💀',
  eagle: '🦅',
  ogre: '👹',
  scorpion: '🦂',
  bee: '🐝',
  eye: '👁️',
}

const ENEMY_PROJECTILE_EMOJI = {
  bolt: '🔮',
  fireball: '🔥',
  bone: '🦴',
  stinger: '📍',
  laser: '⚡',
}

// Trefferpunkte pro Typ (Standard 1)
const ENEMY_HP = {
  zombie: 2,
  skeleton: 2,
  scorpion: 2,
  ogre: 3,
  bee: 1,
  eye: 2,
}

const ITEM_EMOJI = {
  diamond: '💎',
  heart: '❤️',
  mushroom: '🍄',
  fire: '🔥',
  ice: '❄️',
  rainbow: '🌈',
  shield: '🛡️',
  wizardshield: '🧿',
  feather: '🪶',
  crown: '👑',
  magnet: '🧲',
  bomb: '💣',
  clock: '⏰',
  coinbag: '💰',
  lightning: '⚡',
  // Theme-spezifische Items
  skates: '⛸️',        // Eishöhle: Speed-Boost 12s
  rocket: '🚀',        // Sterne: Mega-Sprung 12s
  extinguisher: '🧯',  // Vulkan: Hazards harmlos 15s
  sword: '🗡️',         // Schloss: Beruhrungs-Tod fur Gegner 12s
  waterbottle: '💧',   // Wuste: sofort +1 Leben (max 9)
  flashlight: '🔦',    // Hohle: alle Fledermause sterben sofort + 15s keine neuen
  moon: '🌙',          // Sterne: niedrige Schwerkraft fur 12s
  chili: '🌶️',         // Vulkan: Triple-Schuss Feuer fur 15s
}

const MAGNET_DURATION = 900 // 15 Sekunden
const FREEZE_DURATION = 480 // 8 Sekunden
const LIGHTNING_DURATION = 600 // 10 Sekunden

const POWER_EMOJI = { fire: '🔥', ice: '❄️' }
const POWER_LABEL = { fire: 'Feuer', ice: 'Eis' }

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  )
}

// ----------------------------------------------------------------
// Lama-Modus v2 (Auto-Play AI):
//   - Stuck-Detection mit Recovery (Sprung + Rückwärts)
//   - Wand-Erkennung (Plattformen + Blöcke auf Brusthöhe)
//   - Hazard-Erkennung mit Doppelsprung-Heuristik
//   - Stomp-Window für Bodengegner (60-95 px statt blind springen)
//   - Bat-Korridor-Stop (statt rein in den Bat zu springen)
//   - Eagle-Dive-Warning + Ghost-Proximity
//   - Projektil-Dodge (bolt/fireball/bone, mit Trajectory-Vorhersage)
//   - Item-Magnet für wertvolle Power-Ups
//   - Glide mit Feder, präziser Schuss-Filter
// AI mutiert keys direkt → Edge-Detection für Sprung greift wie bei Spieler.
// ----------------------------------------------------------------
function applyAutoPlay(keys, s, p, level, ai) {
  // ----- AI-State pflegen -----
  ai.framesSinceJump = (ai.framesSinceJump || 0) + 1
  // Stuck-Detection: zählt nicht hoch wenn AI absichtlich stoppt (Bat-Korridor)
  const intentionalStop = ai.intentionalStop === true
  if (!intentionalStop && p.onGround && Math.abs(p.x - (ai.lastX ?? p.x)) < 0.4) {
    ai.stuckFrames = (ai.stuckFrames || 0) + 1
  } else {
    ai.stuckFrames = 0
  }
  ai.lastX = p.x
  ai.intentionalStop = false // wird unten gesetzt wenn Bat-Korridor aktiv

  // ----- Tasten leeren -----
  keys['ArrowLeft'] = false
  keys['ArrowRight'] = false
  keys['ArrowUp'] = false
  keys['ArrowDown'] = false
  keys[' '] = false
  keys['x'] = false

  // ----- Sammel-Ziel auswählen: nahester unhit Block > naher Stern > Goal -----
  // Blacklist verhindert ewiges Steckenbleiben an unerreichbaren Zielen.
  ai.blacklist = ai.blacklist || new Set()
  ai.currentTargetKey = ai.currentTargetKey || null
  ai.targetFrames = ai.targetFrames || 0

  const goal = level.goal
  const goalDx = goal ? goal.x - p.x : 1000
  const SEARCH_RADIUS = 240
  let target = null
  let targetDist = SEARCH_RADIUS
  let targetKey = null

  // Erste Wahl: nicht-getroffener Block (Power-Up drin)
  for (const b of s.blocks) {
    if (b.hit) continue
    const k = `b:${b.x}:${b.y}`
    if (ai.blacklist.has(k)) continue
    const dx = b.x - p.x
    const d = Math.hypot(dx, b.y - p.y)
    if (d < targetDist) {
      targetDist = d
      target = { x: b.x + BLOCK_SIZE / 2, y: b.y, kind: 'block' }
      targetKey = k
    }
  }

  // Zweite Wahl: ungesammelter Stern (kleiner Suchradius, Goal-Richtung priorisieren)
  if (!target) {
    let starDist = 200
    for (const star of s.stars) {
      if (star.taken) continue
      const k = `s:${star.x}:${star.y}`
      if (ai.blacklist.has(k)) continue
      const dx = star.x - p.x
      const d = Math.hypot(dx, star.y - p.y)
      if (d < starDist) {
        starDist = d
        target = { x: star.x + STAR_SIZE / 2, y: star.y, kind: 'star' }
        targetKey = k
      }
    }
  }

  // Target-Tracking: wenn zu lange am gleichen Target → blacklist
  if (target) {
    if (targetKey !== ai.currentTargetKey) {
      ai.currentTargetKey = targetKey
      ai.targetFrames = 0
    } else {
      ai.targetFrames += 1
      if (ai.targetFrames > 200) {
        ai.blacklist.add(targetKey)
        ai.currentTargetKey = null
        ai.targetFrames = 0
        target = null
      }
    }
  } else {
    ai.currentTargetKey = null
    ai.targetFrames = 0
  }

  // Default-Richtung: target hat Vorrang vor goal
  const dirDx = target ? target.x - p.x : goalDx
  if (dirDx > 15) keys['ArrowRight'] = true
  else if (dirDx < -15) keys['ArrowLeft'] = true

  // Wenn target oben drüber & nahe → springen
  if (target && p.onGround && ai.framesSinceJump > 6) {
    const tdx = Math.abs(target.x - (p.x + PLAYER_W / 2))
    const tdy = (p.y + PLAYER_H) - target.y // wie viel höher liegt das Target?
    if (tdx < 50 && tdy > 30 && tdy < 180) {
      keys[' '] = true
      ai.framesSinceJump = 0
    }
  }

  // ----- STUCK RECOVERY (Sicherheitsnetz, beendet Frame früh) -----
  if (ai.stuckFrames > 18) {
    if (ai.stuckFrames < 55) {
      // Phase 1: Springen (vielleicht ist's nur eine Wand)
      if (p.onGround && ai.framesSinceJump > 5) {
        keys[' '] = true
        ai.framesSinceJump = 0
      }
    } else if (ai.stuckFrames < 85) {
      // Phase 2: Kurz rückwärts mit Sprung (Anlauf nehmen).
      // Default rückwärts gegen die letzte Bewegungsrichtung; falls Goal links
      // → nach rechts ausweichen, sonst nach links.
      keys['ArrowRight'] = goalDx <= 0
      keys['ArrowLeft'] = goalDx > 0
      if (p.onGround && ai.framesSinceJump > 8) {
        keys[' '] = true
        ai.framesSinceJump = 0
      }
    } else {
      ai.stuckFrames = 0 // reset, neuer Versuch
    }
    return
  }

  // ----- Hindernis-Detektion -----
  let needJump = false
  let needDoubleJump = false
  let stompNow = false
  let blockProjectile = false // Bat/Adler auf Spielerhöhe → kurz anhalten

  // Wände: Plattformen + Blöcke auf Brusthöhe IN BEWEGUNGSRICHTUNG.
  // Symmetrisch links/rechts, basierend auf der Default-Richtung.
  // ZUSÄTZLICH: niedrige Plattformen als "Hop-Ziele".
  const movingLeft = keys['ArrowLeft'] === true && keys['ArrowRight'] === false
  const playerFeet = p.y + PLAYER_H
  // Vorderkante = wo Spieler hinläuft, Suchradius 90 px in Bewegungsrichtung
  const frontEdge = movingLeft ? p.x : p.x + PLAYER_W
  const horizCheck = (sx, sxEnd) => movingLeft
    ? (sxEnd < p.x + 2 && sxEnd > p.x - 90)
    : (sx > p.x + PLAYER_W - 2 && sx < p.x + PLAYER_W + 90)
  const hopHorizCheck = (sx, sxEnd) => movingLeft
    ? (sxEnd < p.x + 8 && sxEnd > p.x - 90)
    : (sx > p.x + PLAYER_W - 8 && sx < p.x + PLAYER_W + 90)

  for (const solid of [...level.platforms, ...(level.obstacles || [])]) {
    const sh = solid.h || 20
    const sx = solid.x
    const sxEnd = solid.x + solid.w
    const sy = solid.y
    const syEnd = solid.y + sh
    // Bounding-Box-Filter
    if (sxEnd < p.x - 100 || sx > p.x + PLAYER_W + 100) continue
    // Wand: solid in Spieler-Vertikalbereich, in Bewegungsrichtung
    if (sy < playerFeet - 6 && syEnd > p.y + 4 && horizCheck(sx, sxEnd)) {
      needJump = true
      if (syEnd > p.y + 30) needDoubleJump = true
    }
    // Hop-Ziel: Plattform 30-110 px höher als Spieler-Füsse, in Bewegungsrichtung
    else if (p.onGround && sy < playerFeet - 30 && sy > playerFeet - 130 &&
             hopHorizCheck(sx, sxEnd)) {
      needJump = true
      if (sy < playerFeet - 90) needDoubleJump = true
    }
  }
  for (const b of s.blocks) {
    if (b.hit) continue
    if (b.x + BLOCK_SIZE < p.x - 100 || b.x > p.x + PLAYER_W + 100) continue
    if (b.y < playerFeet - 6 && b.y + BLOCK_SIZE > p.y + 4 &&
        horizCheck(b.x, b.x + BLOCK_SIZE)) {
      needJump = true
      if (b.y + BLOCK_SIZE > p.y + 30) needDoubleJump = true
    }
  }

  // Hazards: drüber springen
  for (const h of s.hazards) {
    if (h.x + h.w > p.x + PLAYER_W - 4 && h.x < p.x + PLAYER_W + 110) {
      if (h.y < p.y + PLAYER_H + 12) {
        needJump = true
        if (h.w > 80) needDoubleJump = true
      }
    }
  }

  // Gegner: differenziert behandeln
  if (s.rainbowFrames === 0) {
    for (const e of s.enemies) {
      if (e.dead) continue
      const dx = (e.x + ENEMY_W / 2) - (p.x + PLAYER_W / 2)
      const dy = e.y - p.y
      const isGround = e.y >= GROUND_Y - 60

      // Bodengegner: Stomp-Window
      if (isGround && dx > 20 && dx < 130) {
        if (dx > 55 && dx < 95 && p.onGround && Math.abs(dy) < 60) {
          stompNow = true
        } else if (dx <= 55) {
          // zu spät für Stomp → einfach drüber springen
          needJump = true
        }
      }

      // Fliegende Gegner auf Spielerhöhe ±25 px:
      // statt nur stoppen, kurz rückwärts weichen wenn der Gegner auf uns zukommt
      if (!isGround && Math.abs(dx) < 110 && Math.abs(dy) < 25) {
        keys['ArrowLeft'] = false
        keys['ArrowRight'] = false
        ai.intentionalStop = true
        // Wenn Gegner näher kommt → 1-2 Schritte rückwärts
        const closing = (dx > 0 && (e.dir || 0) < 0) || (dx < 0 && (e.dir || 0) > 0)
        if (closing && Math.abs(dx) < 70) {
          if (dx > 0) keys['ArrowLeft'] = true
          else keys['ArrowRight'] = true
        }
        blockProjectile = true
      }

      // Adler-Dive-Warnung: Adler 50-180 px über Spieler in Reichweite
      if (e.type === 'eagle' && Math.abs(e.x - p.x) < 90 && dy < -50 && dy > -180) {
        needJump = true
        needDoubleJump = true
      }

      // Ghost in unmittelbarer Nähe → drauf springen
      if (e.type === 'ghost') {
        const gd = Math.hypot(e.x - p.x, e.y - p.y)
        if (gd < 90) needJump = true
      }
    }
  }

  // Projektile-Dodge: 14-Frame-Trajektorie
  let projectileIncoming = false
  for (const ep of s.enemyProjectiles) {
    const T = 14
    const tx = ep.x + ep.vx * T
    // Knochen: ep.gravity true, vy steigt um 0.45/Frame → korrekte Sigma-Formel
    const ty = ep.gravity
      ? ep.y + ep.vy * T + 0.45 * T * (T + 1) / 2
      : ep.y + ep.vy * T
    if (tx > p.x - 30 && tx < p.x + PLAYER_W + 30 &&
        ty > p.y - 25 && ty < p.y + PLAYER_H + 25) {
      // Kommt von oben? Drunter durchhuschen statt springen
      if (ep.vy > 1.5) {
        // weiterlaufen
      } else {
        needJump = true
        projectileIncoming = true
        if (Math.abs(ep.vx) >= 3) needDoubleJump = true
      }
    }
  }
  // Wenn Projektil eintrifft und Spieler bereits in der Luft → Doppelsprung-Ausweich
  if (projectileIncoming && !p.onGround && p.jumpsLeft > 0 && ai.framesSinceJump > 4) {
    keys[' '] = true
    ai.framesSinceJump = 0
  }

  // ----- Sprung-Logik -----
  if (stompNow && ai.framesSinceJump > 6) {
    keys[' '] = true
    ai.framesSinceJump = 0
  } else if (needJump && ai.framesSinceJump > 7) {
    if (p.onGround) {
      keys[' '] = true
      ai.framesSinceJump = 0
    } else if (needDoubleJump && p.jumpsLeft > 0 && p.vy > -3) {
      // Zweiter Sprung erst wenn erster den Höhepunkt erreicht hat
      keys[' '] = true
      ai.framesSinceJump = 0
    }
  }

  // Notfall-Doppelsprung wenn fallend über Hazard
  if (!p.onGround && p.vy > 5 && p.jumpsLeft > 0 && ai.framesSinceJump > 6) {
    for (const h of s.hazards) {
      if (h.x < p.x + PLAYER_W + 60 && h.x + h.w > p.x - 20 && h.y < p.y + 220) {
        keys[' '] = true
        ai.framesSinceJump = 0
        break
      }
    }
  }

  // ----- Glide mit Feder -----
  if (s.featherFrames > 0 && !p.onGround && p.vy >= 0) {
    keys[' '] = true
  }

  // ----- Schuss: präziser dy-Filter (Projektile fliegen horizontal) -----
  if (s.power === 'fire' || s.power === 'ice') {
    for (const e of s.enemies) {
      if (e.dead) continue
      const dx = e.x - p.x
      const dy = e.y - p.y
      // Direkt vor uns auf gleicher Höhe (±25 px)
      if (dx > 20 && dx < 280 && Math.abs(dy) < 25) {
        keys['x'] = true
        break
      }
    }
  }

  // ----- Item-Magnet für wertvolle Power-Ups (nur in Bewegungsrichtung) -----
  const wanted = new Set(['rainbow', 'wizardshield', 'shield', 'heart', 'feather', 'mushroom', 'crown', 'fire', 'ice', 'lightning', 'bomb', 'clock'])
  for (const it of s.items) {
    if (it.taken || !wanted.has(it.type)) continue
    const dx = it.x - p.x
    const dxInDir = movingLeft ? -dx : dx
    // Item muss vor uns liegen (in Laufrichtung)
    if (dxInDir > -5 && dxInDir < 90 && Math.abs(it.y - p.y) < 130) {
      // Item höher als Spieler-Kopf → springen
      if (it.y < p.y - 10 && p.onGround && ai.framesSinceJump > 6 && !needDoubleJump) {
        keys[' '] = true
        ai.framesSinceJump = 0
      }
      break
    }
  }
}

export default function Game({ onExit, character = '🐈' }) {
  const [levelIndex, setLevelIndex] = useState(0)
  const [stars, setStars] = useState(0)
  const [score, setScore] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [lives, setLives] = useState(5)
  const [superJump, setSuperJump] = useState(0)
  const [power, setPower] = useState(null) // null | 'fire' | 'ice'
  const [powerTime, setPowerTime] = useState(0)
  const [rainbowTime, setRainbowTime] = useState(0)
  const [featherTime, setFeatherTime] = useState(0)
  const [shield, setShield] = useState(false)
  const [coinsCount, setCoinsCount] = useState(0)
  const [bombShield, setBombShield] = useState(0)
  const [magnetTime, setMagnetTime] = useState(0)
  const [freezeTime, setFreezeTime] = useState(0)
  const [lightningTime, setLightningTime] = useState(0)
  const [bombFlash, setBombFlash] = useState(0)
  // Theme-Items
  const [skatesTime, setSkatesTime] = useState(0)         // ⛸️ Speed-Boost
  const [rocketTime, setRocketTime] = useState(0)         // 🚀 Mega-Sprung
  const [extinguisherTime, setExtinguisherTime] = useState(0) // 🧯 Hazards harmlos
  const [swordTime, setSwordTime] = useState(0)           // 🗡️ Beruhrungs-Tod
  const [flashlightTime, setFlashlightTime] = useState(0) // 🔦 Bats fliehen
  const [moonTime, setMoonTime] = useState(0)             // 🌙 niedrige Gravity
  const [chiliTime, setChiliTime] = useState(0)           // 🌶️ Triple-Feuer
  const [musicOn, setMusicOn] = useState(false)
  const [status, setStatus] = useState('playing') // playing | won | lost | finished
  const [, force] = useState(0)
  const [resetTrigger, setResetTrigger] = useState(0)

  const stateRef = useRef(null)
  const keysRef = useRef({})
  const animRef = useRef(null)
  const autoPlayRef = useRef(false)
  const aiStateRef = useRef({ framesSinceJump: 99, doubleJumpCooldown: 0 })
  const [autoPlay, setAutoPlay] = useState(false)
  // Affen-Modus: Cheat - unsterblich. Aktivierbar mit L wenn Charakter = Affe (Alisa).
  const apeModeRef = useRef(false)
  const [apeMode, setApeMode] = useState(false)
  // Fliegen-Modus: nur für Einhorn. Schwerkraft aus, ↑↓ steuern Höhe.
  const flyModeRef = useRef(false)
  const [flyMode, setFlyMode] = useState(false)
  // Level-Menü: M-Taste öffnet Auswahl der freigeschalteten Levels
  const [menuOpen, setMenuOpen] = useState(false)
  const [maxLevelUnlocked, setMaxLevelUnlocked] = useState(() => {
    if (typeof window === 'undefined') return 1
    try {
      const stored = parseInt(localStorage.getItem('alisa-max-level') || '1', 10)
      return Math.max(1, Math.min(99, stored))
    } catch (e) { return 1 }
  })
  // Speicherstände: 3 Slots in localStorage
  const [saveSlots, setSaveSlots] = useState(() => {
    if (typeof window === 'undefined') return [null, null, null]
    try {
      const stored = localStorage.getItem('alisa-saves')
      if (!stored) return [null, null, null]
      const parsed = JSON.parse(stored)
      return Array.isArray(parsed) && parsed.length === 3 ? parsed : [null, null, null]
    } catch (e) { return [null, null, null] }
  })
  const wrapperRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [rotateGate, setRotateGate] = useState(() => {
    // Beim Start prüfen: Touchscreen / kleines Display?
    if (typeof window === 'undefined') return false
    return window.matchMedia('(pointer: coarse), (max-width: 900px)').matches
  })
  const [countdown, setCountdown] = useState(0)

  // Initialisiere Level
  useEffect(() => {
    const level = LEVELS[levelIndex]
    keysRef.current = {} // gehaltene Tasten nicht ins neue Level lecken
    aiStateRef.current = { framesSinceJump: 99, doubleJumpCooldown: 0, blacklist: new Set() }
    stateRef.current = {
      player: {
        x: 60,
        y: GROUND_Y - PLAYER_H,
        vx: 0,
        vy: 0,
        onGround: true,
        facing: 1,
        invincibleFrames: 0,
        jumpsLeft: 2,
        slamming: false,
        spinFrames: 0,
      },
      prevJumpKey: false,
      prevDownKey: false,
      stars: level.stars.map((s) => ({ ...s, taken: false })),
      coins: (level.coins || []).map((c) => ({ ...c, taken: false })),
      blocks: (level.blocks || []).map((b) => ({
        ...b,
        w: BLOCK_SIZE,
        h: BLOCK_SIZE,
        hit: false,
        bumpFrames: 0,
      })),
      items: [], // Items entstehen, wenn Blöcke getroffen werden
      projectiles: [],
      shootCooldown: 0,
      power: null,
      powerFrames: 0,
      rainbowFrames: 0,
      featherFrames: 0,
      shield: false,
      bombShield: 0,
      magnetFrames: 0,
      freezeFrames: 0,
      lightningFrames: 0,
      skatesFrames: 0,
      rocketFrames: 0,
      extinguisherFrames: 0,
      swordFrames: 0,
      flashlightFrames: 0,
      moonFrames: 0,
      chiliFrames: 0,
      fallerTimer: 60,
      bombFlashFrames: 0,
      fartClouds: [],
      fartTimer: 60,
      floatingTexts: [],
      landFlashFrames: 0,
      lastOnGround: true,
      hazards: (level.hazards || []).map((h) => ({ ...h })),
      enemies: (level.enemies || []).map((e) => ({
        ...e,
        startX: e.x,
        startY: e.y,
        dir: 1,
        bobPhase: Math.random() * Math.PI * 2,
        shootTimer: 60 + Math.floor(Math.random() * 60),
        hp: e.hp || ENEMY_HP[e.type] || 1,
        maxHp: e.hp || ENEMY_HP[e.type] || 1,
        hitFlash: 0,
        diving: false,
        diveCooldown: 0,
      })),
      enemyProjectiles: [],
      camera: 0,
      goalReached: false,
      superJumpFrames: 0,
    }
    setSuperJump(0)
    setPower(null)
    setPowerTime(0)
    setRainbowTime(0)
    setFeatherTime(0)
    setShield(false)
    setCoinsCount(0)
    setBombShield(0)
    setMagnetTime(0)
    setFreezeTime(0)
    setLightningTime(0)
    setBombFlash(0)
    setSkatesTime(0)
    setRocketTime(0)
    setExtinguisherTime(0)
    setSwordTime(0)
    setFlashlightTime(0)
    setMoonTime(0)
    setChiliTime(0)
    force((n) => n + 1)
  }, [levelIndex, resetTrigger])

  // Responsives Skalieren: das Spielfeld an die Bildschirmgrösse anpassen
  useEffect(() => {
    const onResize = () => {
      // Platz für HUD oben (~70px) und Touch-Buttons unten (~150px auf Mobile)
      const isMobile = window.matchMedia('(pointer: coarse), (max-width: 900px)').matches
      const reservedY = isMobile ? 200 : 120
      const sx = (window.innerWidth - 16) / VIEW_W
      const sy = (window.innerHeight - reservedY) / VIEW_H
      const scale = Math.max(0.3, Math.min(sx, sy, 1.6))
      document.documentElement.style.setProperty('--game-scale', scale)
    }
    onResize()
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])

  // Fullscreen-Status verfolgen
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // Musik beenden, wenn das Spiel verlassen wird
  useEffect(() => {
    return () => stopMusic()
  }, [])

  const toggleMusic = () => {
    if (musicOn) {
      setMuted(true)
      setMusicOn(false)
    } else {
      startMusic()
      setMuted(false)
      setMusicOn(true)
    }
  }

  // Level-Unlock: bei jedem Level-Wechsel höchstes erreichtes Level merken
  useEffect(() => {
    const reached = levelIndex + 1
    if (reached > maxLevelUnlocked) {
      setMaxLevelUnlocked(reached)
      try { localStorage.setItem('alisa-max-level', String(reached)) } catch (e) {}
    }
  }, [levelIndex, maxLevelUnlocked])

  // Wenn alle Leben weg sind → Level neu starten
  useEffect(() => {
    if (lives <= 0 && status === 'playing') {
      restartLevel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lives, status])

  // Tastatur
  useEffect(() => {
    const down = (e) => {
      keysRef.current[e.key] = true
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'x', 'X', 's', 'S', 'a', 'A'].includes(e.key)) {
        e.preventDefault()
      }
      // 9 oder Numpad-9 → Level neu starten
      if (e.key === '9' || e.code === 'Numpad9') {
        restartLevel()
      }
      // P → Hexer-Schild auffüllen (3 Bomben blocken)
      if (e.key === 'p' || e.key === 'P') {
        if (stateRef.current) stateRef.current.bombShield = 3
        setBombShield(3)
      }
      // A → Level überspringen
      if (e.key === 'a' || e.key === 'A') {
        skipLevel()
      }
      // M → Level-Menü öffnen/schliessen
      if (e.key === 'm' || e.key === 'M') {
        setMenuOpen((o) => !o)
      }
      // L → Charakter-spezifischer Modus: 🦄=Fly, 🐒=Ape, 🦙=Lama, sonst=Lama
      if (e.key === 'l' || e.key === 'L') {
        triggerCharacterMode()
      }
    }
    const up = (e) => {
      keysRef.current[e.key] = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Spiel-Loop
  useEffect(() => {
    if (status !== 'playing') return
    if (menuOpen) return // Pausiert wenn Level-Menü offen
    if (!stateRef.current) return

    const level = LEVELS[levelIndex]

    const tick = () => {
      const s = stateRef.current
      const p = s.player
      const keys = keysRef.current

      // Affen-Modus: privater Cheat — permanent unsterblich
      if (apeModeRef.current) {
        p.invincibleFrames = Math.max(p.invincibleFrames, 9999)
      }

      // Lama-Modus: AI schreibt direkt in keys, Edge-Detection greift wie bei Spieler-Eingabe
      if (autoPlayRef.current) {
        applyAutoPlay(keys, s, p, level, aiStateRef.current)
      }

      // Bewegung links/rechts (gesperrt während Bodenstoss)
      // Schlittschuhe: 1.6x Speed, wenn aktiv
      const moveSpd = s.skatesFrames > 0 ? MOVE_SPEED * 1.6 : MOVE_SPEED
      if (p.slamming) {
        p.vx = 0
      } else if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
        p.vx = -moveSpd
        p.facing = -1
      } else if (keys['ArrowRight'] || keys['d'] || keys['D']) {
        p.vx = moveSpd
        p.facing = 1
      } else {
        p.vx = 0
      }

      // Springen (Doppelsprung) — nur bei Tasten-Druck (Edge), nicht beim Halten
      const jumpKeyDown = !!(keys['ArrowUp'] || keys[' '] || keys['w'] || keys['W'])
      if (jumpKeyDown && !s.prevJumpKey && p.jumpsLeft > 0 && !p.slamming) {
        // Rakete oder Mushroom > Standard
        const power = s.rocketFrames > 0 ? 26 : (s.superJumpFrames > 0 ? SUPER_JUMP_POWER : JUMP_POWER)
        p.vy = -power
        p.onGround = false
        p.jumpsLeft -= 1
        if (p.jumpsLeft === 0) {
          // zweiter Sprung → Drehung
          p.spinFrames = 22
        }
      }
      s.prevJumpKey = jumpKeyDown

      // Bodenstoss: in der Luft auf Pfeil-runter / S
      const downKeyDown = !!(keys['ArrowDown'] || keys['s'] || keys['S'])
      if (downKeyDown && !s.prevDownKey && !p.onGround && !p.slamming) {
        p.slamming = true
        p.vy = SLAM_SPEED
      }
      s.prevDownKey = downKeyDown

      // Fliegen-Modus (Einhorn): Schwerkraft aus, ↑↓ steuern Höhe direkt
      if (flyModeRef.current && character === '🦄') {
        const upKey = keys['ArrowUp'] || keys[' '] || keys['w'] || keys['W']
        const downKey = keys['ArrowDown'] || keys['s'] || keys['S']
        if (upKey) p.vy = -4.5
        else if (downKey) p.vy = 4.5
        else p.vy = 0
        p.onGround = false // beim Fliegen nie als geerdet betrachten
      } else {
        // Schwerkraft (Mond reduziert auf 40%)
        p.vy += s.moonFrames > 0 ? GRAVITY * 0.4 : GRAVITY
      }

      // Feder: Gleitflug nach vorne (langsamer Sinkflug + Vorwärtsschub)
      if (s.featherFrames > 0 && jumpKeyDown && !p.onGround && !p.slamming) {
        if (p.vy > 1.2) p.vy = 1.2
        // Wenn keine Pfeil-Taste gedrückt: sanft nach vorne in Blickrichtung
        if (p.vx === 0) p.vx = p.facing * (MOVE_SPEED + 0.5)
      }

      const maxFall = p.slamming ? SLAM_SPEED : 18
      if (p.vy > maxFall) p.vy = maxFall

      // Spin-Animation runterzählen
      if (p.spinFrames > 0) p.spinFrames -= 1

      // Horizontale Bewegung + Kollision (Plattformen UND Blöcke sind solide)
      p.x += p.vx
      if (p.x < 0) p.x = 0
      if (p.x + PLAYER_W > level.width) p.x = level.width - PLAYER_W

      const solids = [...level.platforms, ...s.blocks, ...(level.obstacles || [])]
      for (const plat of solids) {
        const pr = { x: p.x, y: p.y, w: PLAYER_W, h: PLAYER_H }
        if (rectsOverlap(pr, plat)) {
          if (p.vx > 0) p.x = plat.x - PLAYER_W
          else if (p.vx < 0) p.x = plat.x + plat.w
        }
      }

      // Vertikale Bewegung + Kollision
      p.y += p.vy
      p.onGround = false

      // Boden
      if (p.y + PLAYER_H >= GROUND_Y) {
        p.y = GROUND_Y - PLAYER_H
        p.vy = 0
        p.onGround = true
      }

      for (const plat of [...level.platforms, ...(level.obstacles || [])]) {
        const pr = { x: p.x, y: p.y, w: PLAYER_W, h: PLAYER_H }
        if (rectsOverlap(pr, plat)) {
          if (p.vy > 0) {
            p.y = plat.y - PLAYER_H
            p.vy = 0
            p.onGround = true
          } else if (p.vy < 0) {
            p.y = plat.y + plat.h
            p.vy = 0
          }
        }
      }

      // Block-Kollision (solide). Item-Release wenn:
      //   - von UNTEN getroffen (Kopf-Stoss), ODER
      //   - mit Bodenstoss von OBEN getroffen
      for (const block of s.blocks) {
        const pr = { x: p.x, y: p.y, w: PLAYER_W, h: PLAYER_H }
        if (rectsOverlap(pr, block)) {
          if (p.vy > 0) {
            // landet oben drauf
            const wasSlamming = p.slamming
            p.y = block.y - PLAYER_H
            p.vy = 0
            p.onGround = true
            if (wasSlamming && !block.hit) {
              block.hit = true
              block.bumpFrames = 14
              // Item pop SEITLICH aus dem Block raus (nicht nach unten unter Spieler-Füsse)
              const sideDir = p.facing > 0 ? -1 : 1
              s.items.push({
                type: block.item,
                x: block.x + (BLOCK_SIZE - ITEM_SIZE) / 2 + sideDir * (BLOCK_SIZE / 2 + 4),
                y: block.y + 6,
                vx: sideDir * 4,
                vy: -7,
                taken: false,
                settled: false,
                grabDelay: 12,
              })
              // kleiner Hopser zurück nach oben
              p.vy = -8
              p.onGround = false
            }
          } else if (p.vy < 0) {
            // Kopf-Stoss von unten
            p.y = block.y + block.h
            p.vy = 0
            if (!block.hit) {
              block.hit = true
              block.bumpFrames = 12
              s.items.push({
                type: block.item,
                x: block.x + (BLOCK_SIZE - ITEM_SIZE) / 2,
                y: block.y - ITEM_SIZE - 2,
                vx: 0,
                vy: -6,
                taken: false,
                settled: false,
                grabDelay: 0,
              })
            }
          }
        }
        if (block.bumpFrames > 0) block.bumpFrames -= 1
      }

      // Bei Landung: Sprünge zurücksetzen, Bodenstoss beenden
      if (p.onGround) {
        p.jumpsLeft = 2
        if (p.slamming) {
          p.slamming = false
        }
      }

      const pr = { x: p.x, y: p.y, w: PLAYER_W, h: PLAYER_H }

      const popText = (x, y, text, color = '#fbbf24') => {
        s.floatingTexts.push({ x, y, text, color, age: 0 })
      }

      const playerCx = p.x + PLAYER_W / 2
      const playerCy = p.y + PLAYER_H / 2

      // Magnet zieht Sterne und Münzen zum Spieler
      if (s.magnetFrames > 0) {
        for (const star of s.stars) {
          if (star.taken) continue
          const dx = playerCx - (star.x + STAR_SIZE / 2)
          const dy = playerCy - (star.y + STAR_SIZE / 2)
          const dist = Math.hypot(dx, dy)
          if (dist < 280 && dist > 1) {
            const speed = Math.min(10, 250 / dist)
            star.x += (dx / dist) * speed
            star.y += (dy / dist) * speed
          }
        }
        for (const coin of s.coins) {
          if (coin.taken) continue
          const dx = playerCx - (coin.x + COIN_SIZE / 2)
          const dy = playerCy - (coin.y + COIN_SIZE / 2)
          const dist = Math.hypot(dx, dy)
          if (dist < 280 && dist > 1) {
            const speed = Math.min(10, 250 / dist)
            coin.x += (dx / dist) * speed
            coin.y += (dy / dist) * speed
          }
        }
      }

      // Sterne einsammeln
      for (const star of s.stars) {
        if (!star.taken) {
          const sr = { x: star.x, y: star.y, w: STAR_SIZE, h: STAR_SIZE }
          if (rectsOverlap(pr, sr)) {
            star.taken = true
            setStars((n) => n + 1)
            setScore((n) => n + 1)
            setTotalScore((n) => n + 1)
            popText(star.x, star.y, '+1', '#fbbf24')
          }
        }
      }

      // Münzen einsammeln
      for (const coin of s.coins) {
        if (!coin.taken) {
          const cr = { x: coin.x, y: coin.y, w: COIN_SIZE, h: COIN_SIZE }
          if (rectsOverlap(pr, cr)) {
            coin.taken = true
            setCoinsCount((n) => n + 1)
            setScore((n) => n + 1)
            setTotalScore((n) => n + 1)
            popText(coin.x, coin.y, '+1', '#fbbf24')
          }
        }
      }

      // Items: Schwerkraft + Kollision mit Plattformen, dann einsammeln
      for (const item of s.items) {
        if (item.taken) continue

        if (!item.settled) {
          item.vy += 0.5
          if (item.vy > 14) item.vy = 14
          item.x += item.vx || 0
          item.y += item.vy

          // Welt-Grenzen
          if (item.x < 0) {
            item.x = 0
            item.vx = -item.vx * 0.5
          }
          if (item.x + ITEM_SIZE > level.width) {
            item.x = level.width - ITEM_SIZE
            item.vx = -item.vx * 0.5
          }

          // Boden
          if (item.y + ITEM_SIZE >= GROUND_Y) {
            item.y = GROUND_Y - ITEM_SIZE
            item.vy = 0
            item.vx = 0
            item.settled = true
          }

          // Plattformen + Blöcke (nur von oben drauflanden)
          if (!item.settled && item.vy >= 0) {
            const ir2 = { x: item.x, y: item.y, w: ITEM_SIZE, h: ITEM_SIZE }
            for (const plat of [...level.platforms, ...s.blocks, ...(level.obstacles || [])]) {
              if (rectsOverlap(ir2, plat)) {
                item.y = plat.y - ITEM_SIZE
                item.vy = 0
                item.vx = 0
                item.settled = true
                break
              }
            }
          }
        }

        if (item.grabDelay > 0) item.grabDelay -= 1

        if (item.grabDelay === 0) {
          const ir = { x: item.x, y: item.y, w: ITEM_SIZE, h: ITEM_SIZE }
          if (rectsOverlap(pr, ir)) {
            item.taken = true
            if (item.type === 'diamond') {
              setScore((n) => n + 3)
              setTotalScore((n) => n + 3)
              s.floatingTexts.push({ x: item.x, y: item.y, text: '+3', color: '#22d3ee', age: 0 })
            } else if (item.type === 'heart') {
              setLives((l) => Math.min(9, l + 1))
              s.floatingTexts.push({ x: item.x, y: item.y, text: '+❤️', color: '#f43f5e', age: 0 })
            } else if (item.type === 'waterbottle') {
              setLives((l) => Math.min(9, l + 1))
              s.floatingTexts.push({ x: item.x, y: item.y, text: '+❤️ Wasser!', color: '#38bdf8', age: 0 })
            } else if (item.type === 'skates') {
              s.skatesFrames = 720 // 12s
              setSkatesTime(720)
              s.floatingTexts.push({ x: item.x, y: item.y, text: 'SCHLITTSCHUHE!', color: '#bfdbfe', age: 0 })
            } else if (item.type === 'rocket') {
              s.rocketFrames = 720 // 12s
              setRocketTime(720)
              s.floatingTexts.push({ x: item.x, y: item.y, text: 'RAKETE!', color: '#a855f7', age: 0 })
            } else if (item.type === 'extinguisher') {
              s.extinguisherFrames = 900 // 15s
              setExtinguisherTime(900)
              s.floatingTexts.push({ x: item.x, y: item.y, text: 'LÖSCHER!', color: '#dc2626', age: 0 })
            } else if (item.type === 'sword') {
              s.swordFrames = 720 // 12s
              setSwordTime(720)
              s.floatingTexts.push({ x: item.x, y: item.y, text: 'SCHWERT!', color: '#fde047', age: 0 })
            } else if (item.type === 'flashlight') {
              // Sofort: alle Bats verschwinden, fur 15s keine neuen Treffer
              for (const e of s.enemies) {
                if (!e.dead && e.type === 'bat') e.dead = true
              }
              s.flashlightFrames = 900 // 15s
              setFlashlightTime(900)
              s.floatingTexts.push({ x: item.x, y: item.y, text: '🔦 LICHT!', color: '#fde047', age: 0 })
            } else if (item.type === 'moon') {
              s.moonFrames = 720 // 12s
              setMoonTime(720)
              s.floatingTexts.push({ x: item.x, y: item.y, text: 'MOND!', color: '#c4b5fd', age: 0 })
            } else if (item.type === 'chili') {
              s.chiliFrames = 900 // 15s, dazu Fire-Power aktivieren
              setChiliTime(900)
              s.power = 'fire'
              s.powerFrames = 900
              setPower('fire')
              setPowerTime(900)
              s.floatingTexts.push({ x: item.x, y: item.y, text: 'CHILI! 3X', color: '#dc2626', age: 0 })
            } else if (item.type === 'mushroom') {
              s.superJumpFrames = SUPER_JUMP_DURATION
              setSuperJump(SUPER_JUMP_DURATION)
              s.floatingTexts.push({ x: item.x, y: item.y, text: 'SUPER!', color: '#ec4899', age: 0 })
            } else if (item.type === 'fire' || item.type === 'ice') {
              s.power = item.type
              s.powerFrames = POWER_DURATION
              setPower(item.type)
              setPowerTime(POWER_DURATION)
              s.floatingTexts.push({ x: item.x, y: item.y, text: item.type === 'fire' ? 'FEUER!' : 'EIS!', color: item.type === 'fire' ? '#f97316' : '#38bdf8', age: 0 })
            } else if (item.type === 'rainbow') {
              s.rainbowFrames = RAINBOW_DURATION
              setRainbowTime(RAINBOW_DURATION)
              s.floatingTexts.push({ x: item.x, y: item.y, text: 'REGENBOGEN!', color: '#ec4899', age: 0 })
            } else if (item.type === 'shield') {
              s.shield = true
              setShield(true)
              s.floatingTexts.push({ x: item.x, y: item.y, text: 'SCHILD!', color: '#0ea5e9', age: 0 })
            } else if (item.type === 'wizardshield') {
              s.bombShield = 3
              setBombShield(3)
              s.floatingTexts.push({ x: item.x, y: item.y, text: 'HEXER-SCHILD!', color: '#ec4899', age: 0 })
            } else if (item.type === 'feather') {
              s.featherFrames = FEATHER_DURATION
              setFeatherTime(FEATHER_DURATION)
              s.floatingTexts.push({ x: item.x, y: item.y, text: 'SCHWEBEN!', color: '#fbbf24', age: 0 })
            } else if (item.type === 'crown') {
              setScore((n) => n + 10)
              setTotalScore((n) => n + 10)
              s.floatingTexts.push({ x: item.x, y: item.y, text: '+10!', color: '#fbbf24', age: 0 })
            } else if (item.type === 'magnet') {
              s.magnetFrames = MAGNET_DURATION
              setMagnetTime(MAGNET_DURATION)
              s.floatingTexts.push({ x: item.x, y: item.y, text: 'MAGNET!', color: '#f43f5e', age: 0 })
            } else if (item.type === 'bomb') {
              // Sofort: alle Gegner besiegen
              let killed = 0
              for (const e of s.enemies) {
                if (!e.dead) {
                  e.dead = true
                  killed += 1
                }
              }
              const points = killed * 2
              if (points > 0) {
                setScore((n) => n + points)
                setTotalScore((n) => n + points)
              }
              s.bombFlashFrames = 24
              setBombFlash(24)
              s.floatingTexts.push({ x: item.x, y: item.y, text: `BOOM! +${points}`, color: '#f97316', age: 0 })
            } else if (item.type === 'clock') {
              s.freezeFrames = FREEZE_DURATION
              setFreezeTime(FREEZE_DURATION)
              s.floatingTexts.push({ x: item.x, y: item.y, text: 'ZEIT-STOPP!', color: '#0ea5e9', age: 0 })
            } else if (item.type === 'coinbag') {
              setCoinsCount((n) => n + 5)
              setScore((n) => n + 5)
              setTotalScore((n) => n + 5)
              s.floatingTexts.push({ x: item.x, y: item.y, text: '+5 🪙', color: '#fbbf24', age: 0 })
            } else if (item.type === 'lightning') {
              s.lightningFrames = LIGHTNING_DURATION
              setLightningTime(LIGHTNING_DURATION)
              s.floatingTexts.push({ x: item.x, y: item.y, text: 'BLITZ!', color: '#fde047', age: 0 })
            }
          }
        }
      }

      // Super-Sprung Timer
      if (s.superJumpFrames > 0) {
        s.superJumpFrames -= 1
        setSuperJump(s.superJumpFrames)
      }

      // Kraft-Timer (Feuer/Eis)
      if (s.powerFrames > 0) {
        s.powerFrames -= 1
        setPowerTime(s.powerFrames)
        if (s.powerFrames === 0) {
          s.power = null
          setPower(null)
        }
      }

      // Regenbogen-Timer
      if (s.rainbowFrames > 0) {
        s.rainbowFrames -= 1
        setRainbowTime(s.rainbowFrames)
      }

      // Feder-Timer (Fliegen)
      if (s.featherFrames > 0) {
        s.featherFrames -= 1
        setFeatherTime(s.featherFrames)
      }
      // Magnet-Timer
      if (s.magnetFrames > 0) {
        s.magnetFrames -= 1
        setMagnetTime(s.magnetFrames)
      }
      // Freeze-Timer
      if (s.freezeFrames > 0) {
        s.freezeFrames -= 1
        setFreezeTime(s.freezeFrames)
      }
      // Blitz-Timer
      if (s.lightningFrames > 0) {
        s.lightningFrames -= 1
        setLightningTime(s.lightningFrames)
      }
      // Schlittschuhe-Timer
      if (s.skatesFrames > 0) {
        s.skatesFrames -= 1
        setSkatesTime(s.skatesFrames)
      }
      // Rakete-Timer
      if (s.rocketFrames > 0) {
        s.rocketFrames -= 1
        setRocketTime(s.rocketFrames)
      }
      // Feuerlöscher-Timer
      if (s.extinguisherFrames > 0) {
        s.extinguisherFrames -= 1
        setExtinguisherTime(s.extinguisherFrames)
      }
      // Schwert-Timer
      if (s.swordFrames > 0) {
        s.swordFrames -= 1
        setSwordTime(s.swordFrames)
      }
      // Taschenlampe-Timer (Bats werden in Enemy-Loop entfernt)
      if (s.flashlightFrames > 0) {
        s.flashlightFrames -= 1
        setFlashlightTime(s.flashlightFrames)
      }
      // Mond-Schwerkraft-Timer
      if (s.moonFrames > 0) {
        s.moonFrames -= 1
        setMoonTime(s.moonFrames)
      }
      // Chili-Timer (Triple-Schuss aktiv solange chiliFrames > 0)
      if (s.chiliFrames > 0) {
        s.chiliFrames -= 1
        setChiliTime(s.chiliFrames)
      }
      // Bomben-Blitz Animation
      if (s.bombFlashFrames > 0) {
        s.bombFlashFrames -= 1
        setBombFlash(s.bombFlashFrames)
      }

      // Schiessen
      if (s.shootCooldown > 0) s.shootCooldown -= 1
      const shootKey = keys['x'] || keys['X'] || keys['Shift']
      if (shootKey && s.shootCooldown === 0 && s.power) {
        s.shootCooldown = s.lightningFrames > 0 ? Math.max(6, Math.floor(SHOOT_COOLDOWN / 2)) : SHOOT_COOLDOWN
        s.projectiles.push({
          type: s.power,
          x: p.x + (p.facing > 0 ? PLAYER_W : -PROJECTILE_SIZE),
          y: p.y + 10,
          vx: PROJECTILE_SPEED * p.facing,
          life: 90,
        })
        // Blitz: zusätzliches Geschoss leicht versetzt für Doppelschuss-Effekt
        if (s.lightningFrames > 0) {
          s.projectiles.push({
            type: s.power,
            x: p.x + (p.facing > 0 ? PLAYER_W : -PROJECTILE_SIZE),
            y: p.y + 28,
            vx: PROJECTILE_SPEED * p.facing,
            life: 90,
          })
        }
      }

      // Projektile bewegen + Kollision
      for (const proj of s.projectiles) {
        proj.x += proj.vx
        proj.life -= 1
        const pjr = { x: proj.x, y: proj.y, w: PROJECTILE_SIZE, h: PROJECTILE_SIZE }

        // Soliden Hindernissen ausweichen
        for (const solid of [...level.platforms, ...s.blocks, ...(level.obstacles || [])]) {
          if (rectsOverlap(pjr, solid)) {
            proj.dead = true
            break
          }
        }

        // Feinde treffen — Projektile machen 1 Schaden
        if (!proj.dead) {
          for (const e of s.enemies) {
            const er = { x: e.x, y: e.y, w: ENEMY_W, h: ENEMY_H }
            if (rectsOverlap(pjr, er) && !e.dead) {
              e.hp -= 1
              e.hitFlash = 10
              proj.dead = true
              if (e.hp <= 0) {
                e.dead = true
                setScore((n) => n + 2)
                setTotalScore((n) => n + 2)
              }
              break
            }
          }
        }

        if (proj.life <= 0) proj.dead = true
        if (proj.x < -50 || proj.x > level.width + 50) proj.dead = true
      }
      s.projectiles = s.projectiles.filter((pr) => !pr.dead)

      // Unverwundbarkeits-Frames runterzählen
      if (p.invincibleFrames > 0) p.invincibleFrames -= 1

      // Lande-Animation: erkennen wann der Spieler landet
      if (p.onGround && !s.lastOnGround && p.vy === 0) {
        s.landFlashFrames = 8
      }
      s.lastOnGround = p.onGround
      if (s.landFlashFrames > 0) s.landFlashFrames -= 1

      // Schwebende Punkte-Texte animieren
      for (const ft of s.floatingTexts) {
        ft.age += 1
        ft.y -= 1.2
      }
      s.floatingTexts = s.floatingTexts.filter((ft) => ft.age < 50)

      // Niki der Pupsende Papagei: Pups-Wolken + ab und zu "PUPS!" Text
      if (character === '🦜') {
        s.fartTimer -= 1
        if (s.fartTimer <= 0) {
          const offsetX = p.facing > 0 ? -16 : PLAYER_W
          s.fartClouds.push({
            x: p.x + offsetX,
            y: p.y + 20,
            vx: -p.facing * 1.4,
            vy: -0.6,
            scale: 0.7 + Math.random() * 0.6,
            life: 60,
            age: 0,
          })
          // jeder 4. Pups: PUPS!-Text
          if (Math.random() < 0.25) {
            s.floatingTexts.push({
              x: p.x + offsetX,
              y: p.y + 5,
              text: 'PUPS!',
              color: '#a3e635',
              age: 0,
            })
          }
          s.fartTimer = 70 + Math.floor(Math.random() * 80)
        }
        for (const f of s.fartClouds) {
          f.x += f.vx
          f.y += f.vy
          f.vy += 0.04
          f.age += 1
          f.life -= 1
        }
        s.fartClouds = s.fartClouds.filter((f) => f.life > 0)
      }

      // Feinde bewegen + Kollision + Schiess-AI
      const frozen = s.freezeFrames > 0
      for (const e of s.enemies) {
        if (frozen) {
          // Eingefroren: Bewegung pausiert, Schiess-Timer pausiert — überspringen
        } else if (e.type === 'bat' && s.flashlightFrames > 0) {
          // Taschenlampe blendet Bats: sie verschwinden
          e.dead = true
        } else if (e.type === 'bat') {
          // Fledermäuse fliegen seitlich + auf/ab
          e.x += e.dir * 1.6
          if (e.x > e.startX + e.range) e.dir = -1
          if (e.x < e.startX - e.range) e.dir = 1
          e.bobPhase += 0.06
          e.y = e.startY + Math.sin(e.bobPhase) * 30
        } else if (e.type === 'bug') {
          e.x += e.dir * 0.6
          if (e.x > e.startX + e.range) e.dir = -1
          if (e.x < e.startX - e.range) e.dir = 1
        } else if (e.type === 'wizard') {
          // Hexer steht still und schiesst Zauberkugeln auf den Spieler
          e.bobPhase += 0.04
          e.y = e.startY + Math.sin(e.bobPhase) * 4
          e.shootTimer -= 1
          if (e.shootTimer <= 0) {
            const dx = (p.x + PLAYER_W / 2) - (e.x + ENEMY_W / 2)
            const dy = (p.y + PLAYER_H / 2) - (e.y + ENEMY_H / 2)
            const dist = Math.max(1, Math.hypot(dx, dy))
            const speed = 4
            s.enemyProjectiles.push({
              kind: 'bolt',
              x: e.x + ENEMY_W / 2 - 12,
              y: e.y + ENEMY_H / 2 - 12,
              vx: (dx / dist) * speed,
              vy: (dy / dist) * speed,
              life: 140,
            })
            e.shootTimer = 110 + Math.floor(Math.random() * 30)
          }
        } else if (e.type === 'ghost') {
          // Geister jagen den Spieler langsam
          const dx = (p.x + PLAYER_W / 2) - (e.x + ENEMY_W / 2)
          const dy = (p.y + PLAYER_H / 2) - (e.y + ENEMY_H / 2)
          const dist = Math.max(1, Math.hypot(dx, dy))
          const speed = 1.5
          e.x += (dx / dist) * speed
          e.y += (dy / dist) * speed
          // unter dem Boden nicht erlaubt
          if (e.y > GROUND_Y - ENEMY_H - 10) e.y = GROUND_Y - ENEMY_H - 10
          if (e.y < 20) e.y = 20
          if (dx > 0) e.dir = 1
          else e.dir = -1
        } else if (e.type === 'dragon') {
          // Drachen fliegen hin und her, schiessen Feuerbälle horizontal
          e.x += e.dir * 1.8
          if (e.x > e.startX + e.range) e.dir = -1
          if (e.x < e.startX - e.range) e.dir = 1
          e.bobPhase += 0.05
          e.y = e.startY + Math.sin(e.bobPhase) * 15
          e.shootTimer -= 1
          if (e.shootTimer <= 0) {
            s.enemyProjectiles.push({
              kind: 'fireball',
              x: e.x + (e.dir > 0 ? ENEMY_W : -24),
              y: e.y + ENEMY_H / 2 - 12,
              vx: e.dir * 5,
              vy: 0,
              life: 160,
            })
            e.shootTimer = 80 + Math.floor(Math.random() * 40)
          }
        } else if (e.type === 'zombie') {
          // Zombie: langsamer als Monster
          e.x += e.dir * 0.55
          if (e.x > e.startX + e.range) e.dir = -1
          if (e.x < e.startX - e.range) e.dir = 1
        } else if (e.type === 'ogre') {
          // Oger: gross und langsam
          e.x += e.dir * 0.8
          if (e.x > e.startX + e.range) e.dir = -1
          if (e.x < e.startX - e.range) e.dir = 1
        } else if (e.type === 'scorpion') {
          // Skorpion: schneller als Käfer
          e.x += e.dir * 1.7
          if (e.x > e.startX + e.range) e.dir = -1
          if (e.x < e.startX - e.range) e.dir = 1
        } else if (e.type === 'skeleton') {
          // Skelett: läuft, wirft Knochen im Bogen
          e.x += e.dir * 1.0
          if (e.x > e.startX + e.range) e.dir = -1
          if (e.x < e.startX - e.range) e.dir = 1
          e.shootTimer -= 1
          if (e.shootTimer <= 0) {
            s.enemyProjectiles.push({
              kind: 'bone',
              x: e.x,
              y: e.y - 6,
              vx: e.dir * 4,
              vy: -8,
              life: 130,
              gravity: true,
            })
            e.shootTimer = 110 + Math.floor(Math.random() * 50)
          }
        } else if (e.type === 'eagle') {
          // Adler: fliegt seitlich, taucht runter wenn der Spieler darunter ist
          if (!e.diving) {
            e.x += e.dir * 2.4
            if (e.x > e.startX + e.range) e.dir = -1
            if (e.x < e.startX - e.range) e.dir = 1
            e.bobPhase += 0.06
            e.y = e.startY + Math.sin(e.bobPhase) * 12
            const horizDist = Math.abs((p.x + PLAYER_W / 2) - (e.x + ENEMY_W / 2))
            if (horizDist < 70 && p.y > e.y + 110 && e.diveCooldown === 0) {
              e.diving = true
            }
          } else {
            e.y += 6
            if (e.y > GROUND_Y - ENEMY_H - 10 || e.y > p.y + 80) {
              e.diving = false
              e.diveCooldown = 90
              e.startY = Math.max(60, Math.floor(80 + Math.random() * 60))
              e.y = e.startY
            }
          }
          if (e.diveCooldown > 0) e.diveCooldown -= 1
        } else if (e.type === 'bee') {
          // Biene: zigzag-Bewegung, schiesst Stachel auf Spieler.
          // X bewegt patrol-mässig, Y oszilliert schnell (zigzag).
          e.x += e.dir * 2.5
          if (e.x > e.startX + e.range) e.dir = -1
          if (e.x < e.startX - e.range) e.dir = 1
          e.bobPhase += 0.18
          e.y = e.startY + Math.sin(e.bobPhase) * 35
          e.shootTimer -= 1
          if (e.shootTimer <= 0) {
            const dx = (p.x + PLAYER_W / 2) - (e.x + ENEMY_W / 2)
            const dy = (p.y + PLAYER_H / 2) - (e.y + ENEMY_H / 2)
            const dist = Math.max(1, Math.hypot(dx, dy))
            const speed = 5
            s.enemyProjectiles.push({
              kind: 'stinger',
              x: e.x + ENEMY_W / 2 - 8,
              y: e.y + ENEMY_H / 2 - 8,
              vx: (dx / dist) * speed,
              vy: (dy / dist) * speed,
              life: 110,
            })
            e.shootTimer = 80 + Math.floor(Math.random() * 50)
          }
        } else if (e.type === 'eye') {
          // Böses Auge: Lissajous-Pattern (8er-Form), free-flying, schiesst Laser.
          // Position relativ zu Anker (startX, startY).
          e.bobPhase = (e.bobPhase || 0) + 0.025
          e.x = e.startX + Math.sin(e.bobPhase) * (e.range || 120)
          e.y = e.startY + Math.sin(e.bobPhase * 2) * 70
          e.shootTimer -= 1
          if (e.shootTimer <= 0) {
            const dx = (p.x + PLAYER_W / 2) - (e.x + ENEMY_W / 2)
            const dy = (p.y + PLAYER_H / 2) - (e.y + ENEMY_H / 2)
            const dist = Math.max(1, Math.hypot(dx, dy))
            const speed = 6
            s.enemyProjectiles.push({
              kind: 'laser',
              x: e.x + ENEMY_W / 2 - 12,
              y: e.y + ENEMY_H / 2 - 12,
              vx: (dx / dist) * speed,
              vy: (dy / dist) * speed,
              life: 150,
            })
            e.shootTimer = 130 + Math.floor(Math.random() * 60)
          }
        } else {
          // Monster: normal
          e.x += e.dir * 1.2
          if (e.x > e.startX + e.range) e.dir = -1
          if (e.x < e.startX - e.range) e.dir = 1
        }
        if (e.hitFlash > 0) e.hitFlash -= 1

        const er = { x: e.x, y: e.y, w: ENEMY_W, h: ENEMY_H }
        if (rectsOverlap(pr, er)) {
          // Bodenstoss: 3 Schaden (besiegt fast alle in einem Schlag)
          if (p.slamming) {
            e.hp -= 3
            e.hitFlash = 10
            if (e.hp <= 0) {
              e.dead = true
              setScore((n) => n + 3)
              setTotalScore((n) => n + 3)
            }
            continue
          }
          // Regenbogen-Power: Gegner einfach durchrennen (sterben)
          if (s.rainbowFrames > 0) {
            e.dead = true
            setScore((n) => n + 2)
            setTotalScore((n) => n + 2)
            continue
          }
          // Schwert-Power: Berührung tötet Gegner sofort (egal welche HP)
          if (s.swordFrames > 0) {
            e.dead = true
            setScore((n) => n + 2)
            setTotalScore((n) => n + 2)
            s.floatingTexts.push({ x: e.x, y: e.y, text: '🗡️!', color: '#fde047', age: 0 })
            continue
          }
          // Hexer-Schild fängt auch Hexer-Berührung ab (kostet 1 Ladung)
          if (e.type === 'wizard' && s.bombShield > 0 && p.invincibleFrames === 0) {
            s.bombShield -= 1
            setBombShield(s.bombShield)
            p.invincibleFrames = 30
            // sanfter Rückstoss, ohne Schaden
            p.vx = (p.x < e.x ? -1 : 1) * 4
            p.vy = -6
            continue
          }
          // Drauf-Springen: 1 Schaden
          if (p.vy > 2 && p.y + PLAYER_H - p.vy <= e.y + 6) {
            e.hp -= 1
            e.hitFlash = 10
            p.vy = -10
            if (e.hp <= 0) {
              e.dead = true
              setScore((n) => n + 2)
              setTotalScore((n) => n + 2)
            }
          } else if (!e.dead && p.invincibleFrames === 0) {
            // Schild blockt einen Treffer
            if (s.shield) {
              s.shield = false
              setShield(false)
              p.invincibleFrames = 60
              continue
            }
            // Verloren
            p.invincibleFrames = 60
            p.x = 60
            p.y = GROUND_Y - PLAYER_H
            p.vx = 0
            p.vy = 0
            setLives((l) => Math.max(0, l - 1))
          }
        }
      }
      s.enemies = s.enemies.filter((e) => !e.dead)

      // Faller: theme-spezifische Sachen vom Himmel (Feuer/Eis/Felsen/Meteore/etc).
      // Spawn in Spielerumgebung, fallen mit Schwerkraft, treffen wie Projektil.
      if (level.faller && !frozen) {
        s.fallerTimer = (s.fallerTimer || 60) - 1
        if (s.fallerTimer <= 0) {
          const baseX = p.x + (Math.random() * 700 - 250)
          const spawnX = Math.max(40, Math.min(level.width - 40, baseX))
          s.enemyProjectiles.push({
            kind: 'sky',
            emoji: level.faller.emoji,
            x: spawnX, y: -40,
            vx: (Math.random() - 0.5) * 1.5,
            vy: 2.5 + Math.random() * 1.5,
            life: 260,
            gravity: false,
          })
          s.fallerTimer = level.faller.interval + Math.floor(Math.random() * level.faller.interval * 0.5)
        }
      }

      // Gegner-Projektile bewegen + Kollision (eingefroren wenn Uhr aktiv)
      for (const ep of s.enemyProjectiles) {
        if (!frozen) {
          ep.x += ep.vx
          ep.y += ep.vy
          if (ep.gravity) ep.vy += 0.45 // Knochen fliegen im Bogen
          ep.life -= 1
        }
        const epr = { x: ep.x, y: ep.y, w: 24, h: 24 }

        // Treffer auf Spieler
        if (rectsOverlap(pr, epr) && p.invincibleFrames === 0 && !p.slamming && s.rainbowFrames === 0) {
          // Hexer-Schild fängt Hexer-Bomben ab (kostet 1 Ladung)
          if (ep.kind === 'bolt' && s.bombShield > 0) {
            s.bombShield -= 1
            setBombShield(s.bombShield)
            ep.dead = true
            continue
          }
          ep.dead = true
          if (s.shield) {
            s.shield = false
            setShield(false)
            p.invincibleFrames = 60
          } else {
            p.invincibleFrames = 60
            p.x = 60
            p.y = GROUND_Y - PLAYER_H
            p.vx = 0
            p.vy = 0
            p.slamming = false
            setLives((l) => Math.max(0, l - 1))
          }
        } else if (rectsOverlap(pr, epr) && s.rainbowFrames > 0) {
          ep.dead = true // Regenbogen löst Geschosse auf
        }

        // Soliden Hindernissen ausweichen
        if (!ep.dead) {
          for (const solid of [...level.platforms, ...s.blocks, ...(level.obstacles || [])]) {
            if (rectsOverlap(epr, solid)) {
              ep.dead = true
              break
            }
          }
        }

        if (ep.life <= 0) ep.dead = true
        if (ep.x < -50 || ep.x > level.width + 50) ep.dead = true
        if (ep.y > 600 || ep.y < -50) ep.dead = true
      }
      s.enemyProjectiles = s.enemyProjectiles.filter((ep) => !ep.dead)

      // Gefahren-Felder (Lava, Wasser, Säure) — sofortiger Tod bei Berührung,
      // ausser Regenbogen oder Feuerlöscher schützt. Schild blockt nicht.
      if (p.invincibleFrames === 0 && s.rainbowFrames === 0 && s.extinguisherFrames === 0) {
        for (const h of s.hazards) {
          if (rectsOverlap(pr, h)) {
            p.invincibleFrames = 60
            p.x = 60
            p.y = GROUND_Y - PLAYER_H
            p.vx = 0
            p.vy = 0
            p.slamming = false
            setLives((l) => Math.max(0, l - 1))
            break
          }
        }
      }

      // Ziel erreicht?
      const goalRect = {
        x: level.goal.x,
        y: level.goal.y,
        w: 40,
        h: 60,
      }
      if (!s.goalReached && rectsOverlap(pr, goalRect)) {
        s.goalReached = true
        if (levelIndex + 1 < LEVELS.length) {
          setStatus('won')
        } else {
          setStatus('finished')
        }
      }

      // Kamera folgt Spieler
      s.camera = Math.max(
        0,
        Math.min(p.x - VIEW_W / 2 + PLAYER_W / 2, level.width - VIEW_W)
      )

      force((n) => (n + 1) % 1000000)
      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [levelIndex, status, character, menuOpen])

  if (!stateRef.current) return null

  const level = LEVELS[levelIndex]
  const s = stateRef.current
  const p = s.player

  const nextLevel = () => {
    setStatus('playing')
    setStars(0)
    setScore(0)
    setLives(5)
    setLevelIndex((i) => i + 1)
  }

  // Modus-Trigger: charakter-abhängiger Spezial-Modus.
  // 🦄 Einhorn → Fliegen | 🐒 Alisa → Unsterblich | 🦙 Lama → Auto-Play | sonst → Auto-Play
  const triggerCharacterMode = () => {
    if (character === '🦄') {
      flyModeRef.current = !flyModeRef.current
      setFlyMode(flyModeRef.current)
    } else if (character === '🐒') {
      apeModeRef.current = !apeModeRef.current
      setApeMode(apeModeRef.current)
    } else {
      autoPlayRef.current = !autoPlayRef.current
      setAutoPlay(autoPlayRef.current)
      if (!autoPlayRef.current) {
        keysRef.current['ArrowRight'] = false
        keysRef.current['ArrowLeft'] = false
        keysRef.current[' '] = false
        keysRef.current['x'] = false
        keysRef.current['ArrowDown'] = false
      }
    }
  }

  const restartLevel = () => {
    setStatus('playing')
    setStars(0)
    setScore(0)
    setLives(5)
    setResetTrigger((t) => t + 1)
  }

  const skipLevel = () => {
    setStatus('playing')
    setStars(0)
    setScore(0)
    setLives(5)
    setLevelIndex((i) => Math.min(i + 1, LEVELS.length - 1))
  }

  const saveToSlot = (slotIdx) => {
    const data = {
      level: levelIndex,
      lives,
      coins: coinsCount,
      totalScore,
      character,
      timestamp: Date.now(),
    }
    const next = saveSlots.slice()
    next[slotIdx] = data
    setSaveSlots(next)
    try { localStorage.setItem('alisa-saves', JSON.stringify(next)) } catch (e) {}
  }

  const loadFromSlot = (slotIdx) => {
    const data = saveSlots[slotIdx]
    if (!data) return
    setMenuOpen(false)
    setStatus('playing')
    setStars(0)
    setScore(0)
    setLives(data.lives ?? 5)
    setCoinsCount(data.coins ?? 0)
    setTotalScore(data.totalScore ?? 0)
    setLevelIndex(data.level ?? 0)
    setResetTrigger((t) => t + 1)
  }

  const deleteSlot = (slotIdx) => {
    const next = saveSlots.slice()
    next[slotIdx] = null
    setSaveSlots(next)
    try { localStorage.setItem('alisa-saves', JSON.stringify(next)) } catch (e) {}
  }

  const jumpToLevel = (idx) => {
    if (idx < 0 || idx >= LEVELS.length) return
    setMenuOpen(false)
    setStatus('playing')
    setStars(0)
    setScore(0)
    setLives(5)
    setCoinsCount(0)
    setLevelIndex(idx)
    setResetTrigger((t) => t + 1)
  }

  const startCountdown = () => {
    let n = 3
    setCountdown(n)
    const tick = () => {
      n -= 1
      if (n <= 0) {
        setCountdown(0)
        setRotateGate(false)
      } else {
        setCountdown(n)
        setTimeout(tick, 700)
      }
    }
    setTimeout(tick, 700)
  }

  const toggleFullscreen = () => {
    const el = wrapperRef.current || document.documentElement
    if (!document.fullscreenElement) {
      el.requestFullscreen?.()
        .then(() => {
          // Auf Handy ins Querformat zwingen, falls möglich
          screen.orientation?.lock?.('landscape').catch(() => {})
        })
        .catch(() => {})
    } else {
      screen.orientation?.unlock?.()
      document.exitFullscreen?.()
    }
  }

  // Hilfs-Renderer für Touch-Buttons (drückt eine Taste solange gehalten)
  const touchProps = (key) => ({
    onPointerDown: (e) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture?.(e.pointerId)
      keysRef.current[key] = true
    },
    onPointerUp: (e) => {
      e.preventDefault()
      keysRef.current[key] = false
    },
    onPointerCancel: () => { keysRef.current[key] = false },
    onPointerLeave: () => { keysRef.current[key] = false },
    onContextMenu: (e) => e.preventDefault(),
  })

  const restart = () => {
    setStatus('playing')
    setStars(0)
    setScore(0)
    setTotalScore(0)
    setLives(5)
    setLevelIndex(0)
  }

  return (
    <div className="game-wrapper" ref={wrapperRef}>
      {rotateGate && (
        <div className="rotate-overlay">
          <div className="rotate-card">
            {countdown === 0 ? (
              <>
                <div className="rotate-emoji">📱↻</div>
                <h2>Bitte dreh dein Handy!</h2>
                <p>Das Spiel macht im Querformat mehr Spass. {character}</p>
                <button className="big-btn rotate-go-btn" onClick={startCountdown}>
                  Bereit! 🚀
                </button>
              </>
            ) : (
              <div className="countdown">{countdown}</div>
            )}
          </div>
        </div>
      )}
      <div className="hud">
        <div className="hud-item">🎯 Level {levelIndex + 1}: {level.name}</div>
        <div className="hud-item">⭐ {stars} / {level.stars.length}</div>
        <div className="hud-item">🪙 {coinsCount}</div>
        <div className="hud-item">💯 {score}</div>
        <div className="hud-item">❤️ {lives}</div>
        {autoPlay && (
          <div className="hud-item lama-badge">🦙 Lama-Modus</div>
        )}
        {apeMode && (
          <div className="hud-item ape-badge">🐵 Affen-Modus · Unsterblich</div>
        )}
        {flyMode && (
          <div className="hud-item fly-badge">🪽 Fliegen! (⬆️/⬇️ steuern)</div>
        )}
        {superJump > 0 && (
          <div className="hud-item super-jump">
            🍄 Super-Sprung! {Math.ceil(superJump / 60)}s
          </div>
        )}
        {power && (
          <div className={`hud-item power-badge power-${power}`}>
            {POWER_EMOJI[power]} {POWER_LABEL[power]}-Kraft! {Math.ceil(powerTime / 60)}s
          </div>
        )}
        {rainbowTime > 0 && (
          <div className="hud-item power-badge rainbow-badge">
            🌈 Regenbogen! {Math.ceil(rainbowTime / 60)}s
          </div>
        )}
        {shield && (
          <div className="hud-item power-badge shield-badge">
            🛡️ Schild aktiv
          </div>
        )}
        {bombShield > 0 && (
          <div className="hud-item power-badge bombshield-badge">
            🧙🛡️ Hexer-Schild: {bombShield}
          </div>
        )}
        {magnetTime > 0 && (
          <div className="hud-item power-badge magnet-badge">
            🧲 Magnet! {Math.ceil(magnetTime / 60)}s
          </div>
        )}
        {freezeTime > 0 && (
          <div className="hud-item power-badge freeze-badge">
            ⏰ Zeit-Stopp! {Math.ceil(freezeTime / 60)}s
          </div>
        )}
        {lightningTime > 0 && (
          <div className="hud-item power-badge lightning-badge">
            ⚡ Blitz! {Math.ceil(lightningTime / 60)}s
          </div>
        )}
        {featherTime > 0 && (
          <div className="hud-item power-badge feather-badge">
            🪶 Schweben! {Math.ceil(featherTime / 60)}s (⬆️ halten)
          </div>
        )}
        {skatesTime > 0 && (
          <div className="hud-item power-badge skates-badge">
            ⛸️ Schnell! {Math.ceil(skatesTime / 60)}s
          </div>
        )}
        {rocketTime > 0 && (
          <div className="hud-item power-badge rocket-badge">
            🚀 Mega-Sprung! {Math.ceil(rocketTime / 60)}s
          </div>
        )}
        {extinguisherTime > 0 && (
          <div className="hud-item power-badge extinguisher-badge">
            🧯 Lava-Schutz! {Math.ceil(extinguisherTime / 60)}s
          </div>
        )}
        {swordTime > 0 && (
          <div className="hud-item power-badge sword-badge">
            🗡️ Schwert! {Math.ceil(swordTime / 60)}s
          </div>
        )}
        <button className="fs-btn" onClick={toggleMusic} title="Musik">
          {musicOn ? '🔊' : '🔇'}
        </button>
        <button className="fs-btn" onClick={() => setMenuOpen(true)} title="Level-Menü (M)">
          📋
        </button>
        <button className="fs-btn" onClick={toggleFullscreen} title="Vollbild">
          {isFullscreen ? '🗗' : '🗖'}
        </button>
        <button className="exit-btn" onClick={onExit}>← Zurück</button>
      </div>

      {/* Globaler Pixel-Filter: macht alles im Spielfeld grobkörnig */}
      <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }} aria-hidden="true">
        <filter id="pixelate" x="0" y="0" width="100%" height="100%">
          <feFlood x="2" y="2" width="1" height="1" />
          <feComposite width="3" height="3" />
          <feTile result="a" />
          <feComposite in="SourceGraphic" in2="a" operator="in" />
          <feMorphology operator="dilate" radius="1.5" />
        </filter>
      </svg>

      <div className="viewport-wrapper">
      <div
        className="viewport"
        style={{ width: VIEW_W, height: VIEW_H, background: level.bgColor }}
      >
        {bombFlash > 0 && (
          <div className="bomb-flash" style={{ opacity: bombFlash / 24 }} />
        )}
        <div
          className="world"
          style={{
            width: level.width,
            height: VIEW_H,
            transform: `translateX(${-s.camera}px)`,
          }}
        >
          {/* Hintergrund-Dekoration je nach Thema */}
          <Decor decor={level.decor} width={level.width} />
          {/* Boden-Vegetation */}
          <BackgroundFlair decor={level.decor} width={level.width} />

          {/* Boden */}
          <div
            className="ground"
            data-decor={level.decor}
            style={{
              left: 0,
              top: GROUND_Y,
              width: level.width,
              height: VIEW_H - GROUND_Y,
            }}
          />

          {/* Gefahren-Felder (Lava / Wasser / Säure) */}
          {s.hazards.map((h, i) => (
            <div
              key={`hz${i}`}
              className={`hazard hazard-${h.type}`}
              style={{ left: h.x, top: h.y, width: h.w, height: h.h }}
            >
              <div className="hazard-surface" />
            </div>
          ))}

          {/* Plattformen */}
          {level.platforms.map((plat, i) => (
            <div
              key={i}
              className="platform"
              data-decor={level.decor}
              style={{
                left: plat.x,
                top: plat.y,
                width: plat.w,
                height: plat.h,
              }}
            />
          ))}

          {/* Mario-Style Hindernisse: Röhren, Mauern, Felsen */}
          {(level.obstacles || []).map((obs, i) => (
            <div
              key={`obs${i}`}
              className={`obstacle obstacle-${obs.type}`}
              style={{ left: obs.x, top: obs.y, width: obs.w, height: obs.h }}
            />
          ))}

          {/* Fragezeichen-Blöcke */}
          {s.blocks.map((block, i) => (
            <div
              key={`b${i}`}
              className={`block ${block.hit ? 'used' : ''}`}
              style={{
                left: block.x,
                top: block.y - (block.bumpFrames > 6 ? (12 - block.bumpFrames) * 2 : block.bumpFrames * 2),
                width: block.w,
                height: block.h,
              }}
            >
              {block.hit ? '' : character}
            </div>
          ))}

          {/* Sterne */}
          {s.stars.map((star, i) =>
            star.taken ? null : (
              <div
                key={`s${i}`}
                className="star"
                style={{ left: star.x, top: star.y }}
              >
                ⭐
              </div>
            )
          )}

          {/* Münzen */}
          {s.coins.map((coin, i) =>
            coin.taken ? null : (
              <div
                key={`c${i}`}
                className="coin"
                style={{ left: coin.x, top: coin.y }}
              >
                🪙
              </div>
            )
          )}

          {/* Items */}
          {s.items.map((item, i) =>
            item.taken ? null : (
              <div
                key={`i${i}`}
                className={`item item-${item.type}`}
                style={{ left: item.x, top: item.y }}
              >
                {ITEM_EMOJI[item.type]}
              </div>
            )
          )}

          {/* Feinde */}
          {s.enemies.map((e, i) => (
            <div
              key={`e${i}`}
              className={`enemy enemy-${e.type} ${s.freezeFrames > 0 ? 'frozen' : ''} ${e.hitFlash > 0 ? 'hit-flash' : ''}`}
              style={{
                left: e.x,
                top: e.y,
                transform: e.type === 'ghost' || e.type === 'dragon'
                  ? `scaleX(${e.dir > 0 ? -1 : 1})`
                  : undefined,
              }}
            >
              {ENEMY_EMOJI[e.type]}
            </div>
          ))}

          {/* Gegner-Projektile */}
          {s.enemyProjectiles.map((ep, i) => (
            <div
              key={`ep${i}`}
              className={`enemy-projectile ep-${ep.kind}`}
              style={{ left: ep.x, top: ep.y }}
            >
              {ENEMY_PROJECTILE_EMOJI[ep.kind] || ep.emoji}
            </div>
          ))}

          {/* Ziel-Flagge */}
          <div
            className="goal"
            style={{ left: level.goal.x, top: level.goal.y }}
          >
            🚩
          </div>

          {/* Projektile */}
          {s.projectiles.map((proj, i) => (
            <div
              key={`p${i}`}
              className={`projectile projectile-${proj.type}`}
              style={{ left: proj.x, top: proj.y }}
            >
              {proj.type === 'fire' ? '🔥' : '❄️'}
            </div>
          ))}

          {/* Hexer-Schild Blase (vor dem Spieler gezeichnet, damit die Katze obenauf bleibt) */}
          {s.bombShield > 0 && (
            <div
              className="bombshield-bubble"
              style={{ left: p.x - 14, top: p.y - 14 }}
            />
          )}

          {/* Schatten unter dem Spieler */}
          <div
            className="player-shadow"
            style={{
              left: p.x + PLAYER_W / 2 - 18,
              top: GROUND_Y - 4,
              opacity: p.onGround ? 0.5 : Math.max(0.15, 0.5 - (GROUND_Y - p.y - PLAYER_H) / 400),
            }}
          />

          {/* Pups-Wolken (Niki) */}
          {s.fartClouds && s.fartClouds.map((f, i) => (
            <div
              key={`fc${i}`}
              className="fart-cloud"
              style={{
                left: f.x,
                top: f.y,
                opacity: Math.max(0, f.life / 60),
                transform: `scale(${f.scale + f.age / 100})`,
              }}
            >
              💨
            </div>
          ))}

          {/* Spieler */}
          {(() => {
            const isNiki = character === '🦜'
            const nikiWobble = isNiki ? Math.sin(Date.now() / 90) * 10 : 0
            const idleBob = !isNiki && p.onGround && p.vx === 0 ? Math.sin(Date.now() / 400) * 0.04 : 0
            const runBob = p.onGround && p.vx !== 0 ? Math.sin(Date.now() / 80) * 0.06 : 0
            const scaleY = 1 + idleBob - Math.abs(runBob)
            // Emojis schauen meist nach links → bei facing=+1 (nach rechts) flippen
            const scaleX = (1 + Math.abs(runBob) * 0.5) * (-p.facing)
            const isRunning = p.onGround && p.vx !== 0
            // Charaktere bleiben pure Emojis — keine extra Beine/Schwanz mehr
            const showLegs = false
            return (
              <>
                <div
                  className={[
                    'player',
                    isNiki && 'niki',
                    p.invincibleFrames > 0 && 'hurt',
                    s.superJumpFrames > 0 && 'powered',
                    s.power && `power-${s.power}`,
                    p.spinFrames > 0 && 'spin',
                    p.slamming && 'slam',
                    s.rainbowFrames > 0 && 'rainbow',
                    s.shield && 'has-shield',
                    s.featherFrames > 0 && 'flying',
                    s.landFlashFrames > 0 && 'landed',
                  ].filter(Boolean).join(' ')}
                  style={{
                    left: p.x,
                    top: p.y,
                    transform: `scaleX(${scaleX}) scaleY(${scaleY}) rotate(${nikiWobble}deg)`,
                  }}
                >
                  {character}
                </div>
                {/* Ganzer Körper: 4 Hufe (Trab-Pattern) + Schwanz auf der Rück-Seite */}
                {showLegs && (() => {
                  const legY = p.y + PLAYER_H - 4
                  const tailRight = p.facing > 0 // läuft rechts → Schwanz hinten = links
                  return (
                    <>
                      {/* Schwanz: kleiner gebogener Strich an der hinteren Körperhälfte */}
                      <div
                        className={`player-tail ${isRunning ? 'wagging' : ''} ${tailRight ? 'tail-left' : 'tail-right'}`}
                        style={{
                          left: tailRight ? p.x - 8 : p.x + PLAYER_W,
                          top: p.y + PLAYER_H / 2 - 4,
                        }}
                      />
                      {/* 4 Hufe: vorne-aussen, vorne-innen, hinten-innen, hinten-aussen */}
                      {/* Trab-Pattern: 0+3 (FL+BR) gleichzeitig, 1+2 (FR+BL) gegenphasig */}
                      {[
                        { idx: 0, x: p.x + 4 },
                        { idx: 1, x: p.x + 12 },
                        { idx: 2, x: p.x + PLAYER_W - 20 },
                        { idx: 3, x: p.x + PLAYER_W - 12 },
                      ].map((leg) => {
                        const phase = (leg.idx === 0 || leg.idx === 3) ? 'phase-a' : 'phase-b'
                        return (
                          <div
                            key={`leg${leg.idx}`}
                            className={`player-leg ${isRunning ? `running ${phase}` : ''}`}
                            style={{ left: leg.x, top: legY }}
                          />
                        )
                      })}
                    </>
                  )
                })()}
              </>
            )
          })()}
          {p.slamming && (
            <div
              className="slam-trail"
              style={{ left: p.x, top: p.y + PLAYER_H, width: PLAYER_W }}
            />
          )}

          {s.bombShield > 0 && (
            <div
              className="bombshield-count"
              style={{ left: p.x + PLAYER_W / 2 - 14, top: p.y - 22 }}
            >
              {s.bombShield}
            </div>
          )}

          {/* Schwebende Punkte-Texte */}
          {s.floatingTexts.map((ft, i) => (
            <div
              key={`ft${i}`}
              className="floating-text"
              style={{
                left: ft.x,
                top: ft.y,
                color: ft.color,
                opacity: Math.max(0, 1 - ft.age / 50),
              }}
            >
              {ft.text}
            </div>
          ))}
        </div>
      </div>
      </div>

      {/* Touch-Steuerung für Handy */}
      <div className="touch-controls" aria-hidden="true">
        <div className="touch-pad-left">
          <button className="touch-btn touch-arrow" {...touchProps('ArrowLeft')}>◀</button>
          <button className="touch-btn touch-arrow" {...touchProps('ArrowRight')}>▶</button>
          <button
            className="touch-btn touch-menu-circle"
            onPointerDown={(e) => { e.preventDefault(); setMenuOpen(true) }}
            onContextMenu={(e) => e.preventDefault()}
            aria-label="Menü"
          >M</button>
        </div>
        <div className="touch-pad-center">
          <button
            className={`touch-btn touch-wizshield ${bombShield > 0 ? 'active' : ''}`}
            onPointerDown={(e) => {
              e.preventDefault()
              if (stateRef.current) stateRef.current.bombShield = 3
              setBombShield(3)
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            🧿{bombShield > 0 && <span className="touch-badge">{bombShield}</span>}
          </button>
          {/* Modus-Button: charakter-abhängig (Einhorn=Fly, Affe=Ape, sonst=Lama) */}
          <button
            className={`touch-btn touch-mode ${flyMode || apeMode || autoPlay ? 'active' : ''}`}
            onPointerDown={(e) => { e.preventDefault(); triggerCharacterMode() }}
            onContextMenu={(e) => e.preventDefault()}
            title="Spezial-Modus"
          >
            {character === '🦄' ? '🪽' : character === '🐒' ? '🐵' : '🦙'}
          </button>
        </div>
        <div className="touch-pad-right">
          <button className="touch-btn touch-shoot" {...touchProps('x')}>🔥</button>
          <button className="touch-btn touch-down" {...touchProps('ArrowDown')}>⬇️</button>
          <button className="touch-btn touch-jump" {...touchProps('ArrowUp')}>⬆️</button>
        </div>
      </div>

      <div className="controls-hint">
        ⬅️ ➡️ Laufen · ⬆️/Leertaste <strong>2× springen</strong> 💫 · ⬇️ Bodenstoss 💥 · <strong>X</strong> Schiessen 🔥❄️ · <strong>P</strong> Hexer-Schild 🧿 · <strong>9</strong> Neu starten 🔄 · <strong>A</strong> Level überspringen ⏭️
      </div>

      {status === 'won' && (
        <div className="overlay">
          <div className="overlay-card">
            <h2>🎉 Geschafft!</h2>
            <p>Du hast Level {levelIndex + 1} gewonnen!</p>
            <p>⭐ Sterne: {stars} / {level.stars.length}</p>
            <p>🪙 Münzen: {coinsCount}</p>
            <p>💯 Punkte gesamt: {totalScore}</p>
            <button className="big-btn" onClick={nextLevel}>
              Nächstes Level →
            </button>
          </div>
        </div>
      )}

      {status === 'finished' && (
        <div className="overlay">
          <div className="overlay-card">
            <h2>🏆 ALLE LEVELS GESCHAFFT!</h2>
            <p>Du bist eine echte Heldin!</p>
            <p>💯 Endstand: {totalScore} Punkte</p>
            <button className="big-btn" onClick={restart}>
              Nochmal spielen
            </button>
          </div>
        </div>
      )}

      {/* Level-Auswahl-Menü (M-Taste oder Touch-Button) */}
      {menuOpen && (
        <div className="level-menu-overlay" onClick={() => setMenuOpen(false)}>
          <div className="level-menu" onClick={(e) => e.stopPropagation()}>
            <h2>🎯 Level wählen</h2>
            <p className="level-menu-hint">
              Du hast {maxLevelUnlocked} {maxLevelUnlocked === 1 ? 'Level' : 'Levels'} freigespielt!
            </p>
            <div className="level-grid">
              {Array.from({ length: maxLevelUnlocked }, (_, i) => (
                <button
                  key={i}
                  className={`level-btn ${levelIndex === i ? 'current' : ''}`}
                  onClick={() => jumpToLevel(i)}
                >
                  <span className="level-num">{i + 1}</span>
                  <span className="level-name">{LEVELS[i].name}</span>
                </button>
              ))}
            </div>
            <h3 className="save-section-title">💾 Speicherstände</h3>
            <div className="save-grid">
              {saveSlots.map((slot, i) => (
                <div key={i} className="save-slot">
                  <div className="save-slot-info">
                    <strong>Slot {i + 1}</strong>
                    {slot ? (
                      <span>
                        Level {slot.level + 1} · {slot.character} · ❤️ {slot.lives} · 💯 {slot.totalScore}
                      </span>
                    ) : (
                      <span className="save-empty">— leer —</span>
                    )}
                  </div>
                  <div className="save-slot-actions">
                    <button className="save-btn save-write" onClick={() => saveToSlot(i)}>
                      💾 Speichern
                    </button>
                    {slot && (
                      <>
                        <button className="save-btn save-load" onClick={() => loadFromSlot(i)}>
                          ▶️ Laden
                        </button>
                        <button className="save-btn save-delete" onClick={() => deleteSlot(i)}>
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button className="menu-close-btn" onClick={() => setMenuOpen(false)}>
              Schliessen
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

// ----------------------------------------------------------------------
// Hintergrund-Dekoration je nach Theme
// ----------------------------------------------------------------------

const Decor = memo(function Decor({ decor, width }) {
  // Symbole im Hintergrund (zwischen Sky und Spielfeld)
  const sets = {
    meadow:    { symbols: ['☁️', '☁️', '🦋', '🌳', '🌻'], y: [50, 90, 140, 280, 380] },
    clouds:    { symbols: ['☁️', '☁️', '☁️', '☁️', '🌈'], y: [50, 90, 130, 60, 30] },
    mountains: { symbols: ['☁️', '🏔️', '🏔️', '⛰️', '🦅'], y: [50, 280, 220, 320, 130] },
    forest:    { symbols: ['🌲', '🌲', '🦉', '🍄', '🌙'], y: [240, 290, 130, 380, 40] },
    castle:    { symbols: ['🏰', '☁️', '🌋', '🔥', '🏯'], y: [220, 60, 280, 360, 240] },
    snow:      { symbols: ['❄️', '❄️', '❄️', '⛄', '🏔️'], y: [40, 90, 140, 360, 240] },
    sand:      { symbols: ['☀️', '🌵', '🐪', '🌵', '🦂'], y: [40, 360, 360, 340, 380] },
    cave:      { symbols: ['💎', '🦇', '💎', '🪨', '🪨'], y: [80, 100, 140, 360, 380] },
    stars:     { symbols: ['⭐', '🌟', '✨', '🪐', '🌙'], y: [60, 100, 80, 140, 50] },
    rainbow:   { symbols: ['🌈', '🦋', '🌟', '🌸', '🌈'], y: [60, 130, 90, 360, 100] },
    lava:      { symbols: ['🌋', '🔥', '🔥', '☄️', '💀'], y: [240, 360, 380, 80, 360] },
    swamp:     { symbols: ['🍄', '🌿', '🪲', '🐸', '🌳'], y: [380, 360, 380, 380, 280] },
  }
  const set = sets[decor] || sets.meadow
  // 7 Wiederholungen über die Levelbreite verteilt
  const items = []
  const count = 8
  for (let i = 0; i < count; i++) {
    const sym = set.symbols[i % set.symbols.length]
    const baseY = set.y[i % set.y.length]
    const x = Math.floor((i + 0.5) * (width / count) + ((i * 73) % 80) - 40)
    items.push({ sym, x, y: baseY, key: `dec${i}` })
  }
  return (
    <>
      {items.map((it) => (
        <div
          key={it.key}
          className="decor"
          style={{ left: it.x, top: it.y }}
        >
          {it.sym}
        </div>
      ))}
    </>
  )
})

const BackgroundFlair = memo(function BackgroundFlair({ decor, width }) {
  // Boden-Pflänzchen / kleine Akzente direkt am Boden
  const sets = {
    meadow:    ['🌱', '🌷', '🌼'],
    clouds:    ['☁️', '🌟'],
    mountains: ['🪨', '🌿'],
    forest:    ['🍄', '🌿', '🍃'],
    castle:    ['🔥', '🪨'],
    snow:      ['❄️', '🌨️'],
    sand:      ['🌵', '🦴'],
    cave:      ['🪨', '💎'],
    stars:     ['✨', '⭐'],
    rainbow:   ['🌈', '🌸', '🌟'],
    lava:      ['🔥', '💀'],
    swamp:     ['🌿', '🍄'],
  }
  const symbols = sets[decor] || sets.meadow
  const count = Math.floor(width / 180)
  const items = []
  for (let i = 0; i < count; i++) {
    const sym = symbols[i % symbols.length]
    const x = Math.floor((i + 0.3) * (width / count) + ((i * 41) % 60) - 30)
    items.push({ sym, x, key: `flair${i}` })
  }
  return (
    <>
      {items.map((it) => (
        <div
          key={it.key}
          className="bg-flair"
          style={{ left: it.x, top: 408 }}
        >
          {it.sym}
        </div>
      ))}
    </>
  )
})
