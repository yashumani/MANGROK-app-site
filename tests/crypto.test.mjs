import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
if(!globalThis.crypto)globalThis.crypto=webcrypto;
import { encryptSecret,decryptSecret,encryptShareEnvelope,decryptShareEnvelope,secretFingerprint } from "../src/crypto.js";

test("sealed notes round-trip with AES-GCM",async()=>{const payload=await encryptSecret("2 pinches of saffron","a-long-family-passphrase","recipe_123");assert.equal(await decryptSecret(payload,"a-long-family-passphrase","recipe_123"),"2 pinches of saffron");assert.match(secretFingerprint(payload),/^1:310000:/);});
test("wrong passphrase fails closed",async()=>{const payload=await encryptSecret("secret","correct-passphrase-123","recipe_123");await assert.rejects(()=>decryptSecret(payload,"incorrect-passphrase","recipe_123"),/incorrect|altered/i);});
test("ciphertext is bound to the canonical recipe id",async()=>{const payload=await encryptSecret("secret","correct-passphrase-123","recipe_123");await assert.rejects(()=>decryptSecret(payload,"correct-passphrase-123","recipe_other"),/incorrect|altered/i);});
test("share envelope key decrypts but is not embedded in payload",async()=>{const {payload,fragmentKey}=await encryptShareEnvelope("shared secret");assert.equal(await decryptShareEnvelope(payload,fragmentKey),"shared secret");assert.ok(!JSON.stringify(payload).includes(fragmentKey));});
