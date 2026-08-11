import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Alchemy exposes a visible staged progress surface with cancellation", async () => {
  const source = await read("src/alchemy-ui.js");
  assert.match(source, /class="alchemy-progress-sheet"/);
  assert.match(source, /data-progress-stage="prepare"/);
  assert.match(source, /data-progress-stage="model"/);
  assert.match(source, /data-progress-stage="reason"/);
  assert.match(source, /data-progress-stage="validate"/);
  assert.match(source, /id="alchemy-progress-percent"/);
  assert.match(source, /id="alchemy-progress-time"/);
  assert.match(source, /id="alchemy-cancel"/);
  assert.match(source, /function cancelRun\(/);
});

test("mobile Alchemy uses screen-level step navigation", async () => {
  const source = await read("src/alchemy-ui.js");
  assert.match(source, /data-alchemy-step="elements"/);
  assert.match(source, /data-alchemy-step="formula"/);
  assert.match(source, /data-alchemy-step="insights"/);
  assert.match(source, /data-mobile-step/);
  assert.match(source, /function setMobileStep\(/);
});

test("mobile shell is viewport-fitted and reserves six bottom destinations", async () => {
  const css = await read("assets/css/alchemy.css");
  assert.match(css, /height:100dvh/);
  assert.match(css, /overflow:hidden/);
  assert.match(css, /grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(css, /\.view\.active\{height:100%/);
  assert.match(css, /\.alchemy-mobile-steps/);
  assert.match(css, /\.alchemy-progress-sheet/);
});

test("the mobile usability release invalidates the prior PWA shell", async () => {
  const sw = await read("sw.js");
  const runtime = await read("runtime-config.js");
  assert.match(sw, /mangrok-v6-mobile-progress/);
  assert.match(runtime, /3\.2\.0-alpha\.3/);
});

test("generated culinary SVG assets are well formed", async () => {
  for (const name of ["hero", "ingredients", "equipment", "insights", "evolution"]) {
    const svg = await read(`assets/generated/${name}.svg`);
    const stack = [];
    for (const token of svg.match(/<\/?[A-Za-z][^>]*>/g) || []) {
      if (token.startsWith("</")) {
        const closing = token.match(/^<\/([A-Za-z][\w:-]*)/)?.[1];
        assert.equal(closing, stack.pop(), `${name}.svg has mismatched tags`);
      } else if (!token.endsWith("/>")) {
        const opening = token.match(/^<([A-Za-z][\w:-]*)/)?.[1];
        if (opening) stack.push(opening);
      }
    }
    assert.deepEqual(stack, [], `${name}.svg has unclosed tags`);
  }
});
