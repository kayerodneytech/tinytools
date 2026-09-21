# TinyTools

Fast, local-first image utilities — compress, convert, resize, crop, remove backgrounds, watermark, and more. Processing runs entirely in your browser.

This is a **Next.js (App Router)** port of the original Vite / TanStack Start app in `tinytools-main/`.

## Stack

- Next.js 15 + React 19
- Tailwind CSS 4
- shadcn/ui (Radix)
- Canvas + `@imgly/background-removal` + jsPDF (client-side)

## Routes

| Path | Page |
|------|------|
| `/` | Workspace (drop → edit → export) |
| `/tools` | Tool catalog + roadmap |
| `/about` | Product pitch |

## Develop

Requires Node.js 20+. On this machine, Windows Defender may block `node.exe` / `bun.exe` — allow them or add an exclusion, then:

```sh
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```sh
npm run build
npm start
```
