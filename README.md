# Letter Matching Game (Next.js)

A kindergarten-friendly alphabet game where children match lowercase letters to uppercase letters.

## Features

- **Level 1 (Single Pair):** pick uppercase first, then matching lowercase.
- **Level 2 (Two Rows, 5 pairs):** 5 uppercase letters + 5 scrambled lowercase letters on each slide.
- **Level 3 (3x3 Matrix):** 9 uppercase letters + 9 scrambled lowercase letters per slide.
- **Teacher/Student mode (no login):** first joiner becomes teacher, second joiner becomes student.
- **Live teacher view:** teacher sees student attempts in real-time (single teacher + single student).
- **Premium feedback effects:** blue halo for selected uppercase, green halo + tick for correct, red halo + cross for wrong.
- **Slide-based rounds:** 20 slides per level.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` - start local development server
- `npm run build` - production build
- `npm run start` - run the production app
- `npm run lint` - run lint checks

## Vercel Deployment Note

If your Vercel project was previously configured as a static site with `Output Directory = public`, deployment can fail for Next.js apps with:

`No Output Directory named "public" found after the Build completed.`

This repository now includes `vercel.json` to explicitly deploy as a **Next.js** project with output from `.next`. If your dashboard still has an old override, clear the Output Directory in Project Settings so Vercel uses framework defaults.
