# 🚀 Deploy Guide — GitHub + Vercel (aur signaling server)

Zooom do hisson mein chalta hai:

| Hissa | Kya karta hai | Kahan chalta hai |
|---|---|---|
| **Frontend** (React build → static files) | UI, WebRTC, E2EE | Vercel ✅ (static hosting) |
| **Signaling server** (Fastify + WebSocket) | rooms, SDP/ICE relay, encrypted chat relay | Vercel ❌ — **long-lived WebSocket** chahiye |

> ⚠️ Ye sab se important baat hai: **Vercel par WebSocket server nahi chalta.** Vercel
> functions serverless hain — request ke baad band ho jate hain, jabke call ke doran
> WebSocket minutes tak khula rehta hai. Is liye do raste hain:

- **Rasta A (recommended, 2 platforms):** frontend **Vercel** par + signaling **Render** (free) par.
  Neeche step-by-step.
- **Rasta B (1 platform, sab se asaan):** poora app **Render / Fly.io / VPS** par Docker se —
  ek hi URL, kuch configure karne ki zaroorat nahi. (Vercel nahi chahiye.)

Dono hi case mein code same hai — sirf env variables farq karte hain.

---

## 1. GitHub par daalein

```bash
# zip extract karke folder ke andar jayein
cd zooom
git init
git add .
git commit -m "zooom v2 — free Zoom-style meetings with E2EE (React + TS + Fastify)"
git branch -M main
git remote add origin https://github.com/<your-username>/zooom.git
git push -u origin main
```

`node_modules/`, `dist/`, `.env` already `.gitignore` mein hain — safe hai.

---

## 2. Rasta A — Signaling server Render par (5 minute)

1. [render.com](https://render.com) → **New** → **Web Service** → apna GitHub repo connect karein
2. Settings:
   - **Runtime:** Docker (repo mein `Dockerfile` hai; `render.yaml` bhi mojood hai →
     *New → Blueprint* se ek click mein ho jata hai)
   - **Health check path:** `/api/health`
   - **Instance type:** Free
3. Environment variables (optional):
   ```
   MAX_PARTICIPANTS=24
   ALLOW_PUBLIC_STUN=true
   ALLOWED_ORIGINS=https://zooom.vercel.app        # apna Vercel URL (baad mein add karein)
   # TURN_URLS=turn:turn.example.com:3478
   # TURN_USERNAME=...
   # TURN_CREDENTIAL=...
   ```
4. Deploy → URL milega, misal: `https://zooom-signal.onrender.com`
5. Check karein: `https://zooom-signal.onrender.com/api/health` → `{"ok":true,...}`

> Free Render instance 15 min inactivity ke baad so jata hai; pehli request par ~30s
> lag sakta hai. Paid ($7) par yeh issue nahi. Fly.io par bhi same Dockerfile chalta hai
> (`fly.toml` ready hai).

---

## 3. Rasta A — Frontend Vercel par

1. [vercel.com](https://vercel.com) → **Add New → Project** → GitHub repo import karein
2. Framework: **Vite** (auto detect). Build command `npm run build`, output `dist`
   (repo ke `vercel.json` mein already set hai)
3. **Environment Variables** → add karein:

   | Name | Value |
   |---|---|
   | `VITE_API_BASE` | `https://zooom-signal.onrender.com` |

4. **Deploy** → aapko `https://zooom.vercel.app` mil jayega
5. Ab Render par wapas ja kar `ALLOWED_ORIGINS` mein apna Vercel URL daalein (aur agar
   custom domain ho to woh bhi), comma se separate:
   ```
   ALLOWED_ORIGINS=https://zooom.vercel.app,https://zooom-git-main-you.vercel.app
   ```
   Redeploy → ho gaya. ✅

> Vercel par har push par frontend auto-deploy hota hai. Env var badalne ke baad
> **Redeploy** karna zaroori hai (Vite env build-time par bake hoti hai).

### Vercel ke saath test
- Site kholein → **More → Test my setup**
- **Signaling server (/ws)** ✅ pass hona chahiye. Agar ❌ ho to `ALLOWED_ORIGINS`
  ya `VITE_API_BASE` galat hai.
- Do tabs mein call karein — video, E2EE chip, chat sab chalna chahiye.

---

## 4. Rasta B — Sab kuch ek jagah (Render / Fly / VPS)

Koi env var nahi chahiye, koi split nahi:

```bash
# Render: New → Web Service → Docker → done
# ya
fly launch --no-deploy && fly deploy          # fly.toml ready hai
# ya apna server
docker build -t zooom . && docker run -p 3000:3000 --env-file .env zooom
```

`https://your-app.onrender.com` — ek hi URL par app + WebSocket dono.

---

## 5. Custom domain + HTTPS

Vercel aur Render dono apne aap HTTPS de dete hain (Let's Encrypt). Ye zaroori hai:

- **Camera/mic** sirf HTTPS par chalte hain (`localhost` exception ke sath)
- **E2EE** bhi secure context maangta hai

Custom domain: Vercel → Project → Domains; Render → Settings → Custom Domain.
Domain add karne ke baad `ALLOWED_ORIGINS` update karna na bhoolein.

---

## 6. TURN (agar log alag networks par connect na ho)

Default STUN sirf 70–80% cases mein kaam karta hai. Corporate/ symmetric NAT par
TURN chahiye:

**Free/cheap options:** Metered (free 50 GB/month), Cloudflare Calls (TURN),
apna coturn VPS par.

```bash
TURN_URLS=turn:global.turn.metered.ca:80,turns:global.turn.metered.ca:443
TURN_USERNAME=your-username
TURN_CREDENTIAL=your-password
```

Restart ke baad **Test my setup → ICE / NAT traversal** dobara chalayein — woh
"self-hosted TURN configured" dikhayega.

---

## 7. Deploy ke baad checklist

| # | Check | Kahan |
|---|---|---|
| 1 | `/api/health` → `{"ok":true}` | signaling URL |
| 2 | **Test my setup** → sab green (Live capture ke liye camera allow) | site |
| 3 | 2 tabs/2 devices call, dono taraf video | site |
| 4 | **E2EE** chip green (Chrome/Edge) | meeting |
| 5 | Chat message doosre tab par decrypt ho | site |
| 6 | Bina `#k=…` link → "This meeting is encrypted" | site |
| 7 | DevTools → Network → `/ws` → **101 Switching Protocols** | site |
| 8 | Headers: `Content-Security-Policy`, `Referrer-Policy: no-referrer` | site |

---

## 8. Troubleshooting

| Problem | Wajah | Fix |
|---|---|---|
| "Signaling server (/ws) ❌" | `VITE_API_BASE` galat / Render so raha hai | env var check → **Redeploy** on Vercel; Render par pehli request 30s le sakti hai |
| Site khulti hai magar join nahi hota, console mein CORS error | `ALLOWED_ORIGINS` mein origin nahi | exact origin daalein (`https://`, koi trailing slash nahi) → restart |
| "E2EE" ki jagah "Transit only" | Firefox/Safari | Chrome/Edge use karein |
| Camera permission hi nahi maangta | HTTP par khula hai | HTTPS use karein |
| Peers connect nahi hote (stuck "Connecting") | NAT / TURN nahi | `TURN_*` env vars add karein |
| Vercel build fail: `tsc` errors | node version purana | Vercel → Settings → Node 20+ |
| 40-min limit? | Zooom mein nahi hota 😄 | — |

---

## 9. Cost

| Service | Free tier | Kaafi hai? |
|---|---|---|
| Vercel (frontend) | 100 GB bandwidth | haan, bahut |
| Render (signaling) | free, sleep after 15 min | testing ke liye haan; daily use → $7/mo |
| Fly.io | free allowance | haan |
| TURN (Metered) | 50 GB/mo | ~200 ghante 1:1 |

Media server-side se nahi guzarta, is liye bandwidth bill sirf static files ka hai —
yeh architecture ka bara faida hai.
