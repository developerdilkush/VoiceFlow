# VoiceFlow – Personal Voice Call Platform (MERN)

Consent-based automated voice calls: single calls, bulk calls (CSV/XLSX), Hindi/English text-to-speech, uploaded recordings, call history, reports, suppression list.

## Honest status
Written but **not executed end-to-end** (no network / MongoDB / telephony account was available when it was generated).
- Server: all files pass `node --check`; the pure-logic unit tests in `server/tests/utils.test.js` were run and pass.
- Not yet run by anyone: `npm install`, the frontend build, the frontend tests, the Mongo-backed flows, and **any real call**. Expect to fix small issues on first run.
- Real calls need your own Twilio account (see below). Providers: Twilio, Exotel (both untested live) and a dev mock. Verify Twilio's India outbound rules, caller-ID, pricing and TRAI/DLT requirements yourself before use.
- Password-reset flow is intentionally not implemented (single admin; use `create-admin`).

## Architecture
```
client/  React 18 + Vite + Tailwind + React Router + RHF/Zod + Recharts
server/  Express + Mongoose, JWT in HTTP-only cookie, Zod validation
  telephony/  provider adapters (twilio, mock) – initiateCall/getCallStatus/cancelCall/validateWebhook/normalizeWebhookEvent
  queue/      DB-backed bulk queue (atomic claims, concurrency + per-minute limits, retry/backoff, pause/resume/cancel)
  voice/      TTS voice catalog, signed audio URLs, TwiML builder
```
The queue runs **inside the API process** (no Redis). Run exactly one backend instance. Switch to BullMQ+Redis if you need horizontal scale.

## Prerequisites
Node 18.18+ (20+ recommended), MongoDB (local or Atlas).

## Setup
```bash
# backend
cd server && cp .env.example .env      # fill MONGODB_URI and JWT_SECRET (32+ chars)
npm install
# set ADMIN_EMAIL / ADMIN_PASSWORD in .env, then:
npm run create-admin                   # then delete ADMIN_PASSWORD from .env
npm run dev                            # http://localhost:5000

# frontend (second terminal)
cd client && cp .env.example .env && npm install
npm run dev                            # http://localhost:5173 (proxies /api to :5000)
```
Default `TELEPHONY_PROVIDER=exotel` (see "Real calls with Exotel" below). To try the UI without any provider set `TELEPHONY_PROVIDER=mock`: calls are **simulated** (badged "SIMULATED" in the UI) and NO phone rings. The mock refuses to start in production.

## Real calls with Twilio
1. In `server/.env`: `TELEPHONY_PROVIDER=twilio`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `PUBLIC_BASE_URL=https://your-backend`.
2. The backend must be reachable over HTTPS (locally use a tunnel such as ngrok). Status webhooks are sent per call to `PUBLIC_BASE_URL/api/v1/webhooks/twilio?cid=<callId>`; signatures (X-Twilio-Signature) are verified and events de-duplicated. No console webhook setup is needed.
3. Settings → Provider shows connection status. Hindi uses `Say language="hi-IN"` with Polly/Google voices; confirm the voice names in `server/src/voice/catalog.js` are enabled on your account.
4. Uploaded recordings are played via `<Play>` using a time-limited signed URL (`PUBLIC_BASE_URL/api/v1/voices/public/:id`). Files are stored on local disk (`UPLOAD_DIR`) – use a persistent volume. Untested against a live provider.
5. Trial accounts can only call verified numbers.

## Real calls with Exotel
Exotel works differently from Twilio: the call runs through a **flow you build in the Exotel dashboard**, and the message text is fetched from this server.
1. Backend must be on public HTTPS (`PUBLIC_BASE_URL`; use ngrok locally).
2. Generate `EXOTEL_SECRET` (20+ random chars). In Exotel create a flow: **Greeting applet → "Read text like a robot" → enter this URL** (not a fixed text):
   `https://YOUR_BACKEND/api/v1/webhooks/exotel/message?k=<EXOTEL_SECRET>`
   Exotel appends `CustomField=<our call id>`; the server replies `text/plain` with that call's message.
3. Copy the flow URL (`https://my.exotel.com/<SID>/exoml/start_voice/<FLOW_ID>`) into `EXOTEL_FLOW_URL`.
4. `.env`: `TELEPHONY_PROVIDER=exotel`, `EXOTEL_ACCOUNT_SID`, `EXOTEL_API_KEY`, `EXOTEL_API_TOKEN`, `EXOTEL_SUBDOMAIN` (api.in.exotel.com), `EXOTEL_CALLER_ID` (your ExoPhone), `EXOTEL_FLOW_URL`, `EXOTEL_SECRET`.
5. Status callbacks go to `/api/v1/webhooks/exotel?cid=..&k=<secret>` (Exotel does not sign webhooks, so the secret is the protection).
Limits: voice/language is chosen in the Greeting applet (not per call); Hindi TTS support depends on your Exotel account – confirm with Exotel; in-progress calls cannot be canceled; uploaded recordings must be 8 kHz mono 16-bit WAV/MP3 for Exotel (not validated here). Built from Exotel's public docs, **not tested against a live account**. Check DLT/TRAI compliance for promotional/transactional calls with Exotel.

## Safeguards implemented
Consent confirmation stored per call/job · suppression list (checked at creation and again at dispatch) · opt-out · allowed calling hours · per-operation and rolling-24h limits with server-side hard ceilings · minimum repeat interval · idempotency keys · atomic queue claims (no duplicate dispatch) · retries only for transient provider errors, never for completed calls · message text erased after `RETENTION_DAYS` · audit log · calls are never recorded.

## Metrics
See Reports → "How these numbers are calculated". Provider acceptance ≠ completion; final status only comes from verified webhooks (or reconciliation polling after 10 min).

## Security
bcrypt hashes · HTTP-only SameSite cookie · CSRF header guard (`X-Requested-With`) + CORS allow-list · Helmet · login/global/upload rate limits · Zod validation · upload magic-byte checks · spreadsheet formulas never evaluated, CSV exports neutralise formula injection · phone numbers masked in lists · no secrets in the frontend · sessions revocable (tokenVersion).
Production checklist: HTTPS, strong `JWT_SECRET`, `NODE_ENV=production`, `COOKIE_SAMESITE=none` only for cross-site deploys, `CLIENT_ORIGIN` set exactly, MongoDB auth + IP allow-list, backups.

## API (all under /api/v1)
auth (login, logout, me, change-password, revoke-sessions, activity) · dashboard (stats, recent-calls) · calls (POST, GET, GET/:id, POST/:id/cancel, export) · bulk (import, jobs CRUD-ish, pause/resume/cancel, export) · contacts (CRUD, import, export, opt-out) · voices (list, upload, rename, delete, audio) · reports (calls, usage) · suppression · settings · webhooks/:provider.
`POST /voices/preview` was replaced by in-browser preview (Web Speech API); the provider has no preview endpoint.

## Tests
`cd server && npm test` · `cd client && npm test`.
Not included: Mongo-backed integration tests (auth flow, idempotency, bulk import, rate limits) – add with `mongodb-memory-server` + `supertest`.

## Deployment
Frontend → Vercel/Netlify (`VITE_API_URL=https://api.example.com`). Backend → any Node host with a persistent disk (single instance). DB → MongoDB Atlas.

## Troubleshooting
- "Invalid configuration" on start: read the listed `.env` problems.
- Login works but next request is 401: cookie not stored – check `COOKIE_SAMESITE`, HTTPS, and `CLIENT_ORIGIN`.
- 403 CSRF: requests must include `X-Requested-With: voiceflow` (the client does).
- Calls stay "Initiated": webhooks not reaching `PUBLIC_BASE_URL` or signature mismatch (URL must match exactly).
- "Outside calling hours": adjust Settings → Calling safeguards.
