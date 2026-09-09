const fs = require("node:fs");
const path = require("node:path");
// Read the web app's light theme at build/development time; no runtime dependency.
const source = path.resolve(process.argv[2] || "../kshana-fe/app/globals.css");
const css = fs.readFileSync(source, "utf8");
const root = css.match(/:root\s*\{([^}]+)\}/)?.[1];
if (!root) throw new Error("Web theme :root block not found");
const tokens = Object.fromEntries(
  [...root.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, key, value]) => [
    key,
    value.trim(),
  ]),
);
for (const key of [
  "background",
  "foreground",
  "primary",
  "brand-orange",
  "border",
  "radius",
]) {
  if (!tokens[key]) throw new Error("Missing web theme token: " + key);
}
fs.writeFileSync(
  path.join(__dirname, "../src/webTheme.json"),
  JSON.stringify(tokens, null, 2) + "\n",
);
console.log("Synced " + Object.keys(tokens).length + " web theme tokens.");
