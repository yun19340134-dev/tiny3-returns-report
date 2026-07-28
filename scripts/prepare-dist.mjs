import fs from "node:fs/promises";
import path from "node:path";

const source = path.resolve("out");
const destination = path.resolve("dist");

await fs.rm(destination, { recursive: true, force: true });
await fs.cp(source, destination, { recursive: true });
console.log(`Prepared static deployment directory: ${destination}`);
