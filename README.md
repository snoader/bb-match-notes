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

```bash
npm install
npm run dev
```

## Testing

```bash
npm run test:unit
npm run test:unit:watch
npm run test:e2e
npm run test:e2e:ui
```

E2E tests build and run against the preview server via Playwright config (`VITE_E2E=1`).

## Security / Tooling
- [ ] npm audit: minimatch ReDoS advisory via ESLint toolchain (dev-dependency). Fix later with controlled ESLint upgrade (avoid `npm audit fix --force`).
