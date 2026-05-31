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




There is a feature in the project that makes a "WARNING MISSILE LOCK" message blink on the screen according to missile proximity. I want to change this feature. The message will still blink when there is one or more missiles incoming to the player. However it should not blink according to proximity anymore, instead make it blink twice a second. 
For each missile incoming add a red line to indicate missile direction and distance. Considering an imaginary vector from the plane's origin to the missile origin: the red line should start 1 unit from the plane and end at a maximum of 2 units from the plane. The length of the line is proportional to the distance between the missile and the plane. When the missile is at maximum threat detection distance (130 units) the red line end is at maximum length. When the missile is at length zero, the red line is zero as well. There is a "sketch.png" to guide this feature.