# Letter Matching Game (Next.js)

A kindergarten-friendly alphabet game where children match lowercase letters to uppercase letters.

## Features

- **Level 1 (Single Pair Practice):** one uppercase + lowercase matching pair per slide.
- **Level 2 (Two Row Practice):** 5 uppercase letters with 5 scrambled lowercase matches.
- **Level 3 (3×3 Matrix Practice):** 9 uppercase/lowercase pair matching per slide.
- **Level 4 (Final Test):** no retry per uppercase; every attempt is scored immediately.
- **Premium feedback:** blue selection halo, green halo + tick for correct, red halo + cross for wrong.
- **Web Audio effects:** real-time generated tones for click, correct, and wrong interactions.
- **Slide-based practice:** 20 slides per level with final score card.

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
