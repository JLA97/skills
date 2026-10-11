# Settings, clean-up and updates

Read this when SKILL.md section 0 sends you here.

When the arguments for this call (shown in section 0 of SKILL.md) start with `config` (for example `/answer-me-with-html config open off`), this turn handles settings only and produces no page:

- `config`: run `am config` to show the current settings, then let the user choose. Where the agent has a choice tool such as AskUserQuestion, use it: at most 4 settings at a time, these first: `open`, `theme`, `mode`, `style`, with the current value marked in the options. Otherwise ask in plain text.
- `config <key> <value>`: run `am config set <key> <value>`.
- `config reset [key]`: run `am config reset [key]`.

When the user asks in natural language ("stop opening the browser", "use the card theme by default"), also convert it to `am config set`. Settings: `open` (auto-open the browser), `theme`, `mode`, `style`, `voice` (video narration), `update_check` (new-version notices). Run `am config` to see all descriptions.

When the arguments start with `clean`, or the user asks to clean up pages / the cache: first run `am clean --dry-run` and tell the user how many items and how much space will be deleted. Run `am clean` only after the user agrees (add `--all` to delete all pages and videos, `--days N` to change how many days to keep).

When the arguments start with `update`, or the user asks to update this skill: update according to how it was installed. Installed with `npx skills`: run `npx skills update answer-me-with-html -y`. Installed as a Claude Code plugin: run `claude plugin update answer-me-with-html@answer-me-with-html` (or ask the user to click Update now in `/plugin` → Installed), then ask the user to run `/reload-plugins`. Installed with git clone: run `git pull && npm install` in the repository directory.

## Page server environment variables

- `AM_SERVE_HOST`: address on which `am serve` listens; defaults to `127.0.0.1`. For Tailscale, use the device's verified Tailscale IP so local proxy DNS cannot select a fake address.
- `AM_SERVE_PUBLIC_HOST`: domain name or IP used in generated HTTP links, without a scheme or port; defaults to `AM_SERVE_HOST`. The server accepts this host and its bind address in addition to the existing loopback hosts.
- `AM_HOME`: data directory shared by the server and rendering agents. Only HTML files directly under its `pages` or `videos` directories get server links.

Set these variables before starting `am serve`. They are saved in `serve-config.json` and the running server's `serve.json`, so subsequent render/patch commands need the same `AM_HOME` but do not need to repeat the bind/link variables. A shell environment file must be loaded explicitly; the CLI does not automatically load `.env` files.

`am render`, `am patch`, and `am video` automatically check the server for the same `AM_HOME`. An existing reachable instance is reused; otherwise a detached background instance is started. Other commands such as `config`, `lint`, `help`, and `clean` do not start the server. Automatic-start failures produce a warning while local page generation continues.

The persistent `serve-config.json` stores bind address, public host, and port. Explicit environment variables override saved address/host settings, and `am serve --port` overrides the saved port. The temporary `serve.json` contains the running process state and is removed on normal shutdown. Automatic startup reuses the persistent configuration after shutdown or reboot; use the same `AM_HOME` on subsequent invocations.

The persistent `serve.key` contains the random token key and is created with owner-only permissions. Existing server keys are migrated when available. Restarting a server reuses this key, preserving old HTTP links when host, port, directory, and filename remain unchanged. To intentionally rotate tokens, stop the server and delete or replace `serve.key` before starting it again. While an older runtime state is still available, a missing key can be migrated from that state instead of rotated. Renaming or deleting a page changes its URL or makes the old URL unavailable. Keep this key with the report directory when migrating the service.


## Confirmed Tailscale delivery on this installation

The user confirmed ownership of `leos-macbook-air.tail3f144.ts.net` and authorized publishing report pages to the existing Tailscale preview service. As verified on 2026-10-11, the bind address is `100.89.56.102`, the port is `8765`, and the service data directory is `/Users/leo/.codex/visualizations/2026/10/10/01a1283e-af51-77c0-be98-fe0dfa9addba`. Treat these values as a saved starting point, and verify the current config, listener, and report HTTP response before using them. This authorization covers requested report previews, not unrelated documents.

- Read the saved `serve-config.json` and redacted runtime metadata before choosing a new `AM_HOME`. Reuse the confirmed service when it is available.
- If sandbox rules require a separate local report directory, finish the page there and copy only the requested report into the confirmed service's `pages` directory, using the normal approved write mechanism. Keep the original local artifact; do not silently switch mobile delivery to loopback. Do not overwrite a different existing page, rotate keys, or stop another report service.
- Page URLs use a per-file token derived from the service's existing key, directory (`pages` or `videos`), and filename. Prefer the CLI's generated URL. For an already-created page, the bundled `pageLink`/`pageToken` logic gives the identical URL. Never expose `serve.key` or the runtime `secret`.
- Verify the actual page URL returns HTTP 200 and the expected HTML. For proxy fake-IP DNS, also verify by connecting to the recorded Tailscale IP with the configured domain as the HTTP Host. Report this as host-side verification; a mobile-device end-to-end test needs evidence from that device.
- Always return the local file link and the Tailscale page link together. Follow the host application's file-link syntax.

## Process detection and regression verification

`process.kill(pid, 0)` returning `EPERM` means the caller cannot inspect the PID; it is not proof that the process is absent. The CLI treats this result as eligible for a socket check. `os.uptime()` can also fail with a direct `EPERM` or an `ERR_SYSTEM_ERROR` whose `info.code` is `EPERM`; an unavailable boot time does not prove that saved state predates a reboot. Other uptime failures remain errors, and normal pre-reboot state is still rejected. `ESRCH`, invalid PIDs, and other probe failures stay negative. Server reuse additionally requires a successful TCP connection, while delivery verification checks the actual tokenized HTTP page.

After changing the server logic, run `node --test scripts/preview-server.test.mjs`. The regression suite covers permission-denied probes and repeated CLI renders against one existing server, including both output links. A warning alone is not evidence that a listening service failed.
