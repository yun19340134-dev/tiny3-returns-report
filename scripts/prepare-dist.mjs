import fs from "node:fs/promises";
import path from "node:path";

const source = path.resolve("out");
const destination = path.resolve("dist");
const assets = path.join(destination, "assets");
const server = path.join(destination, "server");
const metadata = path.join(destination, ".openai");

await fs.rm(destination, { recursive: true, force: true });
await fs.mkdir(server, { recursive: true });
await fs.mkdir(metadata, { recursive: true });
await fs.cp(source, assets, { recursive: true });
await fs.copyFile(
  path.resolve(".openai", "hosting.json"),
  path.join(metadata, "hosting.json")
);
await fs.writeFile(
  path.join(server, "index.js"),
  `export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  }
};
`,
  "utf8"
);

console.log(`Prepared Sites deployment directory: ${destination}`);
