import { cp, mkdir, rm, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
await rm(dist, { recursive: true, force: true }); await mkdir(dist, { recursive: true });
for (const entry of ["index.html","404.html","styles.css","runtime-config.js","manifest.webmanifest","sw.js","SECURITY.md","assets","src","legal"]) {
  await cp(path.join(root, entry), path.join(dist, entry), { recursive: true });
}
console.log(`Built ${await countFiles(dist)} files in dist/`);
async function countFiles(dir){let total=0;for(const item of await readdir(dir,{withFileTypes:true}))total+=item.isDirectory()?await countFiles(path.join(dir,item.name)):1;return total;}
