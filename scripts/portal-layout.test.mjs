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

test("portal exposes the remaining game, photos and tools entries", () => {
  assert.match(portalPage, /href:\s*"\/games"/);
  assert.match(portalPage, /href:\s*"\/photos"/);
  assert.match(portalPage, /href:\s*"\/tools"/);
  assert.doesNotMatch(portalPage, /signal-arena|ai-daily|universe/);
  assert.match(
    portalPage,
    /<Link[\s\S]*href=\{item\.href\}[\s\S]*prefetch=\{item\.prefetch\}[\s\S]*className=\{`\$\{styles\.panel\} \$\{styles\.panelLink\} \$\{item\.className\}`\}/
  );
});

test("portal cover fills the first viewport before the directory panels", () => {
  assert.match(portalCss, /\.cover\s*\{[\s\S]*min-height:\s*100svh/);
  assert.doesNotMatch(portalCss, /\.cover\s*\{[\s\S]*min-height:\s*58svh/);
});
