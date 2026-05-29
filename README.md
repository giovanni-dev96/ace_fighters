# Ace Fighters

A 3D browser-based multiplayer aircraft dogfight game (free-for-all deathmatch).
Server-authoritative, LAN-oriented, 20 Hz tick. See [`GDD.md`](./GDD.md) for the full spec.

## Layout
- `server/` — Node + `ws` authoritative game server (Three.js math, 20 Hz sim).
- `client/` — Vite + React + React Three Fiber renderer.
- `shared/` — wire protocol (`protocol.ts`) and tunable constants (`constants.ts`), imported by both.

## Run (two terminals)

```bash
# 1) server  -> ws://localhost:8080  (override with PORT env)
cd server && npm install && npm run dev

# 2) client  -> http://localhost:5173
cd client && npm install && npm run dev
```

Open the client URL in **two** browser windows:
1. **Connect to Server** in both.
2. Window A: **New Game** → note the session code → set name + pick aircraft → **Enter Battle**.
3. Window B: **Join Game** → enter the code → set loadout → **Enter Battle**.

The client connects to `ws://<page-host>:8080` by default; override with a
`VITE_SERVER_URL` env var (e.g. `ws://192.168.1.50:8080`) for LAN play from other machines.

## Controls
`W/S` pitch (inverted) · `A/D` roll · `Q/E` yaw · `Space` accelerate ·
`Left Shift` fire missile · `F` switch target · hold `Tab` leaderboard.

## Assets
Models live in `client/public/` (`aircraft/*.glb`, `missile.glb`, `clouds/*.glb`).
Drop an equirectangular `client/public/background.png` in for the sky; until then a
flat fallback color is used (no crash).

## Tuning
Gameplay constants (speeds, turn rates, missile behavior, lock cone) are all in
`shared/constants.ts`. Flight-control signs and the model "forward" axis assume the
GLBs face local `-Z`; adjust there if a model flies tail-first.
