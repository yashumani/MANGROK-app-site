import { readFile, access, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = ["index.html","styles.css","runtime-config.js","manifest.webmanifest","sw.js","src/app.js","src/model.js","src/crypto.js","src/store.js","src/cloud.js","src/print.js","supabase/migrations/001_platform.sql","SECURITY.md"];
for(const file of required) await access(path.join(root,file));
JSON.parse(await readFile(path.join(root,"manifest.webmanifest"),"utf8"));
for(const file of (await walk(path.join(root,"src"))).filter(f=>f.endsWith(".js"))) execFileSync(process.execPath,["--check",file],{stdio:"pipe"});
const browserText = await Promise.all(["runtime-config.js",...(await walk(path.join(root,"src"))).filter(f=>f.endsWith(".js")).map(f=>path.relative(root,f))].map(f=>readFile(path.join(root,f),"utf8")));
if(browserText.some(text=>/SUPABASE_SERVICE_ROLE_KEY|service[_-]?role\s*[:=]\s*["'][A-Za-z0-9]/i.test(text))) throw new Error("Service-role material detected in browser source");
const html=await readFile(path.join(root,"index.html"),"utf8");
for(const id of ["recipe-dialog","recipe-grid","book-form","legacy-form","auth-dialog"])if(!html.includes(`id="${id}"`))throw new Error(`Missing UI element ${id}`);
if(!html.includes("Content-Security-Policy"))throw new Error("Missing CSP");
const sql=await readFile(path.join(root,"supabase/migrations/001_platform.sql"),"utf8");
for(const phrase of ["enable row level security","guard_and_version_recipe","create_recipe_share_link","human_review_required","recipe_assets_storage_select"])if(!sql.toLowerCase().includes(phrase.toLowerCase()))throw new Error(`Missing SQL security contract: ${phrase}`);
console.log("Static validation passed.");
async function walk(dir){const files=[];for(const item of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,item.name);if(item.isDirectory())files.push(...await walk(p));else files.push(p);}return files;}
