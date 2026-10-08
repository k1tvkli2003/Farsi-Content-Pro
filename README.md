# Farsi-Content-Pro

AI-powered Persian content studio built on Gemini: headline generation,
Persian poetry lookup, long-form article writing, text rewriting, Mazani
proverbs, and an integrated chatbot -- with live streaming preview and a
text-refinement panel.

## What's inside

- `App.tsx`, `components/` (Header, ModeSelector, InputPanel, OutputPanel,
  Chatbot, icons) -- mode picker plus editing workspace.
- `services/geminiService.ts` -- all Gemini calls in one boundary.
- `constants.ts`, `types.ts`, `index.css`, Tailwind + Vite + TS scaffolding.

## Tech stack

React 19, Vite 6, TypeScript, Tailwind 3, `@google/genai`. Needs a Gemini
API key at runtime.

## Getting started

```bash
npm install
npm run dev
```

Standard flow: install, set the key, run. `npm run build`
for production.

## Status

Working single-purpose app. ChefMom is its cooking-domain
sibling, built on the same skeleton.
