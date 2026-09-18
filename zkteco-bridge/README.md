# ZKTeco K40 Sync Bridge

Pushes attendance punches from your ZKTeco K40 into Supabase for Protees Business Manager.

## Why this exists (read this first)

Protees Business Manager runs on Vercel — in the cloud. It has **no network path** to a
device sitting on your office LAN (something like `192.168.1.201`), the same way no
website can reach a printer on your home Wi-Fi. That's true of any cloud app, not a
limitation of this one.

So this script is a separate, small program that runs on a **PC physically on the same
office network as the K40**. It connects to the machine directly, reads the punch logs,
and pushes them into the same Supabase database the web app reads from. The web app never
talks to the K40 — it just reads the attendance rows this script writes.

```
K40  →  (LAN)  →  this script (on an office PC)  →  Supabase  →  Protees Business Manager
```

## Requirements

- A Windows, Mac, or Linux PC that's usually on, connected to the same network as the K40
  (Wi-Fi or Ethernet — anything that can reach the K40's IP address)
- [Node.js](https://nodejs.org) 18 or newer installed on that PC
- The K40's IP address (on the device: Menu → Comm → Ethernet, or check your router's
  connected-devices list)

## Setup

1. Copy this whole `zkteco-bridge` folder onto the office PC (or clone the repo there).
2. Open a terminal in this folder and run:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` — find both in your Supabase project under
   **Settings → API**. The service role key bypasses login the same way the
   Shopify sync function already does — never put this key in the web app itself.
4. In Protees Business Manager, go to **Attendance → Settings → ZKTeco Devices** and add
   the K40's IP address (and port — 4370 is the default and almost always correct).
5. On the **Employees** page, open each employee and set **ZKTeco Machine User ID** to
   their enrollment number on the K40 (the small ID number you assigned when enrolling
   their fingerprint). Punches from an unmapped device user id are skipped and reported
   in the sync output — nothing is silently lost, but nothing is attributed either until
   this is set.
6. Test it:
   ```bash
   npm run sync
   ```
   You should see something like `Fetched N raw punch logs` and `Done — N attendance rows
   upserted.` Check the Attendance page in the app — today's punches should appear.

## Keeping it running

Pick one:

**Option A — scheduled task (recommended, lowest maintenance)**
Run `npm run sync` on a schedule.
- **Windows**: Task Scheduler → Create Task → Trigger "every 15 minutes" → Action
  `node.exe` with argument `sync.js`, "Start in" set to this folder.
- **Mac/Linux**: a cron entry, e.g. every 15 minutes:
  ```
  */15 * * * * cd /path/to/zkteco-bridge && /usr/local/bin/node sync.js >> sync.log 2>&1
  ```

**Option B — leave a terminal running**
```bash
npm run watch
```
Syncs immediately, then every 15 minutes (override with `SYNC_INTERVAL_MINUTES=5` in
`.env`). Stops if the terminal closes or the PC sleeps — fine for testing, less reliable
for production than a scheduled task.

## How it works

- Every punch on the K40 is grouped by employee + calendar day: the **earliest** punch
  that day becomes Check-In, the **latest** becomes Check-Out.
- Working hours, late minutes, overtime, and shortage are computed from
  **Attendance → Settings** (standard hours, break minutes, start time, grace period) —
  change the rules there, not in this script.
- Each employee-day is **upserted** (not inserted) — re-running the sync is always safe.
  It never creates duplicate rows; it just recomputes that day from whatever punches
  exist so far.
- A day already marked manually in the app (e.g. Paid Leave) gets overwritten by a
  machine sync if that employee also has a punch that day — the machine is treated as the
  source of truth for actual attendance. If you need a manual override to stick, mark it
  the same day the machine data is fetched, or note it and re-apply after syncing.

## Troubleshooting

- **"Could not connect to \<ip\>:4370"** — check the PC running this script and the K40
  are actually on the same network/subnet, the IP hasn't changed (some routers reassign
  IPs — consider a static IP or DHCP reservation for the K40), and nothing (a firewall,
  a VLAN) is blocking port 4370 between them.
- **"No active device configured"** — add one from Attendance → Settings in the app, or
  set `DEVICE_IP` in `.env` to force it.
- **Punches aren't showing up for someone** — check their `Employee → ZKTeco Machine User
  ID` matches the enrollment id on the K40 exactly (it's shown in the sync output under
  "punches were from device user ids with no matching employee").
