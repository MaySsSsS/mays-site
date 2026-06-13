import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageFile = await readFile(new URL("../app/tools/idea-lab/page.tsx", import.meta.url), "utf8");
const componentFile = await readFile(new URL("../components/tools/IdeaLab.tsx", import.meta.url), "utf8");
const cssFile = await readFile(new URL("../styles/tools/idea-lab.module.css", import.meta.url), "utf8");
const toolsHub = await readFile(new URL("../app/tools/page.tsx", import.meta.url), "utf8");
const packageJson = await readFile(new URL("../package.json", import.meta.url), "utf8");

test("Idea Lab route is wired as a real tools page", () => {
  assert.match(pageFile, /import \{ IdeaLab \}/);
  assert.match(pageFile, /title:\s*"Idea Lab"/);
  assert.match(pageFile, /return <IdeaLab \/>/);
});

test("Idea Lab provides local planning, persistence, and export affordances", () => {
  assert.match(componentFile, /const STORAGE_KEY = "mays-idea-lab-v1"/);
  assert.match(componentFile, /function generateBrief/);
  assert.match(componentFile, /window\.localStorage\.setItem/);
  assert.match(componentFile, /navigator\.clipboard\.writeText\(brief\.codexPrompt\)/);
  assert.match(componentFile, /function downloadMarkdown/);
  assert.match(componentFile, /风险与假设/);
  assert.match(componentFile, /验收清单/);
  assert.match(componentFile, /Codex Prompt/);
});

test("Idea Lab uses actual controls rather than a static landing page", () => {
  assert.match(componentFile, /type="range"/);
  assert.match(componentFile, /type="checkbox"/);
  assert.match(componentFile, /aria-pressed/);
  assert.match(componentFile, /textarea/);
  assert.match(componentFile, /Copy Prompt/);
  assert.match(componentFile, /Download MD/);
});

test("Idea Lab is discoverable from the tools hub", () => {
  assert.match(toolsHub, /title:\s*"Idea Lab"/);
  assert.match(toolsHub, /href:\s*"\/tools\/idea-lab"/);
  assert.match(toolsHub, /Project Brief/);
});

test("Idea Lab layout has responsive workspace and stable tool panels", () => {
  assert.match(cssFile, /\.workspace\s*\{[\s\S]*grid-template-columns:/);
  assert.match(cssFile, /\.inputPanel,\n\.controlPanel,\n\.outputPanel\s*\{[\s\S]*border-radius:\s*8px/);
  assert.match(cssFile, /@media \(max-width: 760px\)[\s\S]*\.workspace/);
  assert.doesNotMatch(cssFile, /border-radius:\s*(?:2[0-9]|3[0-9])px/);
});

test("package exposes focused Idea Lab regression test", () => {
  assert.match(packageJson, /"test:idea-lab":\s*"node --test scripts\/idea-lab\.test\.mjs"/);
});
