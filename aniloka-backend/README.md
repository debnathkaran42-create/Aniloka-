# AniLoka Backend

Real Node.js + Express REST API for AniLoka: custom file-based database (no
Firebase, no MongoDB), JWT auth with hashed passwords, admin-only routes
enforced **server-side**, and a manual-verification UPI payment flow.

## Important — this cannot run inside Spck Editor

Spck only previews static HTML/CSS/JS. This is a real Node.js server — it
needs to run continuously somewhere with Node installed. The frontend
(`/aniloka` folder) still works fully on its own with local storage; once
you deploy this backend, point the frontend at it (one line, see below) and
it switches to real accounts/payments automatically.

**Free hosting options that work well for this:** Render.com (free web
service tier), Railway, Cyclic, Fly.io. All support "connect a repo, run
`npm start`" deployment.

## Setup

```bash
cd aniloka-backend
npm install
cp .env.example .env
```

Edit `.env`:
- `JWT_SECRET` — generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — your real admin login (auto-created on first boot)
- `UPI_VPA` — your real UPI ID to receive payments
- `CORS_ORIGIN` — your deployed frontend URL once you have one

```bash
npm start
```

Server runs on `http://localhost:4000` (or your `PORT`). Visit `/health` to confirm it's up.

## Connect the frontend

In `aniloka/js/api.js`, set:
```js
const BACKEND_URL = "https://your-deployed-backend-url.com";
```
That's it — `js/auth.js` automatically switches from local-only accounts to
real backend accounts once this is set. Nothing else in the frontend needs
to change to get real login/signup working.

## How data is stored

Every "table" (users, manga, chapters, premium, bookmarks, history,
transactions, notifications) is its own JSON file in `/data`, written
through `src/db/AnilokaDB.js` — a small database engine with in-memory
indexes for fast lookups (by email, by manga id, etc.) and atomic writes so
a crash mid-save can't corrupt data. This is a genuinely custom database,
not a wrapper around an existing one. It's file-based rather than a full
SQL server, which keeps it free and zero-config to deploy — swap it for
Postgres/SQLite later without touching any route/controller code, since
they only ever call `collection.find/insert/update/delete`.

## The UPI payment flow (free, manual verification)

No free UPI method can auto-confirm a payment without a payment gateway —
this implements the honest manual-verification flow instead:

1. `POST /api/transactions` — user picks a plan (or a paid chapter), gets
   back a UPI deep link + QR code pointing at your real UPI ID.
2. User pays in GPay/PhonePe/Paytm/BHIM, then submits the UTR (transaction
   reference number) via `POST /api/transactions/:id/submit-utr`.
3. You check your bank/UPI app for that UTR, then approve or reject it from
   the admin dashboard (`POST /api/admin/transactions/:id/verify` or
   `/reject`). Verifying automatically activates premium (or unlocks the
   chapter) and expiry dates, and sends the user a notification.

## Admin access

The first admin account is auto-created from `.env` on first boot. Admin
routes (`/api/admin/*`, manga/chapter mutations) require **both** a valid
login *and* `role: "admin"` on the account — checked on the server, so
unlike the old static-site version, a regular user cannot get in no matter
what they do in their browser's dev tools.

On the frontend, there's no public "Admin" link anywhere. On the Profile
page, tapping the AniLoka logo 7 times within 3 seconds reveals an "Admin
Panel" link in Settings — a convenience shortcut for you, not a security
boundary (the real boundary is the server-side role check above).

## API overview

| Area | Routes |
|---|---|
| Auth | `POST /api/auth/signup, /login, /logout`, `GET /me`, `POST /forgot-password, /reset-password` |
| Manga | `GET/POST /api/manga`, `GET/PUT/DELETE /api/manga/:id` |
| Chapters | `GET /api/chapters/:id`, `POST /api/chapters/manga/:mangaId`, `PUT/DELETE /api/chapters/:id` |
| Premium | `GET /api/premium/plans, /status` |
| Transactions | `POST /api/transactions`, `POST /:id/submit-utr`, `GET /mine` |
| Admin | `GET /api/admin/dashboard, /users`, `PUT /users/:id/role`, `POST /users/:id/grant-premium, /revoke-premium`, `GET /admin/transactions`, `POST /admin/transactions/:id/verify, /reject` |
| Bookmarks / History | `GET/POST /api/bookmarks`, `DELETE /:id`, `GET/POST /api/history` |
| Notifications | `GET /api/notifications`, `POST /:id/read`, `POST /broadcast` (admin) |
| Uploads | `POST /api/upload/cover, /banner, /pages` (admin, multipart form) |

## Security included

Helmet security headers, CORS locked to your frontend origin, rate limiting
(strict on auth routes, general on everything else), bcrypt password
hashing, JWT in an httpOnly cookie, CSRF double-submit-cookie protection on
every mutating request, input validation on all write endpoints, a central
error handler that never leaks stack traces to clients, and a persistent
logger (`/logs`) for both HTTP access and app-level events.

## A note on testing

This code follows standard, well-established Express patterns throughout
and every file has been syntax-checked, plus the custom database engine
(`AnilokaDB.js`) was actually executed and verified (inserts, indexed
lookups, updates, deletes, disk persistence across restarts). The full
Express app itself hasn't been run end-to-end in this environment (no
internet access here to `npm install`) — run `npm start` and test the
`/health` route first after your own `npm install` to confirm it boots
cleanly on your machine/host before wiring up the frontend.

## Legal pages

Not included as backend routes — add `privacy.html`, `terms.html`,
`refund-policy.html`, `about.html`, `contact.html` etc. as static pages in
the `/aniloka` frontend folder (same pattern as every other page there).
Say the word and I'll draft these next.
