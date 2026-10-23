// Uploads the Worker to Cloudflare and (optionally) attaches or removes its routes. No dependencies: Node's own fetch.
//
//   CLOUDFLARE_API_TOKEN=...  node deploy.mjs              upload only (routes untouched)
//   CLOUDFLARE_API_TOKEN=...  node deploy.mjs --preview    upload and open it on its workers.dev address for testing
//   CLOUDFLARE_API_TOKEN=...  node deploy.mjs --routes     upload and route chatterbub.com/title/* and /sitemap.xml to it
//   CLOUDFLARE_API_TOKEN=...  node deploy.mjs --remove-routes   take the routes off again (instant rollback)
//
// The token needs Account → Workers Scripts: Edit and Zone (chatterbub.com) → Workers Routes: Edit. It lives in Key
// Vault as cloudflare-workers-token; never commit it or paste it into chat.

import { readFile } from "node:fs/promises";

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID ?? "5c169c7da7ff3ff7c31b898307aa27c5";
const ZONE_NAME = "chatterbub.com";
const SCRIPT = "chatterbub-seo";
const ROUTES = ["chatterbub.com/title/*", "chatterbub.com/sitemap.xml"];
const COMPATIBILITY_DATE = "2026-10-01";

const token = process.env.CLOUDFLARE_API_TOKEN;
if (!token) throw new Error("Set CLOUDFLARE_API_TOKEN (Workers Scripts edit + Workers Routes edit).");
const args = new Set(process.argv.slice(2));

async function cf(method, path, body, isForm = false) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(isForm || body === undefined ? {} : { "content-type": "application/json" }) },
    body: isForm ? body : body === undefined ? undefined : JSON.stringify(body)
  });
  const json = await res.json().catch(() => ({}));
  if (!json.success) throw new Error(`${method} ${path} failed: ${JSON.stringify(json.errors ?? res.status)}`);
  return json.result;
}

async function upload() {
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify({ main_module: "index.js", compatibility_date: COMPATIBILITY_DATE })], { type: "application/json" }));
  for (const name of ["index.js", "seo.js"]) {
    const code = await readFile(new URL(`./src/${name}`, import.meta.url));
    form.append(name, new Blob([code], { type: "application/javascript+module" }), name);
  }
  await cf("PUT", `/accounts/${ACCOUNT_ID}/workers/scripts/${SCRIPT}`, form, true);
  console.log(`uploaded ${SCRIPT}`);
}

async function zoneId() {
  const zones = await cf("GET", `/zones?name=${ZONE_NAME}`);
  return zones[0].id;
}

if (!args.has("--remove-routes")) await upload();

if (args.has("--preview")) {
  await cf("POST", `/accounts/${ACCOUNT_ID}/workers/scripts/${SCRIPT}/subdomain`, { enabled: true, previews_enabled: false });
  const { subdomain } = await cf("GET", `/accounts/${ACCOUNT_ID}/workers/subdomain`);
  console.log(`preview: https://${SCRIPT}.${subdomain}.workers.dev/title/movie/1400940`);
}

if (args.has("--routes") || args.has("--remove-routes")) {
  const zone = await zoneId();
  const existing = await cf("GET", `/zones/${zone}/workers/routes`);
  for (const pattern of ROUTES) {
    const found = existing.find((r) => r.pattern === pattern);
    if (args.has("--remove-routes")) {
      if (found) { await cf("DELETE", `/zones/${zone}/workers/routes/${found.id}`); console.log(`removed route ${pattern}`); }
    } else if (!found) {
      await cf("POST", `/zones/${zone}/workers/routes`, { pattern, script: SCRIPT });
      console.log(`added route ${pattern}`);
    } else {
      console.log(`route ${pattern} already there`);
    }
  }
}
