import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../styles/ai-daily.module.css", import.meta.url), "utf8");
const archive = await readFile(new URL("../components/ai-daily/AiDailyArchive.tsx", import.meta.url), "utf8");
const detail = await readFile(new URL("../components/ai-daily/AiDailyDetail.tsx", import.meta.url), "utf8");

test("AI Daily declares the approved Bauhaus color system", () => {
  assert.match(css, /--bauhaus-red:\s*#E53935;/);
  assert.match(css, /--bauhaus-yellow:\s*#FDD835;/);
  assert.match(css, /--bauhaus-blue:\s*#1E88E5;/);
  assert.match(css, /--bauhaus-black:\s*#212121;/);
  assert.match(css, /--bauhaus-white:\s*#FAFAFA;/);
  assert.match(css, /--bauhaus-gray:\s*#9E9E9E;/);
});

test("AI Daily avoids the old dark signal visual language", () => {
  assert.doesNotMatch(css, /#090b0f|#101822|#071016/i);
  assert.doesNotMatch(css, /radial-gradient/i);
  assert.doesNotMatch(css, /border-radius:\s*8px/i);
});

test("AI Daily renders Bauhaus geometry primitives on archive and detail pages", () => {
  for (const className of ["heroGeometry", "geometryCircle", "geometryTriangle", "geometrySquare"]) {
    assert.match(css, new RegExp(`\\.${className}\\b`));
    assert.match(archive, new RegExp(`styles\\.${className}\\b`));
    assert.match(detail, new RegExp(`styles\\.${className}\\b`));
  }
});
