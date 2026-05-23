import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const rootLayout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
const portalPage = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const portalCss = await readFile(new URL("../styles/portal.module.css", import.meta.url), "utf8");

test("root layout declares smooth scroll behavior for Next route transitions", () => {
  assert.match(rootLayout, /<html[^>]*data-scroll-behavior="smooth"/);
});

test("mobile portal panels keep comic borders and actions inside the viewport", () => {
  assert.match(portalCss, /@media \(max-width: 640px\)[\s\S]*\.comicGrid[\s\S]*width: min\(100%, calc\(100vw - 2\.5rem\)\)/);
  assert.match(portalCss, /@media \(max-width: 640px\)[\s\S]*\.panel[\s\S]*border-width: 4px/);
  assert.match(portalCss, /@media \(max-width: 640px\)[\s\S]*\.panelAction[\s\S]*align-self: flex-start/);
});

test("portal keeps a visible sealed panel for future sub-sites", () => {
  assert.match(portalPage, /const sealedPanels = \[/);
  assert.match(portalPage, /CLASSIFIED/);
  assert.match(portalPage, /未完待续/);
  assert.match(portalPage, /styles\.sealedPanel/);
});

test("portal exposes Signal Arena while preserving sealed panel", () => {
  assert.match(portalPage, /SIGNAL ARENA/);
  assert.match(portalPage, /href:\s*"\/signal-arena"/);
  assert.match(portalPage, /maysssss\.cn\/signal-arena/);
  assert.match(portalPage, /CLASSIFIED/);
  assert.match(portalPage, /未完待续/);
  assert.match(portalPage, /sealedPanels/);
});

test("Signal Arena is promoted as the first visible portal entry", () => {
  assert.ok(portalPage.indexOf("SIGNAL ARENA") < portalPage.indexOf("PLAYER ONE"));
  assert.match(portalCss, /\.cover\s*\{[\s\S]*min-height:\s*58svh/);
  assert.match(portalCss, /\.signalArenaPanel\s*\{[\s\S]*grid-column:\s*1 \/ -1/);
});
