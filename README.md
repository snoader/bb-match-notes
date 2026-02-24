# BB Match Notes

PWA zum schnellen Mitschreiben von Blood Bowl Spielen.

## Ziel
Während eines Spiels schnell Ereignisse loggen und danach einen sauberen Match Report haben.

## MVP Features
- Touchdowns
- Casualties
- Kickoff Events
- Inducements
- Prayers to Nuffle
- Turn Tracker
- Rerolls / Apo / Bribes Tracking
- Export als Text / JSON

## Tech Stack
- React
- TypeScript
- Vite
- IndexedDB (Dexie)
- Zustand
- PWA (vite-plugin-pwa)
- Hosting: Cloudflare Pages

## Development

Install:
```bash
npm instal


## Security / Tooling
- [ ] npm audit: minimatch ReDoS advisory via ESLint toolchain (dev-dependency). Fix later with controlled ESLint upgrade (avoid `npm audit fix --force`).l
