# Mobile interaction regression

Run `npx playwright install chromium` once, then `npm run test:mobile`.
Set `PLAYWRIGHT_CHROMIUM_PATH` only when using an existing Chromium binary.

The suite exercises the real OutfitBuilder/Keen/Konva code at 390×844,
393×852 and 430×932 with nine processed torso PNGs, slow/fast touch flicks,
unchanged images and slide nodes, no media requests during gestures, snap
stability, equal placed dimensions, corner pinning, all three favorite types,
panel selection, the 63/37 layout, view preference and PWA reload.

The fixture is generated temporarily by `scripts/mobile-server.mjs` and is
removed when the server exits. No test route is shipped in the production build.
Media and favorite HTTP responses are mocked; the fixture models persistent
favorites across reload. Separate Vitest tests check the favorite API's owner
scope, authentication, origin, input validation and explicit boolean updates.
These tests do not certify PostgreSQL persistence, Safari behavior, actual
60 fps on an iPhone, or production deployment. CDP's headless Touch.screenX/Y
are normalized to contact coordinates in the test browser only.
