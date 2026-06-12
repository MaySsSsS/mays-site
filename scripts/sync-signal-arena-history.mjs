import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import ts from "typescript";

const execFileAsync = promisify(execFile);

const AUTOMATION_ID = process.env.SIGNAL_ARENA_HISTORY_AUTOMATION_ID ?? "automation-7";
const DATABASE_PATH = process.env.WORKBUDDY_DB_PATH ?? `${process.env.HOME}/.workbuddy/workbuddy.db`;
const OUTPUT_PATH = resolve("public/data/signal-arena/history.json");

const QUERY = `
SELECT created_at, result_success, runs_json
FROM automation_runs
WHERE automation_id = '${AUTOMATION_ID.replaceAll("'", "''")}'
ORDER BY created_at ASC
`;

async function loadHistoryBuilder() {
  const source = await readFile(resolve("lib/signal-arena-history.ts"), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  });
  const tempDir = await mkdtemp(join(tmpdir(), "signal-arena-history-sync-"));
  const modulePath = join(tempDir, "signal-arena-history.mjs");

  await writeFile(modulePath, compiled.outputText);
  return import(new URL(`file://${modulePath}`).href);
}

async function main() {
  const { buildSignalArenaHistoryPayload } = await loadHistoryBuilder();
  const { stdout } = await execFileAsync("sqlite3", ["-json", DATABASE_PATH, QUERY], {
    maxBuffer: 80 * 1024 * 1024
  });
  const rows = JSON.parse(stdout);
  const payload = buildSignalArenaHistoryPayload(rows, { automationId: AUTOMATION_ID });

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);

  console.log(
    `Signal Arena history synced: ${payload.meta.importedRuns} logs, ${payload.meta.equityPoints} equity points -> ${OUTPUT_PATH}`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
