# 🧪 Zooom — Testing Guide (Roman Urdu)

Yeh file batati hai ke app ko **yahin preview mein** kaise test karna hai — 3 levels:
(1) 10-second self-test, (2) asli 2-banday ki call, (3) automated smoke test.

---

## 0. Preview link kahan hai?

Jab bhi main server chalata hoon, aapke browser mein ek **LIVE PREVIEW** khulta hai
(`https://<port>-<sandbox>.e2b.app` jaisa). Woh link **HTTPS** hai, is liye camera/mic
kaam karenge.

> ⚠️ Sab se aam ghalti: `http://127.0.0.1:3000` apne laptop par kholna jab server
> **sandbox** mein chal raha ho. Woh aapke laptop ka localhost hai, sandbox ka nahi.
> Sirf preview link use karein.

---

## 1. Level 1 — "Test my setup" (10 second)

1. Preview link kholein → **More** (left rail) → **Test my setup**
2. 9 checks khud chal jayenge:

| Check | Kya hona chahiye |
|---|---|
| Secure context | ✅ pass (HTTPS ya localhost) |
| Web Crypto (AES-GCM-256) | ✅ pass |
| End-to-end media encryption | ✅ pass (Chrome/Edge). Firefox/Safari par ⚠️ "transit only" |
| VP8 + local recording | ✅ pass |
| Camera & microphone | ✅ pass + kitne devices |
| Browser permissions | ✅ camera/mic `granted` ya `prompt` |
| Live capture test | ✅ pass (pehli baar browser permission maangega → **Allow**) |
| Signaling server (/ws) | ✅ pass — "Room created in X ms" |
| ICE / NAT traversal | ✅ pass (STUN) ya ⚠️ (TURN nahi) |

Sab green = app theek hai. Red = us row ka detail parh lein (wohi fix hai).

---

## 2. Level 2 — Asli call (2 log, 2 tab)

Yeh sab se important test hai.

1. **Tab A** (normal window): preview link → **New meeting** → naam likhein → **Start**
2. Meeting khul jayegi. Upar **E2EE** chip (green) nazar aani chahiye.
3. Top-right **Invite** dabayein → link copy hota hai, shakal yeh:
   `https://…/?room=12345678901#k=AbCd…`
   (aakhir mein `#k=…` = encryption key)
4. **Tab B** (naya tab, same browser): wohi link paste karein → **Join**
5. Ab dono tabs mein:
   - **do tiles** dikhne chahiye (aap + doosra banda)
   - dono taraf video chalti ho (camera allow karein)
   - naam ke saath mic icon, mute state sync ho

### Ek ek cheez check karein

| Test | Kaise | Expected |
|---|---|---|
| **Mic mute** | Tab A mein `Mute` | Tab B ke tile par 🔇 icon aaye |
| **Camera off** | Tab A mein `Stop Video` | Tab B par avatar (initials) dikhe |
| **Screen share** | Tab A → `Share` → window choose karein | Tab B par "Presenting" badge + aapki screen |
| **Chat (E2EE)** | Tab A → `Chat` → message bhejein | Tab B par wohi text decrypt ho kar aaye |
| **Private chat** | Chat ke "To:" dropdown se sirf ek banda | Sirf usi ko jaye |
| **Reactions** | `React` → emoji | Dono taraf emoji float kare |
| **Raise hand** | `Raise Hand` | Tile par ✋ + participants list mein |
| **Participants** | `Participants` | sahi count, host badge |
| **Host mute all** | Host tab → Participants → `Mute all` | doosre tab par toast "You were muted by the host" |
| **Recording** | `More` → `Record locally` → kuch second → `Stop recording` | `.webm` download + **Recordings** tab mein entry |
| **Leave** | `Leave` | doosre tab par "left the meeting"; host chala jaye to host transfer |
| **Invite link dobara** | naya tab, wohi link | naya banda foran join (no waiting room) |

### Negative tests (privacy ka asli saboot)

| Test | Kaise | Expected |
|---|---|---|
| **Bina key ke join** | Link se `#k=…` hata dein → tab kholein | Modal "This meeting is encrypted" + chat "🔒 encrypted — key required" (video frames drop) |
| **Ghalat key** | `#k=` ke baad kuch random likh dein | wohi locked behaviour — decrypt fail |
| **Same ID, doosra browser/incognito** | link se join | E2EE phir bhi chalta hai (key link mein hai) |
| **CSP check** | DevTools → Network → `/` → headers | `Content-Security-Policy`, `Referrer-Policy: no-referrer` |
| **Server log** | Terminal dekhein | koi access log nahi (no IP, no room id) |

---

## 3. Level 3 — Automated smoke test (terminal)

Server ke folder mein (jahan `package.json` hai):

```bash
npm run smoke
```

Yeh bina browser ke check karta hai: app/API health, security headers, do WS clients ka
room join, raise-hand, **chat sirf ciphertext ke tor par relay hota hai**, host mute-all,
leave + host transfer. Output aisa aata hai:

```
1. App & API                ✔ ✔ ✔
2. Security headers         ✔ ✔ ✔ ✔
3. Signaling (2 peers)      ✔ ✔ ✔ ✔ ✔
4. State + encrypted chat   ✔ ✔ ✔
5. Host controls + leave    ✔ ✔ ✔
All smoke checks passed.
```

Doosre server par test karna ho:

```bash
BASE=https://your-deployment.example npm run smoke
```

---

## 4. Mobile par test

1. Preview link phone ke browser (Chrome) mein kholein — HTTPS hai is liye camera chalega
2. **New meeting** → **Start** → **Invite** → link WhatsApp kar dein
3. Laptop par wohi link kholein → dono ke darmiyan call
4. Mobile layout: neeche toolbar horizontally scroll hota hai, **Participants/Chat** full-screen panel ban jata hai

---

## 5. Jo cheezein expect karni chahiye (limitations)

- **E2EE sirf Chromium (Chrome/Edge)** mein. Firefox/Safari par "Transit only" chip —
  wahan DTLS-SRTP hai (transit encrypted) magar frame-level E2EE nahi.
- **Firefox sandbox mein getDisplayMedia** nahi hota — screen share Chrome mein test karein.
- **Symmetric NAT / corporate network** par peer connect nahi hoga jab tak TURN na ho:
  `.env` mein `TURN_URLS`, `TURN_USERNAME`, `TURN_CREDENTIAL` daal kar restart karein,
  phir self-test ka **ICE / NAT traversal** dobara chalayein.
- **Mesh** hai, is liye 24 log max — 4-6 tak best performance.

---

## 6. Kuch tootay to kya bhejein

Console (F12) se yeh 3 cheezein screenshot/save karein:

1. **Test my setup** ka result (konsi row red hai)
2. Console errors (agar koi)
3. Network tab → `/ws` ka status (101 hona chahiye)

Aur yeh batayein: browser + OS, dono side (host/guest) par wohi error aa raha hai ya nahi,
aur kya aap same machine ke do tabs par test kar rahe hain ya do devices par.
