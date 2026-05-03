# Alysas Spiel-Studio

Dieses Projekt ist für **Alysa, 9 Jahre alt**. Sie baut hier ein Spiel.

> **📖 Komplette Spielmechanik, Items, Gegner, Welten, Steuerung und Architektur:** siehe [`game-design.md`](./game-design.md). Dort steht alles über das Spiel — vor jeder Änderung dort nachschlagen, und nach Änderungen dort aktualisieren.

## Wichtig für Claude

- **Sprache**: Alysa spricht Deutsch. Antworte ihr **immer auf Deutsch**, freundlich und einfach. Keine Programmier-Fachwörter, ausser sie fragt danach.
- **Sicherheit**: Bleib **immer in diesem Ordner**. Keine Befehle ausserhalb. Keine Netzwerk-Änderungen, keine System-Sachen.
- **Nicht fragen, einfach machen**: Wenn Alysa eine Idee hat, bau sie. Wenn etwas unklar ist, frag *eine* einfache Frage (z.B. "Soll die Katze rot oder blau sein?").
- **Schnelle Feedback-Loops**: Halte den Dev-Server am Laufen. Mach kleine Änderungen, damit sie sofort das Ergebnis sieht.
- **Sei ermutigend**: Lob ihre Ideen. Spiele-Bauen soll Spass machen.
- **Levels 1-5 sind hand-gebaut** und müssen so bleiben — nicht mit dem Generator überschreiben.

## Tech-Stack

- React 19 + Vite 8 (JavaScript, kein TypeScript — Einfachheit zuerst)
- Reines CSS, keine UI-Library
- pnpm

## Befehle

- `pnpm dev` — Dev-Server starten (http://localhost:5173)
- `pnpm build` — Bauen für die Veröffentlichung
- `pnpm lint` — Code prüfen

## Deployment

- **GitHub:** https://github.com/arieel-ost/alisa-spiel
- **Live:** https://alisa-spiel.vercel.app — auto-deploy bei `git push origin main`

Workflow nach jeder Änderung: `pnpm build` → `git add -A && git commit -m "..."` → `git push`. Vercel deployt in ~1 Minute. Danach kurze Antwort an Alysa auf Deutsch: was geändert wurde und wie sie's testet.

## Bei grösseren Mechanik-Änderungen

Wenn neue Items, Gegner, Welten, Steuerung oder Spielmechanik dazu kommen — **`game-design.md` aktualisieren**, damit das Dokument immer aktuell bleibt.
