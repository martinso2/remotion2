# Remotion + Next.js

Next.js 14 project with Remotion embedded for programmatic video creation. Create TikTok and Facebook videos from a prompt. Production-ready for Vercel deployment and scalable for AI-generated video rendering.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the Video Creator (prompt console + studio), or [http://localhost:3000/studio](http://localhost:3000/studio) for the standalone Remotion Player.

## Features

- **Prompt console** – Enter a prompt to drive video content
- **Platform selector** – TikTok (1080×1920), FB Square (1080×1080), FB Reel (1080×1920)
- **Live preview** – Studio embedded on home page, updates as you type
- **Local rendering** – `npm run render` to export video (requires FFmpeg)

## Project Structure

```
src/
├── app/
│   ├── page.tsx            # Home: console + studio
│   └── studio/
│       └── page.tsx        # Standalone Remotion Player
├── components/
│   ├── VideoCreator.tsx    # Prompt console + embedded player
│   └── remotion/
│       ├── PromptText.tsx      # Composition with text prop
│       ├── FadeScaleText.tsx   # Legacy 1920×1080
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
