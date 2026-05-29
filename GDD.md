# Aircraft Dogfight — Multiplayer Game Specification

A 3D browser-based multiplayer aircraft dogfight game. PVP free-for-all deathmatch.

## Tech Stack
- **Frontend** (`/client`): Vite + React + TypeScript, Three.js for rendering. Runs in the browser.
- **Backend** (`/server`): Node.js, WebSocket-based.
- **Architecture**: Server-authoritative. Clients send inputs; the server resolves all game state.
- **Target environment**: LAN play — latency is treated as negligible.
- **Server tick rate**: 20 Hz.

---

## 1. Game Concept
- The player pilots a fighter jet in **3rd-person view** (camera behind and slightly above the model).
- Free-for-all deathmatch: players fire missiles at each other.
- Missiles deal damage on hit. When a player's HP reaches zero, they die.
- A **leaderboard** tracks Kills and Deaths, ordered by kill count.
- **Win condition**: The first player to reach **10 kills** ends the session; the winner is shown.

---

## 2. Networking & Connection Flow
1. On client start, the game does **not** auto-connect. The main menu shows a **Connect to Server** button.
2. After connecting, the player chooses **New Game** or **Join Game**:
   - **New Game**: Server creates a new session and generates a short, human-readable hash for others to join.
   - **Join Game**: Player enters a session hash in an input field to join an existing session.
3. Before entering, the player sets a **Player Name** and **selects an aircraft** (see Aircraft Stats).
4. In-game, a **Disconnect** button lets the player leave the current session.
5. Players may connect/disconnect freely, but **on disconnect their leaderboard entry is wiped**.

### Server Rules
- No player is the host.
- If **all** players disconnect, the session ends.
- Camera and player movement should be **lerped** to avoid snapping/jitter.

### Connection Errors
- Joining an ended or non-existent session returns: **"Session Ended or Doesn't Exist"**.

---

## 3. Aircraft
3D models are stored in `/client/public/aircraft` folder. They have the names of the aircract: "su30.glb", "f16.glb", "f15.glb". The models are designed to fit inside a 1 unit radius sphere. Use this info to guide camera position and 

| Aircraft | Maneuverability | HP  | Max Payload (Missiles) |
|----------|-----------------|-----|------------------------|
| Su30     | High            | 100 | 2                      |
| F16      | Balanced        | 150 | 4                      |
| F15      | Low             | 200 | 6                      |

- Aircraft name and stats appear in the **aircraft selection** screen in the main menu.
- "Maneuverability" abstracts several internal constants; display it to the player simply as **low / balanced / high**.

### Missile Replenishment
3D model of the missile is stored at `client/public/missile.glb`
- Firing a missile **resets a 5-second replenish countdown**.
- After 5 seconds, the aircraft regains **1 missile**.
- Firing again during the countdown **resets** it.
- **Respect max payload** — never exceed it.
- **Do not** reset the countdown if the player attempts to fire with **zero missiles** left.

---

## 4. Player & Visuals
- Camera stays behind and slightly above the aircraft model (3rd person).
- **Procedural Leaning / Banking**: When the player inputs roll, pitch, or yaw, the model itself leans slightly to hint at the direction change. The actual movement, however, is applied to the object itself (the lean is purely cosmetic).

---

## 5. Controls
| Action            | Key(s)          | Notes                                                        |
|-------------------|-----------------|--------------------------------------------------------------|
| Pitch             | `W` / `S`       | Inverted (classic flight-sim style): `W` nose down, `S` up   |
| Roll              | `A` / `D`       | `A` rolls left, `D` rolls right                              |
| Yaw               | `Q` / `E`       | `Q` yaws left, `E` yaws right                                |
| Accelerate        | `Spacebar`      | Increases speed; releasing decays back to `MINIMUM_SPEED`    |
| Fire Missile      | `Left Shift`    |                                                              |
| Target Switch     | `F`             |                                                              |
| Show Leaderboard  | Hold `TAB`      |                                                              |

- The aircraft always moves forward at a `MINIMUM_SPEED`; acceleration increases speed above that floor.

---

## 6. HUD
- **Overhead nameplate** above each enemy aircraft showing their chosen name.
- Player's own **HP**, **Speed**, and **Missile Count** (`current / max`).
- Missile lock indicator (see below).
- Missile warning indicator (see below).

---

## 7. Missile Lock System
- A player starts with **no target**.
- Pressing `F` makes the server **randomly select** an enemy as the target.
- Pressing `F` again switches to **another target**.
- If the current target disconnects, the server **retargets** automatically.
- A player **cannot lock onto itself**.
- The target is marked with a small **diamond waypoint**.
- **Lock condition**: Let `forward` = the aircraft's nose vector, and `toTarget` = the normalized vector from the player to the target. When `dot(forward, toTarget) >= MISSILE_LOCK_THRESHOLD`, the diamond turns **green** (locked); otherwise **red** (not locked).
  - `MISSILE_LOCK_THRESHOLD` is a tunable constant — **start at 0.9**.

---

## 8. Missile Behavior
- A missile fired **without a lock** travels straight forward.
- A missile fired **with a lock** tracks the target.
- Missiles are **faster than planes**, but a well-timed direction change can make them **overshoot**.
- Missiles **live for 20 seconds**, then are destroyed.
- Every missile deals **50 damage**.

---

## 9. Missile Warning System
- When a missile **has been fired and is actively tracking** the player, a red **"WARNING MISSILE LOCK"** blinks on screen.
- Blink rate **increases as the missile closes in**.
- With multiple inbound missiles, the warning behavior always **matches the closest missile**.

---

## 10. Collision
- No complex collision physics — use **squared Euclidean distance** for missile hits and plane collisions.
- **Plane-to-plane collision**: Both aircraft are **destroyed instantly**, award **no kills**, and assign **1 death to each** pilot. Squared euclidean distance collision happens when the squared euclidean distance between two objects is equal or smaller than `COLLISION_HIT_MIN_DIST`.

---

## 11. Boundaries, Spawn & Respawn
- **Spawn on connect**: Random point on the surface of a **100-unit-radius sphere** centered at `(0,0,0)`, aircraft **pointing toward the center**.
- **Death**: A red **"YOU DIED"** screen appears with a **5-second countdown**. While dead:
  - The player does **not** move and receives **no inputs**.
  - Their aircraft is **hidden** until respawn (prevents out-of-bounds and stray-collision issues while dead).
- **Respawn** (after countdown): Random point on the 100-unit sphere, pointing toward center, with **full stats** and the **same aircraft**.
- **Out of bounds**: If a living player flies outside a **200-unit-radius sphere** centered at `(0,0,0)`, they are teleported to a random point on the 100-unit sphere, pointing toward center. A **"STAY WITHIN BATTLE AREA"** message shows for **3 seconds**.
  - Boundary teleport applies to **living players only** (dead players are hidden and inert).

---

## 12. Kill & Death Feed
- Top-right corner shows the **last 5** kill/death updates.
- The feed is **persistent** — it is updated, not faded out.
- Formats:
  - Missile kill: **"Player A downed Player B"**
  - Plane collision: two separate entries, each reading **"Player X collided and exploded"**

---

## 13. Clouds and Background
- 3D models of clouds inside `client/public/clouds` folder as "cloud_1.glb", "cloud_2.glb", etc.. 
- The background is an equirectangular (360) image: `client/public/background.png`

---

## 14. End-Game Screen
- When a player reaches **10 kills**, the session **ends**.
- All aircraft are removed.
- The **Leaderboard appears for everyone**, overriding any other screen:
  - The death screen disappears and any respawn countdown simply ends (no respawn occurs).
- The session is over. Players must **disconnect and start a new session** to play again.
- **Connecting/joining is no longer possible** once the match has ended.

---

## Suggested Constants Summary
| Constant                  | Value / Start | Notes                                |
|---------------------------|---------------|--------------------------------------|
| `SERVER_TICK_RATE`        | 20 Hz         | Server update frequency              |
| `MISSILE_LOCK_THRESHOLD`  | 0.9           | Dot-product lock cone                |
| `MISSILE_DAMAGE`          | 50            | Per hit                              |
| `MISSILE_LIFETIME`        | 20 s          |                                      |
| `MISSILE_REPLENISH_TIME`  | 5 s           | Per missile regained                 |
| `RESPAWN_COUNTDOWN`       | 5 s           |                                      |
| `SPAWN_RADIUS`            | 100 units     | Sphere surface, centered at origin   |
| `BOUNDARY_RADIUS`         | 200 units     | Out-of-bounds teleport trigger       |
| `WIN_KILL_COUNT`          | 10            |                                      |
| `KILL_FEED_LENGTH`        | 5             |                                      |
| `MINIMUM_SPEED`           | 10 units/sec  | Floor speed; tune during dev         |
| `COLLISION_HIT_MIN_DIST`  | 2 units       |                                      | 