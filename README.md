# Run Tracker — Sub-50 Project

A personal running dashboard that tracks the journey from **8:00/km → 5:00/km** (sub-50 min 10 k). Upload WHOOP recovery data and Strava activities, then watch your pace, sleep, and training load trend over time.

## Features

- **Dashboard** — live stats: current week, best pace, WHOOP recovery score, weekly km, and pace milestone progress
- **Analytics** — interactive charts for pace trends, weekly volume, HRV/recovery, sleep stages, and workout heart-rate zones (4 w / 3 m / all-time range selector)
- **Weekly Checklist** — structured 7-day training plan (runs, swims, strength, mobility) with per-session tick-off and week navigation
- **CSV Upload** — drag-and-drop imports for:
  - WHOOP `physiological_cycles.csv` (recovery, HRV, RHR, sleep stages, SpO2, strain)
  - WHOOP `workouts.csv` (activity strain, HR zones, calories)
  - Strava `activities.csv` (distance, pace, heart rate)
- **Backup & Restore** — export all data as a JSON backup; restore on any device
- **Dark / Light mode** — system-aware theme toggle
- **No account required** — all data lives in your browser's localStorage

## Tech Stack

- [Next.js 14](https://nextjs.org/) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) components
- [Recharts](https://recharts.org/) for data visualisation
- [PapaParse](https://www.papaparse.com/) for CSV parsing
- [next-themes](https://github.com/pacocoursey/next-themes) for dark mode

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Data Sources

| Source | File to export | Where to find it |
|---|---|---|
| WHOOP Recovery & Sleep | `physiological_cycles.csv` | WHOOP app → Account → Export Data |
| WHOOP Workouts | `workouts.csv` | WHOOP app → Account → Export Data |
| Strava Activities | `activities.csv` | Strava → Settings → My Account → Download or Delete Your Data |

## Training Structure

The plan is split into four phases with pace milestones along the way:

| Phase | Weeks | Focus |
|---|---|---|
| Phase 1 · Rebuild | 1–2 | Re-establish base, easy effort only |
| Phase 2 · Base | 3–10 | Aerobic base, weekly long run build |
| Phase 3 · Speed | 11–24 | Intervals + tempo work |
| Phase 4 · Sharpen | Month 7–15 | Race-pace sessions, taper |

**Pace milestones:** 8:00 → 7:00 → 6:30 → 6:00 → 5:30 → **5:00/km**

## Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm run start    # production server
npm run lint     # ESLint
```
