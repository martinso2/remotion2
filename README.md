# Remotion + Next.js

Next.js 14 project with Remotion embedded for programmatic video creation. Production-ready for Vercel deployment and scalable for AI-generated video rendering.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the home page, or [http://localhost:3000/studio](http://localhost:3000/studio) for the Remotion Player.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Home page
│   └── studio/
│       └── page.tsx        # Remotion Player route
├── components/
│   └── remotion/           # Remotion compositions
│       ├── FadeScaleText.tsx   # Example: 1920x1080, 30fps, 5s
│       ├── Root.tsx            # Composition registry
│       └── StudioPlayer.tsx    # Player component
└── remotion/
    ├── index.ts            # Remotion entry point
    └── webpack-override.mjs    # Tailwind for Remotion
```

## Scripts

- `npm run dev` - Start Next.js dev server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run remotion` - Open Remotion Studio (standalone)
- `npm run render` - Render video via CLI

## Deployment (Vercel)

The project is configured for Vercel. Deploy with:

```bash
vercel
```

For server-side video rendering, see [Remotion on Vercel](https://www.remotion.dev/docs/vercel).

## Adding Compositions

1. Create a new component in `src/components/remotion/`
2. Register it in `Root.tsx` with `<Composition>`
3. Use `useCurrentFrame()` and `interpolate()` for animations (no CSS transitions)
