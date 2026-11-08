# ChalkAI

A mobile-first React + TypeScript + Vite starter for ChalkAI, a free AI teacher that teaches on a whiteboard.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To verify the production build, run `npm run build` and optionally `npm run preview`.

## Deploy to Vercel

Import this repository into Vercel. Vercel detects Vite automatically; the build command is `npm run build` and the output directory is `dist`. `vercel.json` includes a fallback rewrite for client-side routes.

## Current scope

This commit provides the home page and project foundation only. The Start Learning button currently gives an honest “coming soon” response; lesson content, server functions, and model integration are not included yet. No API keys or secrets are used in the frontend.
