# 🐱 Alysas Hüpf-Abenteuer

Ein Plattform-Spiel mit 100 Levels, 13 Tier-Charakteren, einem pupsenden Papagei namens Niki, Power-Ups, schiessenden Hexern, fliegenden Drachen und mehr.

Gebaut von **Alysa (9)** zusammen mit Claude Code.

**🌐 Live: https://alisa-spiel.vercel.app**

## 🎮 Steuerung (Schnellübersicht)

- **Pfeiltasten** — Laufen
- **⬆️ / Leertaste** — Springen (zweimal für Doppelsprung)
- **⬇️ in der Luft** — Bodenstoss
- **X** — Feuerball / Eiskristall schiessen
- **P** — Hexer-Schild auffüllen
- **9** — Level neu starten · **A** — Level überspringen
- **Handy:** Touch-Buttons unten + Querformat empfohlen

## ✨ Features

- **100 Levels** in 10 thematischen Welten
- **13 Charaktere** (alle Tiere, inkl. Niki dem pupsenden Papagei)
- **Fragezeichen-Blöcke** ❓ mit 15 verschiedenen Items
- **11 Gegnertypen** mit Trefferpunkte-System (von einfachem Käfer bis zum 3-HP Oger)
- **Mobile-tauglich** mit Touch-Steuerung und Vollbild
- **Pixel-Art-Look** mit Press Start 2P / Silkscreen Fonts
- **8-Bit Hintergrundmusik** (Web Audio API)

## 📖 Komplette Doku

Alle Mechaniken, Items, Gegner, Welten, Konstanten und Architektur-Details stehen in **[`game-design.md`](./game-design.md)**.

Hinweise für Claude beim Weiterarbeiten: **[`CLAUDE.md`](./CLAUDE.md)**.

## 🛠️ Lokal entwickeln

```bash
pnpm install
pnpm dev          # Dev-Server auf http://localhost:5173
pnpm build        # Production-Build
```

Stack: React 19 · Vite 8 · plain CSS · pnpm
