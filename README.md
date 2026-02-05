# Letter Matching Game (Next.js)

A kindergarten-friendly alphabet game where children match lowercase letters to uppercase letters.

## Features

- **Level 1 (Simple Tap):** one uppercase target with 2 lowercase options.
- **Level 2 (Scrambled Row):** one uppercase target with a scrambled lowercase row.
- **Teacher controls:** choose difficulty and start/reset each activity.
- **Slide-based rounds:** each level has 20 rounds/slides per activity.
- **Cheerful feedback:** animations and messages for correct/incorrect answers.

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
