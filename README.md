# zooom 🎥

Free, self-hosted Zoom-style video meetings — now on a **modern stack** with **real
end-to-end encryption**. No paywall, no 40-minute cap, no accounts, no database.

```
React 18 + TypeScript  •  Vite  •  Fastify  •  WebSocket signaling  •  WebRTC mesh  •  AES-GCM E2EE
```

---

## ✨ What's new in v2 (vs. the first build)

| | v1 | **v2** |
|---|---|---|
| Stack | vanilla JS, single `app.js`, Express | **React 18 + TypeScript (strict), Vite, Fastify**, zod-validated protocol |
| Types | none | shared protocol types between client/server, `tsc --noEmit` clean |
| Media encryption | DTLS-SRTP only | **E2EE via WebRTC insertable streams** (`RTCRtpScriptTransform` + AES-GCM-256 worker) |
| Chat | plaintext through the server | **AES-GCM sealed in the browser** — server relays ciphertext only |
| Key handling | — | 256-bit key lives **only in the URL fragment** (`#k=…`), never sent to the server |
| Server | Express + `ws`, manual validation | **Fastify** + `@fastify/websocket` + **zod** schemas + per-socket rate limits |
| Security headers | none | **CSP, HSTS, COOP/CORP, Referrer-Policy `no-referrer`, Permissions-Policy, X-Frame-Options DENY** |
| ICE / privacy | public STUN always | configurable — **privacy mode disables third-party STUN**, optional self-hosted TURN |
| Logging | request logs | **no access logs at all** (no IPs, rooms or user agents retained) |
| Build | none | hashed bundles, worker split, strict CSP-compatible production build |

UI is unchanged: the Zoom 6.x-accurate shell (launcher tiles, clock card, charcoal
meeting room, exact toolbar) — plus E2EE badges and a privacy panel.

---

## 🔐 Privacy architecture (what actually protects you)

1. **Media never touches the server.** Peers exchange video/audio over a WebRTC mesh;
   the server only relays SDP/ICE.
2. **End-to-end media encryption.** Every outgoing RTP frame is encrypted with
   AES-GCM-256 in a Web Worker (`src/client/lib/e2ee.worker.ts`) and decrypted on the
   receiver. Wrong key ⇒ frames fail authentication and are dropped, so an interloper
   sees nothing.
3. **The key never leaves the browser.** It is generated with `crypto.getRandomValues`,
   stored in the URL **fragment** (which browsers never send to servers) and only ever
   passed into the local worker.
4. **Chat is end-to-end encrypted too.** `AES-GCM` per message, random 96-bit IV,
   ciphertext + IV are the only things the server sees.
5. **Ephemeral by construction.** No database, no message history, no access logs; rooms
   live in memory and are reaped seconds after the last participant leaves.
6. **Hardened delivery.** Strict CSP (no third-party scripts), `Referrer-Policy:
   no-referrer` (so invite links with keys never leak), `frame-ancestors 'none'`,
   Permissions-Policy limited to camera/mic/display-capture.
7. **Honest transport metadata.** Signaling metadata (who joined, mute state, ICE
   candidates) is necessarily visible to the server — that is what a signaling server
   is for. IP addresses are only exposed to peers/STUN; enable *Privacy mode* in
   Settings to stop contacting public STUN servers (you will need your own TURN).

> Note: video keyframe detection needs the first 1–3 codec bytes of each frame in the
> clear (VP8/VP9 frame tag). Those bytes carry no media content — the payload after
> them is fully encrypted. This is documented in `e2ee.worker.ts`.

---

## ☁️ Deploy it (Vercel + GitHub)

Full walkthrough: **[DEPLOY.md](DEPLOY.md)**

> **Vercel cannot host the signaling server** (serverless functions can't keep a
> WebSocket open). Two supported shapes:
>
> - **Split (Vercel + Render):** build the frontend on Vercel with
>   `VITE_API_BASE=https://your-signal.onrender.com`, run the signaling server on Render
>   (Docker/`render.yaml`) with `ALLOWED_ORIGINS=https://your-app.vercel.app`.
> - **All-in-one:** deploy the same repo to Render/Fly/VPS with Docker — one URL, zero config.
>
> `vercel.json`, `render.yaml`, `fly.toml` and `Dockerfile` are all included and tested.

## 🚀 Run it

```bash
cd zooom
npm install

# development (Vite HMR + Fastify API on :3000, proxy from :5173)
npm run dev

# production
npm run build          # typecheck + vite build -> dist/
npm start              # Fastify serves dist/ + /ws + /api on :3000
```

Open http://localhost:3000 → **New meeting** → **Start** → **Invite** and send the link.
The invite link contains `?room=<id>#k=<key>`; anyone with it joins the encrypted room
instantly (no waiting room, no approval).

**Camera/mic require HTTPS or localhost** (browser rule). For LAN/deployed use, put it
behind TLS (Caddy, Nginx, Cloudflare, Fly/Render/Railway all work).

### Configuration

Copy `.env.example` → `.env`:

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3000` | HTTP/WS port |
| `MAX_PARTICIPANTS` | `24` | mesh size cap |
| `ALLOW_PUBLIC_STUN` | `true` | `false` = never contact third-party STUN (max privacy) |
| `TURN_URLS` / `TURN_USERNAME` / `TURN_CREDENTIAL` | — | your own TURN relay (recommended for privacy + strict NATs) |

### Docker

```bash
docker build -t zooom . && docker run -p 3000:3000 --env-file .env zooom
```

---

## 🗂 Project layout

```
zooom/
├── index.html                 # Vite entry
├── vite.config.ts             # dev proxy for /api + /ws
├── tsconfig.json              # strict TS
├── src/
│   ├── shared/protocol.ts     # zod schemas + typed messages (client ↔ server)
│   ├── server/
│   │   ├── index.ts           # Fastify: static, /api/config, /ws signaling
│   │   ├── rooms.ts           # ephemeral in-memory rooms
│   │   └── security.ts        # helmet/CSP/HSTS/referrer policy
│   └── client/
│       ├── App.tsx            # state, join/leave flow, recording, invites
│       ├── components/        # Shell, Home, Meetings, Prejoin, Meeting, modals
│       ├── lib/
│       │   ├── call.ts        # WebRTC mesh engine (framework-free)
│       │   ├── e2ee.ts        # key handling + AES-GCM chat + transform attach
│       │   ├── e2ee.worker.ts # per-frame media encryption worker
│       │   ├── media.ts       # capture, device switching, screen share
│       │   ├── recorder.ts    # local-only canvas recording
│       │   ├── storage.ts     # localStorage (nothing on the server)
│       │   └── format.ts
│       └── styles/app.css     # Zoom-accurate design system
└── dist/                      # production build (served by Fastify)
```

---

## 🧪 How to test it

Three levels, full walkthrough in **[TESTING.md](TESTING.md)**:

1. **In-app self-test** — Home → *More* → **Test my setup**: checks secure context, Web Crypto,
   E2EE support, codecs, camera/mic, permissions, live capture, `/ws` signaling and ICE in one click.
2. **Real two-person call** — start a meeting, copy the invite (`?room=…#k=…`), open it in a
   second tab; verify video both ways, mute/camera sync, E2EE chat, screen share, recording,
   host controls — plus negative tests (join without the key, wrong key).
3. **Automated smoke test** — `npm run smoke` (no browser): app/API health, security headers,
   two-peer signaling, ciphertext-only chat relay, mute-all, leave + host transfer.

## ✅ Verified end-to-end (Chromium, two participants)

| Check | Result |
|---|---|
| Two tabs, same invite link | both join the same room |
| **E2EE video** | sender encrypts ~350 frames/s-of-test, receiver decrypts ~490 → remote `<video>` reports `videoWidth 640` (picture visible) |
| Camera enabled after join | renegotiation + re-attach works, both directions show video |
| **E2EE chat** | message typed in tab B decrypts and renders in tab A (AES-GCM, server only saw ciphertext) |
| Wrong/no key | messages render as “🔒 encrypted — key required”, frames are dropped |
| Security headers | CSP, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, Permissions-Policy present on `/` |
| `npm run build` | `tsc --noEmit` clean + Vite production build |

---

## ⌨️ Shortcuts

`A` mute · `V` video · `C` chat · `P` participants · `H` raise hand · `Esc` close dialogs ·
`Ctrl/⌘+E` search meetings

## 🧭 Notes & limits

- Mesh topology: 24 participants max (each peer sends to every other). For larger rooms
  you'd swap in an SFU — the E2EE worker already gives you the hooks (keep the key in the
  client and encrypt per-frame after the SFU relay).
- E2EE needs a Chromium-based browser (insertable streams). Safari/Firefox fall back to
  DTLS-SRTP in-transit encryption and the UI says **“Transit only”** instead of **E2EE**.
- The first 1–3 bytes of each video frame stay in the clear (codec frame tag), see above.

Free forever. 🐼
