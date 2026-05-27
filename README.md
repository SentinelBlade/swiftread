# Swiftread — Setup & Deploy Guide

A speed reading PWA. Works offline, installs to your phone home screen.

---

## Prerequisites

- [Node.js](https://nodejs.org) v18 or later — download and install if you don't have it
- A [GitHub](https://github.com) account (free)
- A [Vercel](https://vercel.com) account (free) — sign up with your GitHub account

---

## 1. Run locally

Open a terminal, navigate to this folder, and run:

```bash
npm install       # downloads all dependencies (takes ~30 seconds first time)
npm run dev       # starts the local server
```

Then open **http://localhost:5173** in your browser.
The app hot-reloads whenever you save a file — no need to restart.

---

## 2. Generate the app icons (one-time)

The PWA needs icons to show on your phone home screen.

```bash
pip install Pillow         # install the image library
python generate_icons.py   # creates public/icons/icon-192.png and icon-512.png
```

If you'd rather use your own icon, just drop two PNG files into `public/icons/`:
- `icon-192.png` (192×192 px)
- `icon-512.png` (512×512 px)

---

## 3. Deploy to Vercel

### Push to GitHub first

```bash
git init
git add .
git commit -m "Initial commit"
```

Go to GitHub → New repository → name it `swiftread` → create it.
Then follow the "push an existing repository" commands GitHub shows you.

### Connect to Vercel

1. Go to [vercel.com](https://vercel.com) → "Add New Project"
2. Import your `swiftread` GitHub repository
3. Vercel auto-detects Vite — just click **Deploy**
4. Done. You get a URL like `https://swiftread-yourname.vercel.app`

Every time you push to GitHub, Vercel redeploys automatically.

---

## 4. Install on your phone

### iPhone (Safari only — Chrome on iOS won't prompt)
1. Open your Vercel URL in **Safari**
2. Tap the **Share** button (box with arrow)
3. Tap **"Add to Home Screen"**
4. Tap **Add**

### Android (Chrome)
1. Open your Vercel URL in **Chrome**
2. Tap the **⋮ menu** → **"Add to Home screen"** (or a banner may appear automatically)
3. Tap **Install**

The app opens fullscreen with no browser chrome, works offline, and looks like a native app.

---

## Controls

| Action | Mobile | Desktop |
|---|---|---|
| Play / Pause | Tap the word | Space |
| Speed up | Swipe up | ↑ |
| Speed down | Swipe down | ↓ |
| Skip forward | Swipe left | → |
| Skip back | Swipe right | ← |

---

## Project structure

```
swiftread/
├── public/
│   └── icons/            ← PWA icons (generate with generate_icons.py)
├── src/
│   ├── main.jsx          ← React entry point
│   ├── SpeedReader.jsx   ← The full app
│   └── index.css         ← Global resets
├── index.html            ← HTML shell
├── vite.config.js        ← Vite + PWA config
├── package.json          ← Dependencies
└── generate_icons.py     ← Icon generator script
```
