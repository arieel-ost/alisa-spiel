import { useEffect, useRef, useState } from 'react'
import { LEVELS } from './levels'
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
}

const ENEMY_PROJECTILE_EMOJI = {
  bolt: '🔮',
  fireball: '🔥',
}

const ITEM_EMOJI = {
  diamond: '💎',
  heart: '❤️',
  mushroom: '🍄',
  fire: '🔥',
  ice: '❄️',
  rainbow: '🌈',
  shield: '🛡️',
  feather: '🪶',
  crown: '👑',
}

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

export default function Game({ onExit }) {
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
  const [status, setStatus] = useState('playing') // playing | won | lost | finished
  const [, force] = useState(0)
  const [resetTrigger, setResetTrigger] = useState(0)

  const stateRef = useRef(null)
  const keysRef = useRef({})
  const animRef = useRef(null)
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
      blocks: level.blocks.map((b) => ({
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
      enemies: level.enemies.map((e) => ({
        ...e,
        startX: e.x,
        startY: e.y,
        dir: 1,
        bobPhase: Math.random() * Math.PI * 2,
        shootTimer: 60 + Math.floor(Math.random() * 60),
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

  // Tastatur
  useEffect(() => {
    const down = (e) => {
      keysRef.current[e.key] = true
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'x', 'X', 's', 'S'].includes(e.key)) {
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
    if (!stateRef.current) return

    const level = LEVELS[levelIndex]

    const tick = () => {
      const s = stateRef.current
      const p = s.player
      const keys = keysRef.current

      // Bewegung links/rechts (gesperrt während Bodenstoss)
      if (p.slamming) {
        p.vx = 0
      } else if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
        p.vx = -MOVE_SPEED
        p.facing = -1
      } else if (keys['ArrowRight'] || keys['d'] || keys['D']) {
        p.vx = MOVE_SPEED
        p.facing = 1
      } else {
        p.vx = 0
      }

      // Springen (Doppelsprung) — nur bei Tasten-Druck (Edge), nicht beim Halten
      const jumpKeyDown = !!(keys['ArrowUp'] || keys[' '] || keys['w'] || keys['W'])
      if (jumpKeyDown && !s.prevJumpKey && p.jumpsLeft > 0 && !p.slamming) {
        const power = s.superJumpFrames > 0 ? SUPER_JUMP_POWER : JUMP_POWER
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

      // Schwerkraft
      p.vy += GRAVITY

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

      const solids = [...level.platforms, ...s.blocks]
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

      for (const plat of level.platforms) {
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

      // Sterne einsammeln
      for (const star of s.stars) {
        if (!star.taken) {
          const sr = { x: star.x, y: star.y, w: STAR_SIZE, h: STAR_SIZE }
          if (rectsOverlap(pr, sr)) {
            star.taken = true
            setStars((n) => n + 1)
            setScore((n) => n + 1)
            setTotalScore((n) => n + 1)
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
            for (const plat of [...level.platforms, ...s.blocks]) {
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
            } else if (item.type === 'heart') {
              setLives((l) => l + 1)
            } else if (item.type === 'mushroom') {
              s.superJumpFrames = SUPER_JUMP_DURATION
              setSuperJump(SUPER_JUMP_DURATION)
            } else if (item.type === 'fire' || item.type === 'ice') {
              s.power = item.type
              s.powerFrames = POWER_DURATION
              setPower(item.type)
              setPowerTime(POWER_DURATION)
            } else if (item.type === 'rainbow') {
              s.rainbowFrames = RAINBOW_DURATION
              setRainbowTime(RAINBOW_DURATION)
            } else if (item.type === 'shield') {
              s.shield = true
              setShield(true)
            } else if (item.type === 'feather') {
              s.featherFrames = FEATHER_DURATION
              setFeatherTime(FEATHER_DURATION)
            } else if (item.type === 'crown') {
              setScore((n) => n + 10)
              setTotalScore((n) => n + 10)
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

      // Schiessen
      if (s.shootCooldown > 0) s.shootCooldown -= 1
      const shootKey = keys['x'] || keys['X'] || keys['Shift']
      if (shootKey && s.shootCooldown === 0 && s.power) {
        s.shootCooldown = SHOOT_COOLDOWN
        s.projectiles.push({
          type: s.power,
          x: p.x + (p.facing > 0 ? PLAYER_W : -PROJECTILE_SIZE),
          y: p.y + 10,
          vx: PROJECTILE_SPEED * p.facing,
          life: 90,
        })
      }

      // Projektile bewegen + Kollision
      for (const proj of s.projectiles) {
        proj.x += proj.vx
        proj.life -= 1
        const pjr = { x: proj.x, y: proj.y, w: PROJECTILE_SIZE, h: PROJECTILE_SIZE }

        // Soliden Hindernissen ausweichen
        for (const solid of [...level.platforms, ...s.blocks]) {
          if (rectsOverlap(pjr, solid)) {
            proj.dead = true
            break
          }
        }

        // Feinde treffen
        if (!proj.dead) {
          for (const e of s.enemies) {
            const er = { x: e.x, y: e.y, w: ENEMY_W, h: ENEMY_H }
            if (rectsOverlap(pjr, er) && !e.dead) {
              e.dead = true
              proj.dead = true
              setScore((n) => n + 2)
              setTotalScore((n) => n + 2)
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

      // Feinde bewegen + Kollision + Schiess-AI
      for (const e of s.enemies) {
        if (e.type === 'bat') {
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
        } else {
          // Monster: normal
          e.x += e.dir * 1.2
          if (e.x > e.startX + e.range) e.dir = -1
          if (e.x < e.startX - e.range) e.dir = 1
        }

        const er = { x: e.x, y: e.y, w: ENEMY_W, h: ENEMY_H }
        if (rectsOverlap(pr, er)) {
          // Bodenstoss besiegt JEDEN Gegner aus jeder Richtung
          if (p.slamming) {
            e.dead = true
            setScore((n) => n + 3)
            setTotalScore((n) => n + 3)
            continue
          }
          // Regenbogen-Power: Gegner einfach durchrennen (sterben)
          if (s.rainbowFrames > 0) {
            e.dead = true
            setScore((n) => n + 2)
            setTotalScore((n) => n + 2)
            continue
          }
          // Drauf-Springen besiegt JEDEN Gegner (auch Geister, Hexer, Drachen, Fledermäuse)
          if (p.vy > 2 && p.y + PLAYER_H - p.vy <= e.y + 6) {
            e.dead = true
            p.vy = -10
            setScore((n) => n + 2)
            setTotalScore((n) => n + 2)
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
            setLives((l) => {
              const nl = l - 1
              if (nl <= 0) {
                restartLevel()
                return 5
              }
              return nl
            })
          }
        }
      }
      s.enemies = s.enemies.filter((e) => !e.dead)

      // Gegner-Projektile bewegen + Kollision
      for (const ep of s.enemyProjectiles) {
        ep.x += ep.vx
        ep.y += ep.vy
        ep.life -= 1
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
            setLives((l) => {
              const nl = l - 1
              if (nl <= 0) {
                restartLevel()
                return 5
              }
              return nl
            })
          }
        } else if (rectsOverlap(pr, epr) && s.rainbowFrames > 0) {
          ep.dead = true // Regenbogen löst Geschosse auf
        }

        // Soliden Hindernissen ausweichen
        if (!ep.dead) {
          for (const solid of [...level.platforms, ...s.blocks]) {
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
  }, [levelIndex, status])

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

  const restartLevel = () => {
    setStatus('playing')
    setStars(0)
    setScore(0)
    setLives(5)
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
                <p>Das Spiel macht im Querformat mehr Spass. 🐱</p>
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
        {featherTime > 0 && (
          <div className="hud-item power-badge feather-badge">
            🪶 Schweben! {Math.ceil(featherTime / 60)}s (⬆️ halten)
          </div>
        )}
        <button className="fs-btn" onClick={toggleFullscreen} title="Vollbild">
          {isFullscreen ? '🗗' : '🗖'}
        </button>
        <button className="exit-btn" onClick={onExit}>← Zurück</button>
      </div>

      <div className="viewport-wrapper">
      <div
        className="viewport"
        style={{ width: VIEW_W, height: VIEW_H, background: level.bgColor }}
      >
        <div
          className="world"
          style={{
            width: level.width,
            height: VIEW_H,
            transform: `translateX(${-s.camera}px)`,
          }}
        >
          {/* Hintergrund-Wolken */}
          <div className="cloud" style={{ left: 100, top: 60 }}>☁️</div>
          <div className="cloud" style={{ left: 500, top: 100 }}>☁️</div>
          <div className="cloud" style={{ left: 900, top: 50 }}>☁️</div>
          <div className="cloud" style={{ left: 1300, top: 90 }}>☁️</div>
          <div className="cloud" style={{ left: 1700, top: 70 }}>☁️</div>

          {/* Boden */}
          <div
            className="ground"
            style={{
              left: 0,
              top: GROUND_Y,
              width: level.width,
              height: VIEW_H - GROUND_Y,
            }}
          />

          {/* Plattformen */}
          {level.platforms.map((plat, i) => (
            <div
              key={i}
              className="platform"
              style={{
                left: plat.x,
                top: plat.y,
                width: plat.w,
                height: plat.h,
              }}
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
              {block.hit ? '' : '?'}
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
              className={`enemy enemy-${e.type}`}
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
              {ENEMY_PROJECTILE_EMOJI[ep.kind]}
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

          {/* Spieler */}
          <div
            className={[
              'player',
              p.invincibleFrames > 0 && 'hurt',
              s.superJumpFrames > 0 && 'powered',
              s.power && `power-${s.power}`,
              p.spinFrames > 0 && 'spin',
              p.slamming && 'slam',
              s.rainbowFrames > 0 && 'rainbow',
              s.shield && 'has-shield',
              s.featherFrames > 0 && 'flying',
            ].filter(Boolean).join(' ')}
            style={{
              left: p.x,
              top: p.y,
              transform: `scaleX(${p.facing})`,
            }}
          >
            🐱
          </div>
          {p.slamming && (
            <div
              className="slam-trail"
              style={{ left: p.x, top: p.y + PLAYER_H, width: PLAYER_W }}
            />
          )}
        </div>
      </div>
      </div>

      {/* Touch-Steuerung für Handy */}
      <div className="touch-controls" aria-hidden="true">
        <div className="touch-pad-left">
          <button className="touch-btn touch-arrow" {...touchProps('ArrowLeft')}>◀</button>
          <button className="touch-btn touch-arrow" {...touchProps('ArrowRight')}>▶</button>
        </div>
        <div className="touch-pad-right">
          <button className="touch-btn touch-shoot" {...touchProps('x')}>🔥</button>
          <button className="touch-btn touch-down" {...touchProps('ArrowDown')}>⬇️</button>
          <button className="touch-btn touch-jump" {...touchProps('ArrowUp')}>⬆️</button>
        </div>
      </div>

      <div className="controls-hint">
        ⬅️ ➡️ Laufen · ⬆️ / Leertaste <strong>2× springen</strong> 💫 · ⬇️ Bodenstoss 💥 · <strong>X</strong> Schiessen 🔥❄️ · <strong>9</strong> Level neu starten 🔄
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

    </div>
  )
}
