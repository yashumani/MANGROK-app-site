import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Alchemy exposes a persistent staged progress surface with cancellation", async () => {
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
  assert.match(source, /function acquireWakeLock\(/);
});

test("progress distinguishes measured model download from indeterminate reasoning", async () => {
  const ui = await read("src/alchemy-ui.js");
  const ai = await read("src/local-ai.js");
  assert.match(ui, /metadata\.measured === true/);
  assert.match(ui, /Step \$\{index \+ 1\} of \$\{order\.length\}/);
  assert.doesNotMatch(ui, /state\.progressValue \+ \(state\.progressValue/);
  assert.match(ai, /measured: Number\.isFinite\(raw\)/);
  assert.match(ai, /stage: "reason"/);
  assert.match(ai, /stage: "validate"/);
});

test("mobile Alchemy uses screen-level step navigation and a sticky run action", async () => {
  const source = await read("src/alchemy-ui.js");
  const css = await read("assets/css/alchemy.css");
  assert.match(source, /data-alchemy-step="elements"/);
  assert.match(source, /data-alchemy-step="formula"/);
  assert.match(source, /data-alchemy-step="insights"/);
  assert.match(source, /data-mobile-step/);
  assert.match(source, /id="alchemy-mobile-run"/);
  assert.match(source, /id="alchemy-mobile-formula-summary"/);
  assert.match(css, /\.alchemy-mobile-actionbar/);
  assert.match(css, /position:sticky/);
});

test("mobile shell uses five readable destinations plus a text-led More sheet", async () => {
  const html = await read("index.html");
  const css = await read("assets/css/alchemy.css");
  assert.match(html, /id="mobile-more-button"/);
  assert.match(html, /id="mobile-more-dialog"/);
  assert.match(html, /data-mobile-action="account"/);
  assert.match(html, /data-mobile-action="activity"/);
  assert.match(html, /data-mobile-action="theme"/);
  assert.match(css, /grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(css, /font-size:9px/);
  assert.match(css, /\.mobile-more-sheet/);
});

test("mobile shell is viewport-fitted, keyboard-aware, and remembers page scroll", async () => {
  const css = await read("assets/css/alchemy.css");
  const source = await read("src/mobile-shell.js");
  assert.match(css, /height:100dvh/);
  assert.match(css, /overflow:hidden/);
  assert.match(css, /mobile-keyboard-open/);
  assert.match(source, /visualViewport/);
  assert.match(source, /--mobile-keyboard-height/);
  assert.match(source, /scrollIntoView/);
  assert.match(source, /sessionStorage\.setItem/);
  assert.match(source, /mangrok:view-changed/);
});

test("Alchemy restores a bounded draft between app sessions", async () => {
  const source = await read("src/alchemy-ui.js");
  assert.match(source, /mangrok\.alchemy\.draft\.v1/);
  assert.match(source, /function saveDraft\(/);
  assert.match(source, /function restoreDraft\(/);
  assert.match(source, /slice\(0, 80\)/);
  assert.match(source, /clampNumber\(value\.time, 1, 360/);
});

test("the app-shell release invalidates the prior PWA shell", async () => {
  const sw = await read("sw.js");
  const runtime = await read("runtime-config.js");
  assert.match(sw, /mangrok-v7-mobile-app-shell/);
  assert.match(sw, /src\/mobile-shell\.js/);
  assert.match(runtime, /3\.3\.0-alpha\.4/);
  assert.match(runtime, /src\/mobile-shell\.js/);
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
