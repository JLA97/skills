import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomBytes, createHmac } from "node:crypto";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { runInNewContext } from "node:vm";
import test from "node:test";

const execFileAsync = promisify(execFile);
const cli = process.env.AM_PREVIEW_CLI ?? join(dirname(fileURLToPath(import.meta.url)), "am.mjs");
const bundled = await readFile(cli, "utf8");
const aliveSource = bundled.slice(bundled.indexOf("function alive(pid) {"), bundled.indexOf("var BOOT_SLACK_MS"));
const bootSource = bundled.slice(bundled.indexOf("var BOOT_SLACK_MS"), bundled.indexOf("function readServeInfo(home) {"));

function probeWith(kill) {
	return runInNewContext(`${aliveSource}\nalive`, { process: { kill } });
}

test("EPERM does not establish that a server PID is absent", () => {
	const alive = probeWith(() => { throw Object.assign(new Error("Denied"), { code: "EPERM" }); });
	assert.equal(alive(123), true);
});

test("missing PIDs and unrelated failures remain negative", () => {
	for (const code of ["ESRCH", "EACCES", "EINVAL", undefined]) {
		const alive = probeWith(() => { throw Object.assign(new Error("Probe failed"), { code }); });
		assert.equal(alive(123), false, String(code));
	}
	assert.equal(probeWith(() => {})(123), true);
});

test("invalid PIDs never reach the operating-system probe", () => {
	const alive = probeWith(() => assert.fail("Unexpected PID probe"));
	for (const pid of [0, -1, 1.5, NaN, "123", null, undefined]) {
		assert.equal(alive(pid), false);
	}
});

test("denied uptime inspection does not establish stale server state", () => {
	for (const error of [Object.assign(new Error("Denied"), { code: "EPERM" }), Object.assign(new Error("uv_uptime failed"), { code: "ERR_SYSTEM_ERROR", info: { code: "EPERM" } })]) {
		const stale = runInNewContext(`${bootSource}\nbootedBefore`, { uptime: () => { throw error; }, Date });
		assert.equal(stale(Date.now()), false);
	}
});

test("ordinary boot checks still reject pre-reboot state and propagate unrelated errors", () => {
	const stale = runInNewContext(`${bootSource}\nbootedBefore`, { uptime: () => 10, Date: { now: () => 20_000 } });
	assert.equal(stale(4_000), true);
	assert.equal(stale(6_000), false);
	const error = Object.assign(new Error("Unrelated uptime failure"), { code: "EIO" });
	const broken = runInNewContext(`${bootSource}\nbootedBefore`, { uptime: () => { throw error; }, Date });
	assert.throws(() => broken(Date.now()), (e) => e === error);
});

test("repeated renders reuse a listening server under EPERM and print both links", async (t) => {
	const home = await mkdtemp(join(tmpdir(), "am-preview-regression-"));
	t.after(() => rm(home, { recursive: true, force: true }));
	await mkdir(join(home, "pages"));
	const secret = randomBytes(32).toString("hex");
	const server = createServer(async (req, res) => {
		try {
			const [, prefix, token, encoded] = req.url.split("/");
			const file = decodeURIComponent(encoded);
			const expected = createHmac("sha256", secret).update(`pages/${file}`).digest("base64url").slice(0, 22);
			if (prefix !== "p" || token !== expected || file.includes("/")) throw new Error("Bad page URL");
			const page = await readFile(join(home, "pages", file));
			res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
			res.end(page);
		} catch {
			res.writeHead(404);
			res.end();
		}
	});
	await new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", resolve);
	});
	t.after(() => new Promise((resolve) => {
		server.closeAllConnections();
		server.close(resolve);
	}));
	const port = server.address().port;
	const config = { host: "127.0.0.1", publicHost: "preview.test.ts.net", port };
	const state = { ...config, pid: process.pid, secret, startedAt: Date.now() };
	await writeFile(join(home, "serve-config.json"), JSON.stringify(config));
	await writeFile(join(home, "serve.json"), JSON.stringify(state));
	await writeFile(join(home, "serve.key"), secret, { mode: 0o600 });
	await writeFile(join(home, "config.json"), JSON.stringify({ open: false, update_check: false }));
	const draft = join(home, "draft.md");
	await writeFile(draft, "---\ntitle: Preview regression\n---\n## A Result\nThe existing server returns this page.\n");
	const preload = join(home, "deny-pid-probe.mjs");
	await writeFile(preload, `import os from 'node:os';\nimport {syncBuiltinESMExports} from 'node:module';\nos.uptime = () => { throw Object.assign(new Error('Sandbox uptime denied'), { code: 'ERR_SYSTEM_ERROR', info: {code: 'EPERM'} }); };\nsyncBuiltinESMExports();\nconst original = process.kill;\nprocess.kill = (pid, signal) => {\n if (signal === 0) throw Object.assign(new Error('Sandbox probe denied'), { code: 'EPERM' });\n return original(pid, signal);\n};\n`);
	for (const file of ["first.html", "second.html"]) {
		const out = join(home, "pages", file);
		const { stdout, stderr } = await execFileAsync(process.execPath, ["--import", preload, cli, "render", draft, "--out", out, "--no-open"], {
			env: { ...process.env, AM_HOME: home, AM_SERVE_HOST: config.host, AM_SERVE_PUBLIC_HOST: config.publicHost },
			timeout: 10_000,
		});
		assert.doesNotMatch(stderr, /startup failed|already in use/);
		assert.match(stdout, /file: file:\/\//);
		const remote = stdout.match(/link: (http:\/\/\S+)/)?.[1];
		assert.ok(remote, "Missing remote page link");
		const url = new URL(remote);
		assert.equal(url.hostname, config.publicHost);
		assert.equal(Number(url.port), port);
		const response = await fetch(`http://127.0.0.1:${port}${url.pathname}`);
		assert.equal(response.status, 200);
		assert.equal(await response.text(), await readFile(out, "utf8"));
		assert.deepEqual(JSON.parse(await readFile(join(home, "serve.json"), "utf8")), state);
	}
	await assert.rejects(readFile(join(home, "serve.log")), { code: "ENOENT" });
});
