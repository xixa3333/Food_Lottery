import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const web = join(dirname(fileURLToPath(import.meta.url)), "..");
async function jsFiles(dir) { return (await readdir(dir, { withFileTypes: true })).flatMap(e => e.isDirectory() ? [] : e.name.endsWith(".js") ? [join(dir, e.name)] : []); }

test("source contains no key, Geocoder construction, or unsafe HTML sink", async () => {
  const dirs = [join(web, "js"), join(web, "js", "ui"), join(web, "js", "services"), join(web, "js", "domain"), join(web, "js", "application")];
  const text = (await Promise.all((await Promise.all(dirs.map(jsFiles))).flat().map(f => readFile(f, "utf8")))).join("\n");
  assert.doesNotMatch(text, /AIza[0-9A-Za-z_-]{20,}/);
  assert.doesNotMatch(text, /new\s+google\.maps\.Geocoder|\.Geocoder\s*\(/);
  assert.doesNotMatch(text, /\.innerHTML\s*=/);
});

test("page defines CSP, versioned assets, and safe external links", async () => {
  const html = await readFile(join(web, "index.html"), "utf8");
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /js\/app\.js\?v=20260722-2/);
  assert.doesNotMatch(html, /<script[^>]+src="\.\/app\.js"/);
  for (const tag of html.match(/<a\b[^>]*target="_blank"[^>]*>/g) || []) assert.match(tag, /rel="noopener noreferrer"/);
});
