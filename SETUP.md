# Run Tracker — Setup with Claude Code

## 1. Unzip this project
Unzip `run-tracker.zip` into a folder on your machine, e.g.:
```bash
unzip run-tracker.zip
cd run-tracker
```

## 2. Open with Claude Code
From inside that folder, just run:
```bash
claude
```
Claude Code will detect the Next.js project automatically. You can then ask it to:
- "install dependencies and run the dev server"
- "deploy this to Vercel"
- add new features, fix bugs, restyle pages, etc.

## 3. Install & run locally (if you want to do it yourself first)
```bash
npm install
npm run dev
```
Visit http://localhost:3000

## 4. Deploy to Vercel
```bash
npx vercel        # first deploy — follow login prompts
npx vercel --prod # subsequent production deploys
```

## Project structure
```
run-tracker/
├── app/
│   ├── page.tsx          → Dashboard
│   ├── checklist/         → Weekly training checklist
│   ├── upload/             → WHOOP/Strava CSV upload
│   ├── analytics/          → Pace & recovery charts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   └── Nav.tsx
├── lib/
│   ├── types.ts            → Training plan data + types
│   ├── parsers.ts          → WHOOP/Strava CSV parsers
│   └── store.ts             → localStorage persistence
├── package.json
└── ...config files
```

## Notes
- All data is stored in browser localStorage — no backend/database needed.
- WHOOP CSV: export from WHOOP app → Account → Export Data
- Strava CSV: Settings → My Account → Download or Delete Your Data → activities.csv
- Pace milestones (8:00 → 5:00 /km) and the weekly training plan live in `lib/types.ts` — easy to tweak.
