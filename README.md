# Merkio – Web-App (PWA)

Progressive Web App von **Merkio** – gemeinsame Listen (Einkauf, To-dos, Notizen) in Echtzeit. Volle Parität zur Android-App, läuft im Browser und ist installierbar.

**Live:** https://app.merkio.de · Backend: https://api.merkio.de · Landing: https://merkio.de

## Tech Stack

- **React 19 + Vite**
- **TanStack Query** (Daten/Caching) + **react-router-dom**
- **Tailwind CSS v4** (Dark Mode über CSS-Variablen unter `.dark`)
- **react-i18next** (DE/EN/FR)
- **Tiptap** (WYSIWYG-Notiz-Editor)
- **vite-plugin-pwa** (Service Worker, installierbar)
- **@sentry/react** (Fehler-Tracking, DSN-gesteuert)

## Features

- Gruppen, Listen (Einkauf/To-do/Notizen), Items, Märkte, Mitgliederverwaltung
- Echtzeit-Sync über SSE (`/lists/:id/events`, Token als Query-Param)
- **Dark Mode** – System + manueller Umschalter (Einstellungen → Darstellung)
- **Feedback** – Sterne (1–5) + Kommentar (Einstellungen → Feedback) → `POST /feedback`
- „Neue Gruppe" jederzeit über die Seitenleiste
- Mehrsprachig DE/EN/FR

## Entwicklung

```bash
npm install
npm run dev        # Dev-Server (Vite)
npm run build      # Produktions-Build nach dist/
npm run preview    # Build lokal testen
```

## Umgebungsvariablen (Build-Zeit)

- `VITE_API_URL` — Basis-URL der API (Prod: `https://api.merkio.de/api/v1`)
- `VITE_SENTRY_DSN` — Sentry-DSN; wenn gesetzt, wird Fehler-Tracking aktiviert (ohne DSN per Tree-Shaking nicht im Bundle)

## Deployment

GitHub Actions ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) baut bei Push auf `main` und deployt nach **GitHub Pages** (Custom Domain `app.merkio.de`, CNAME).

- `VITE_API_URL` ist im Workflow fest gesetzt.
- `VITE_SENTRY_DSN` kommt aus dem gleichnamigen GitHub-**Secret** (Repo → Settings → Secrets and variables → Actions). Nach dem Anlegen einmal neu deployen, damit der Build es übernimmt.
