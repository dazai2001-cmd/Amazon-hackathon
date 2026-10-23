# Running and optional hosting

A domain and hosted service are optional. Local play uses the included Node server, a TV/browser screen and an Android phone; see [the setup and requirements](REVIEWER_GUIDE.md).

For local play, `npm run dev` supplies HTTP for the TV and development HTTPS for Wi-Fi phones. USB localhost is an optional camera connection; Wi-Fi QR pairing works without a cable. See [device playtest instructions](DEVICE_PLAYTEST.md).

## Optional public HTTPS

The Dockerfile and `deploy/compose.yml` prepare the same app behind Caddy, with WebSocket forwarding, response compression and trusted HTTPS certificates. Nothing is provisioned or deployed automatically. These files have not been exercised against a public domain during this change.

If you later choose a server and domain:

1. Point that domain’s DNS to the server and make ports 80/443 reachable.
2. Set `PUBLIC_HOST` to the hostname, then run `docker compose -f deploy/compose.yml up --build -d` from the repository.
3. Open `https://YOUR_HOST/` on the TV and scan its phone QR. Both pages and the WebSocket relay use the same origin.

The reverse proxy terminates trusted HTTPS; `TLS_ENABLED=false` disables the app’s local development certificate. `PHONE_BASE_URL` is the public HTTPS origin. The game server is reachable only inside the Compose network. The persisted volume contains clan records and completed results, without camera frames, raw landmarks or pairing tokens. Active rooms and duels remain temporary and are never restored as a fabricated win after a restart.

For a custom deployment, set `DATA_DIR` to a writable persistent directory and back up `clans.json` and `clans.json.previous`. Use one Node process; concurrent multi-process matchmaking and account-backed membership are outside this local prototype’s contract. Player profiles, training, gear and story saves remain on each TV/browser device.
