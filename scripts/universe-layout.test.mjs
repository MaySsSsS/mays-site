import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const universePage = await readFile(new URL("../app/universe/page.tsx", import.meta.url), "utf8");
const universeComponent = await readFile(
  new URL("../components/universe/UniverseObservatory.tsx", import.meta.url),
  "utf8"
);
const universeData = await readFile(new URL("../lib/universe-data.ts", import.meta.url), "utf8");
const universeCss = await readFile(new URL("../styles/universe.module.css", import.meta.url), "utf8");
const portalPage = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const portalCss = await readFile(new URL("../styles/portal.module.css", import.meta.url), "utf8");
const packageJson = await readFile(new URL("../package.json", import.meta.url), "utf8");

test("Universe Observatory is a root-level main-site page", () => {
  assert.match(universePage, /getUniverseObservatoryData/);
  assert.match(universePage, /<UniverseObservatory data=\{data\} \/>/);
  assert.doesNotMatch(universePage, /tools\/idea-lab/);
});

test("Universe data aggregates existing main-site modules", () => {
  assert.match(universeData, /ai-daily\/index\.json/);
  assert.match(universeData, /steam-games\.json/);
  assert.match(universeData, /getSignalArenaPublicData/);
  assert.match(universeData, /createSampleGroups/);
  assert.match(universeData, /buildConnections/);
  assert.match(universeData, /relatedModuleIds/);
  assert.match(universeData, /nextAction/);
  assert.match(universeData, /"ai-daily"/);
  assert.match(universeData, /"quant-lab"/);
  assert.match(universeData, /"game"/);
  assert.match(universeData, /"photos"/);
  assert.match(universeData, /"tools"/);
});

test("Universe Observatory has rich interactive surfaces", () => {
  assert.match(universeComponent, /selectedModule/);
  assert.match(universeComponent, /activeEventId/);
  assert.match(universeComponent, /WATCH_STORAGE_KEY/);
  assert.match(universeComponent, /DONE_STORAGE_KEY/);
  assert.match(universeComponent, /eventMatchesQuery/);
  assert.match(universeComponent, /toggleWatchedModule/);
  assert.match(universeComponent, /toggleMissionDone/);
  assert.match(universeComponent, /NOTE_STORAGE_KEY/);
  assert.match(universeComponent, /aria-label="Universe observation note"/);
  assert.match(universeComponent, /Search Signals/);
  assert.match(universeComponent, /Focus Route/);
  assert.match(universeComponent, /信号星域/);
  assert.match(universeComponent, /近期事件/);
  assert.match(universeComponent, /下一步任务/);
  assert.match(universeComponent, /模块关联/);
  assert.match(universeComponent, /健康读数/);
});

test("Portal exposes Universe Observatory as a normal clickable card", () => {
  assert.match(portalPage, /title:\s*"OBSERVATORY"/);
  assert.match(portalPage, /href:\s*"\/universe"/);
  assert.match(portalPage, /prefetch:\s*true/);
  assert.match(portalCss, /\.universePanel\s*\{/);
  const universePanel = portalCss.match(/\.universePanel\s*\{(?<body>[\s\S]*?)\n\}/);
  assert.ok(universePanel?.groups?.body);
  assert.doesNotMatch(universePanel.groups.body, /grid-column\s*:/);
});

test("Universe CSS provides responsive observatory panels without nested card layout", () => {
  assert.match(universeCss, /\.observatoryGrid\s*\{[\s\S]*grid-template-columns:/);
  assert.match(universeCss, /\.controlStrip\s*\{/);
  assert.match(universeCss, /\.connectionPanel/);
  assert.match(universeCss, /\.missionCardDone/);
  assert.match(universeCss, /\.orbWatched/);
  assert.match(universeCss, /\.starMap\s*\{[\s\S]*min-height:\s*620px/);
  assert.match(universeCss, /@media \(max-width: 760px\)[\s\S]*\.observatoryGrid/);
  assert.doesNotMatch(universeCss, /border-radius:\s*(?:2[0-9]|3[0-9])px/);
});

test("package exposes focused Universe regression test", () => {
  assert.match(packageJson, /"test:universe":\s*"node --test scripts\/universe-layout\.test\.mjs"/);
});
