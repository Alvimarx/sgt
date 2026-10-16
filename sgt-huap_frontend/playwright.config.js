// Pruebas end-to-end y visuales del frontend (Playwright).
//
// Requisitos: el ambiente local arriba (docker-compose.local.yml: db + backend
// con el seed de desarrollo y fechas relativas) y el frontend sirviéndose en
// SGT_BASE_URL (por defecto `npm run dev` en localhost:5173, que proxyea /api al
// backend). Ojo: localhost y no 127.0.0.1, que es el origen que permite el
// CORS del backend local (CORS_ALLOWED_ORIGINS en .env.local).
//
//   npx playwright test                       # todo
//   npx playwright test --project=movil       # solo el layout móvil
//
// Navegador: por defecto el Chromium que descarga Playwright
// (`npx playwright install chromium`). Para usar uno ya instalado en el
// sistema: PW_CHROMIUM_PATH=/usr/bin/chromium npx playwright test
import { defineConfig } from '@playwright/test';

const baseURL = process.env.SGT_BASE_URL || 'http://localhost:5173';
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.001 },
  },
  // El backend es uno solo y las pruebas cambian datos: una a la vez.
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],
  outputDir: 'e2e-results',
  snapshotPathTemplate: '{testDir}/__pantallas__/{projectName}/{arg}{ext}',
  use: {
    baseURL,
    locale: 'es-CL',
    timezoneId: 'America/Santiago',
    launchOptions: { executablePath },
    trace: 'retain-on-failure',
  },
  projects: [
    // Celular: bajo 600 px la app ocupa toda la pantalla (sin el "teléfono").
    { name: 'movil', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    // Monitores típicos de un servicio clínico.
    { name: 'desktop', use: { viewport: { width: 1366, height: 768 } } },
    { name: 'desktop-fhd', use: { viewport: { width: 1920, height: 1080 } } },
  ],
});
