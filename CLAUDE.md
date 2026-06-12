# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PWA (Progressive Web App) for motel room management ("Motel Mil Amores"). Tracks room occupancy, check-ins/check-outs, expenses, and generates financial reports. UI is entirely in Spanish. No build system — static files served directly.

## Development

No build step, no package manager, no test suite. All dependencies are loaded from CDNs (Supabase, SweetAlert2, Chart.js, jsPDF, Animate.css). Edit files and test directly in the browser.

To run locally, serve with any HTTP server (e.g., `python -m http.server 8080` or Live Server in VS Code). HTTPS is required for the Service Worker / PWA features.

When changing the Service Worker cache strategy or cached assets, increment the cache version in `sw.js` (currently `motel-v6`) to force clients to update.

## Architecture

### Pages and Responsibilities
- `index.html` + `app.js` — Main room dashboard: room grid, check-in/check-out, real-time sync
- `dashboard.html` — Analytics: 4-month trend chart + 5-day bar chart (Chart.js)
- `consultar-dia.html` — Daily report and bulk checkout processing
- `gestion.html` — Guest history with manual entry/editing
- `gastos.html` — Monthly expense tracking CRUD
- `reportes.html` — Date-range financial reports with PDF export
- `login.html` — Supabase Auth (session-based)
- `calculadora/` — Standalone time-to-cost calculator tool

`app.js` (1435 lines) contains all core logic: auth guard, room state management, pricing, modal dialogs, real-time subscriptions, PDF generation, and chart rendering. All pages use this same file.

### Backend (Supabase)

The Supabase URL and publishable key are hardcoded in `login.html` and `app.js`. The database has three main tables:

- `habitaciones`: `id`, `nro_pieza` (room number), `estado` ('limpia' | 'sucia' | 'ocupada')
- `registros`: `id`, `habitacion_id`, `entrada` (ISO timestamp), `salida` (ISO timestamp), `monto_total`, `pago_adelantado`, `ac` (boolean)
- `gastos`: `id`, `fecha`, `nombre`, `precio`

Real-time subscriptions use channels `cambios-habitaciones` and `cambios-registros` (see `app.js:983-984`).

### Pricing Logic (`app.js:634–655`)

- **With A/C**: 35 Bs for ≤76 min; 30 Bs/hour + partial-hour surcharge beyond that
- **Without A/C**: 30 Bs for the first hour; 20 Bs/hour + partial-hour surcharge beyond that

### Key Patterns

- **All UI operations use `<dialog>` modals** — no page navigation for CRUD actions.
- **Dark mode** is toggled via a CSS class on `<body>` and persisted in `localStorage`.
- **Session recovery**: a `visibilitychange` listener in `app.js` re-fetches room data when the device screen wakes up, to handle long idle periods.
- **PDF export** uses jsPDF + jsPDF AutoTable; chart rendering uses Chart.js; alert dialogs use SweetAlert2.

### PWA / Service Worker (`sw.js`)

- Cache name: `motel-v6` (increment when pushing breaking cache changes)
- Images: cache-first strategy
- HTML/JS/CSS: network-first (always tries to fetch fresh, falls back to cache)
