# TinyTools

Fast, local-first image utilities — compress, convert, resize, crop, remove backgrounds, watermark, and more. Processing runs entirely in your browser.

This is a **Next.js (App Router)** app: local-first image utilities with a desktop-inspired workspace.

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

Requires Node.js 20+.

```sh
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```sh
npm run build
npm start
```

## Site URL (SEO)

Set the canonical production URL used for sitemaps, Open Graph, and JSON-LD:

```sh
NEXT_PUBLIC_SITE_URL=https://your-domain.example
```

Default: `https://tinytools.pixelpyre-tech.co.zw`
