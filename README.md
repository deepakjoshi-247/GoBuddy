# 🛵 ChaloNa (चलो ना) — College Peer Ride-Sharing Prototype

A fast, zero-friction peer-to-peer campus ride-sharing and auto-pooling web prototype built for college students. Engineered specifically for a **2–3 minute side-by-side browser demonstration** displaying real-time synchronization between a **Rider (Aarav)** and a **Passenger (Rohan)**.

---

## ⚡ Tech Stack & Highlights

- **Frontend**: Vite + React 18 + TypeScript + Tailwind CSS + Lucide Icons + Framer Motion.
- **Backend**: Express.js + SQLite (`sqlite3`) with synchronized 1.5s reactive polling and REST endpoints.
- **Mapping & Geocoding**: Leaflet (`react-leaflet` / Leaflet) with OpenStreetMap tiles, Nominatim geocoding with debounce + Indian college hotspot presets, and OSRM routing with smooth Haversine geodesic fallback.
- **Economics**: 
  - **Bike**: ₹8/km (1 seat)
  - **Rickshaw**: ₹10/km (3 seats)
  - **1% Student Platform Fee** automatically deducted on ride completion.
- **Side-by-Side Dual Demo View (`/demo`)**: Renders Rider and Passenger mobile frames side-by-side in a single window with interactive live coordination.

---

## 🚀 Quick Start (Single Command)

### 1. Install & Run Everything
```bash
# In the project root:
npm install
npm run dev
```

`npm run dev` uses `concurrently` to start:
- **Backend API**: `http://localhost:3000`
- **Frontend App**: `http://localhost:5173` (proxies `/api` to 3000)

*(Alternatively, run `npm start` to run the unified Express production server serving both API and the built client on `http://localhost:3000`)*

### 2. Reset Database to Clean State
Click the **"Reset Demo"** button in the app header, or run:
```bash
npm run seed
```

---

## ⏱️ Exact 2-Minute Side-by-Side Demo Script

Open `http://localhost:5173/demo` (or open two browser tabs: Tab 1 at `http://localhost:5173/rider/login` and Tab 2 in Incognito at `http://localhost:5173/passenger/login`).

| Timestamp | Screen / Role | Action to Perform | What Happens |
| :--- | :--- | :--- | :--- |
| **0:00 – 0:30** | **Left (Rider Aarav)** | 1. Click **"Demo Route"** (or select Pickup: *College Main Gate*, Dest: *Railway Station Junction*, Rickshaw ₹10/km, Tomorrow 08:30 AM).<br>2. Click **"Publish Campus Ride"**. | Ride is published to SQLite database. Status updates to *Active Campus Ride* with 3 seats available. |
| **0:30 – 1:00** | **Right (Passenger Rohan)** | 1. Click **"Demo Route"** (Pickup: *Hostel Block A*, Dest: *Railway Station Junction*, Preferred Time: 08:45 AM).<br>2. The **Corridor Matching Algorithm** instantly finds Aarav's ride with computed fare **₹41–₹42**.<br>3. Click **"Request to Join"**. | Request is created in DB with a **2-minute countdown timer** (`02:00` $\rightarrow$ `00:00`). |
| **1:00 – 1:30** | **Left (Rider Aarav)** | 1. Aarav's screen immediately pops up the **Incoming Passenger Request** banner showing Rohan Verma, pickup/drop, and fare + countdown timer.<br>2. Click **"Approve Passenger"**. | Request is marked `approved`, seats decrement to 2/3. Rohan's screen instantly flips to **Active Ride!** |
| **1:30 – 1:50** | **Both Screens** | 1. Click **"Chat"** on either side.<br>2. Send a quick message (e.g., *"Waiting at Hostel A gate"*). | Live coordination messages appear immediately in both tabs. |
| **1:50 – 2:20** | **Left (Rider Aarav)** | 1. Drag the **"Slide to Complete Ride →"** slider across the screen. | Ride completes. Celebration modal displays: **Passenger Fare Earnings**, **1% Platform Fee deduction**, and **Net Wallet Credit**. |
| **2:20 – 2:30** | **Both Screens** | 1. Tap the **"Wallet"** tab on Rider to view the updated Balance and 1% fee transaction.<br>2. Tap the **"Rides"** tab on Passenger to view the completed trip in history. | Full cycle verified. Click **"Reset Demo"** to restore clean state. |

---

## 🗄️ Database Entities

1. `users` (`id`, `name`, `pid`, `role`, `avatar_seed`)
2. `rides` (`id`, `rider_id`, `rider_name`, `pickup_name`, `pickup_lat`, `pickup_lng`, `dest_name`, `dest_lat`, `dest_lng`, `date`, `time`, `vehicle`, `capacity`, `seats_available`, `route_distance_km`, `status`, `created_at`)
3. `join_requests` (`id`, `ride_id`, `passenger_id`, `passenger_name`, `pickup_name`, `pickup_lat`, `pickup_lng`, `dest_name`, `dest_lat`, `dest_lng`, `distance_km`, `fare`, `status`, `expires_at`, `created_at`)
4. `ride_passengers` (`id`, `ride_id`, `passenger_id`, `fare`, `joined_at`)
5. `wallet_transactions` (`id`, `user_id`, `type`, `amount`, `description`, `ride_id`, `created_at`)
6. `chat_messages` (`id`, `ride_id`, `sender_id`, `sender_name`, `message`, `timestamp`)

---

## 🧪 Automated End-to-End Test Suite

Run the full headless verification suite:
```bash
# Starts test server and verifies all 8 API endpoints & matching calculations:
npx tsx test_e2e.ts
```
All 8 verification checks test:
- Database Reset
- Simple Auth (Name + PID)
- Ride Publishing (Seats & Vehicle)
- Corridor Proximity & Fare Calculation
- 2-Minute Join Request Timer & Approval
- Live Chat Messaging
- Slide to Complete & 1% Platform Fee Deduction
- Wallet Transaction Ledger
