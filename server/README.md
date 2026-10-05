# 🐾 Állati Aréna (Animal Clash) - Multiplayer Game Server

Standalone, real-time WebSocket match server with 4-digit room codes, mirrored troop deployment, emotes, and health checks.

---

## 🚀 Gyors Indítás Lokálisan (Local Run)

1. Telepítsd a függőségeket:
   ```bash
   npm install
   ```
2. Indítsd el a szervert:
   ```bash
   npm start
   ```
   A szerver alapértelmezetten a `3000`-es porton indul: `http://localhost:3000`

---

## 🌐 Telepítés Felhőbe (Ingyenes WebSocket Tárhely)

Mivel a Netlify elsősorban statikus tárhely és serverless függvényekből áll (amelyek 10-26 másodperc után leállnak, így a tartós WebSocket kapcsolat megszakadna), az alábbi ingyenes platformok a legideálisabbak a Node.js WebSocket szerver futtatásához:

### 1. Opció: Render.com (Legjobb & Ingyenes)
1. Regisztrálj a [render.com](https://render.com) oldalon.
2. Kattints: **New > Web Service**.
3. Csatlakoztasd a GitHub repódat (vagy válaszd a Docker opciót).
4. Állítsd be:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. Kattints a **Deploy** gombra!
6. Kapsz egy nyilvános HTTPS/WSS címet (pl. `https://allati-arena.onrender.com` / `wss://allati-arena.onrender.com`).

### 2. Opció: Railway.app
1. Menj a [railway.app](https://railway.app) oldalra.
2. Új projekt > Deploy from GitHub repo > Válaszd ki a `server` mappát.
3. A Railway automatikusan észleli a `package.json`-t vagy a `Dockerfile`-t, és generál egy élő domaint.

### 3. Opció: Netlify Custom Domain Összekötés
1. A játék kliensét (HTML, CSS, JS) feltöltheted a Netlify-ra (pl. `allati-arena.netlify.app`).
2. A `_redirects` fájl segítségével vagy a kliens beállításaiban a WebSocket kérések automatikusan a fenti Render/Railway backendhez kapcsolódnak.
