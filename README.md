# PWD Data Collection & Reporting — React Frontend

A modern React (Vite) rewrite of the PWD **प्रपत्र-ब** data-collection SPA. It is a
**frontend-only** replacement: it talks to your **existing ASP.NET Core backend
unchanged**, using the exact same API endpoints, request/response shapes,
authentication (HttpOnly cookie), validations, workflow, and screens. Only the
UI technology and styling were upgraded.

## What stayed identical

- Every screen and the navigation/role model (Super Admin vs Circle Officer).
- All API endpoints and payloads (see `src/api/client.js` — a direct port of the
  original `api.js`).
- Login via cookie auth, logout, 401 → "session expired" handling.
- Dynamic template fields, computer-ID → scheme auto-fill, auto-remaining
  (`estimatedCost − expByMarch2026`).
- Excel template generation (ExcelJS), Excel upload parsing + all validation
  rules (SheetJS), View-data Excel/PDF export, Reports Excel export.
- District/circle master data, English/Marathi resolution, aliases, and the
  English→Marathi field-name transliteration (`src/lib/`).

## Prerequisites

- Node.js 18+ and npm.
- Your backend running on the **https** profile (`https://localhost:7167`).

## Run

```bash
npm install
npm run dev
```

Then open **http://localhost:5500**.

### Why port 5500?

The backend sends the auth cookie as `SameSite=None; Secure` and its CORS policy
only allows the origins `http://localhost:5500` and `http://127.0.0.1:5500`
(the ports the original Live Server prototype used). To connect **without any
backend change**, this app's dev server is pinned to port **5500** in
`vite.config.js`. Keep the backend on the https profile so the secure cookie is
accepted.

If you must use a different port/host, add it to `WithOrigins(...)` in the
backend's `Program.cs` and update `vite.config.js` accordingly.

## Configuration

The backend URL defaults to `https://localhost:7167`. To override, copy
`.env.example` to `.env` and set `VITE_API_BASE_URL`.

## Build

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build on port 5500
```

## Project structure

```
src/
  api/client.js          Backend client (ported from api.js)
  lib/
    seed.js              Districts, circles, EN names, aliases, defaults
    helpers.js           District resolution, dedupe, scheme lookup, dates
    translit.js          English → Marathi field-name transliteration
    excel.js             ExcelJS template + Excel exporters
    usePageData.js       Per-screen load / 401 / error lifecycle
  context/
    AppContext.jsx       Auth + shared caches + loaders (the old globals)
    ToastContext.jsx     Toasts
  components/
    Layout.jsx           Sidebar + topbar (role-based nav, mobile drawer)
    Modal.jsx            Reusable modal
    ChartCanvas.jsx      Chart.js wrapper
  pages/                 One file per screen
    Login, Dashboard, Users, DataForm, Template,
    ComputerIds, Upload, ViewData, Reports
```
