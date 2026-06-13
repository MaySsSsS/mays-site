"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import styles from "@/styles/universe.module.css";
import type {
  UniverseEvent,
  UniverseConnection,
  UniverseMission,
  UniverseModule,
  UniverseModuleId,
  UniverseObservatoryData
} from "@/types/universe";

const NOTE_STORAGE_KEY = "mays-universe-observatory-note-v1";
const WATCH_STORAGE_KEY = "mays-universe-observatory-watch-v1";
const DONE_STORAGE_KEY = "mays-universe-observatory-done-v1";

const moduleLabels: Record<UniverseModuleId | "all", string> = {
  all: "All Signals",
  "ai-daily": "AI Daily",
  "quant-lab": "Quant Lab",
  game: "Game",
  photos: "Photos",
  tools: "Tools"
};

function formatEventTime(value: string) {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Shanghai"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function statusText(status: UniverseModule["status"]) {
  switch (status) {
    case "live":
      return "Live";
    case "watch":
      return "Watch";
    case "quiet":
      return "Quiet";
    case "building":
      return "Building";
    default:
      return status;
  }
}

function priorityText(priority: UniverseMission["priority"]) {
  switch (priority) {
    case "now":
      return "Now";
    case "next":
      return "Next";
    case "later":
      return "Later";
    default:
      return priority;
  }
}

function impactText(impact: UniverseEvent["impact"]) {
  switch (impact) {
    case "high":
      return "High impact";
    case "medium":
      return "Medium impact";
    case "low":
      return "Low impact";
    default:
      return impact;
  }
}

function strengthText(strength: UniverseConnection["strength"]) {
  switch (strength) {
    case "primary":
      return "Primary";
    case "support":
      return "Support";
    case "watch":
      return "Watch";
    default:
      return strength;
  }
}

function isUniverseModuleId(value: unknown, moduleIds: Set<UniverseModuleId>): value is UniverseModuleId {
  return typeof value === "string" && moduleIds.has(value as UniverseModuleId);
}

function parseStoredModuleIds(value: string | null, modules: UniverseModule[]) {
  const moduleIds = new Set(modules.map((module) => module.id));

  if (!value) {
    return modules.filter((module) => module.status === "watch" || module.status === "building").map((module) => module.id);
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item) => isUniverseModuleId(item, moduleIds));
  } catch {
    return [];
  }
}

function parseStoredStrings(value: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function eventMatchesQuery(event: UniverseEvent, modules: UniverseModule[], query: string) {
  if (!query) {
    return true;
  }

  const moduleTitle = modules.find((module) => module.id === event.moduleId)?.title ?? event.moduleId;
  const relatedTitles = event.relatedModuleIds
    .map((moduleId) => modules.find((module) => module.id === moduleId)?.title ?? moduleId)
    .join(" ");
  const searchable = [
    moduleTitle,
    relatedTitles,
    event.title,
    event.description,
    event.kind,
    event.impact,
    event.nextAction
  ]
    .join(" ")
    .toLowerCase();

  return searchable.includes(query);
}

export function UniverseObservatory({ data }: { data: UniverseObservatoryData }) {
  const [selectedModule, setSelectedModule] = useState<UniverseModuleId | "all">("all");
  const [activeEventId, setActiveEventId] = useState(data.events[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [watchedModules, setWatchedModules] = useState<UniverseModuleId[]>([]);
  const [completedMissionIds, setCompletedMissionIds] = useState<string[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();
  const selectedModuleData =
    selectedModule === "all" ? null : data.modules.find((module) => module.id === selectedModule) ?? null;
  const filteredEvents = useMemo(
    () =>
      (selectedModule === "all"
        ? data.events
        : data.events.filter(
            (event) => event.moduleId === selectedModule || event.relatedModuleIds.includes(selectedModule)
          )).filter((event) => eventMatchesQuery(event, data.modules, normalizedQuery)),
    [data.events, data.modules, normalizedQuery, selectedModule]
  );
  const activeEvent = filteredEvents.find((event) => event.id === activeEventId) ?? filteredEvents[0] ?? null;
  const filteredMissions = useMemo(
    () =>
      selectedModule === "all"
        ? data.missions
        : data.missions.filter((mission) => mission.moduleId === selectedModule),
    [data.missions, selectedModule]
  );
  const activeConnections = useMemo(
    () =>
      selectedModule === "all"
        ? data.connections
        : data.connections.filter((connection) => connection.from === selectedModule || connection.to === selectedModule),
    [data.connections, selectedModule]
  );
  const activeModule = activeEvent
    ? data.modules.find((module) => module.id === activeEvent.moduleId) ?? null
    : selectedModuleData;
  const openMissionCount = filteredMissions.filter((mission) => !completedMissionIds.includes(mission.id)).length;
  const highImpactEventCount = filteredEvents.filter((event) => event.impact === "high").length;
  const watchRoute = watchedModules
    .map((moduleId) => data.modules.find((module) => module.id === moduleId)?.title)
    .filter((title): title is string => Boolean(title));

  useEffect(() => {
    setNote(window.localStorage.getItem(NOTE_STORAGE_KEY) ?? "");
    setWatchedModules(parseStoredModuleIds(window.localStorage.getItem(WATCH_STORAGE_KEY), data.modules));
    setCompletedMissionIds(parseStoredStrings(window.localStorage.getItem(DONE_STORAGE_KEY)));
    setStorageReady(true);
  }, [data.modules]);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    window.localStorage.setItem(NOTE_STORAGE_KEY, note);
    window.localStorage.setItem(WATCH_STORAGE_KEY, JSON.stringify(watchedModules));
    window.localStorage.setItem(DONE_STORAGE_KEY, JSON.stringify(completedMissionIds));
  }, [completedMissionIds, note, storageReady, watchedModules]);

  useEffect(() => {
    if (filteredEvents.length > 0 && !filteredEvents.some((event) => event.id === activeEventId)) {
      setActiveEventId(filteredEvents[0].id);
    }
  }, [activeEventId, filteredEvents]);

  function selectModule(moduleId: UniverseModuleId | "all") {
    setSelectedModule(moduleId);
  }

  function toggleWatchedModule(moduleId: UniverseModuleId) {
    setWatchedModules((current) =>
      current.includes(moduleId) ? current.filter((item) => item !== moduleId) : [...current, moduleId]
    );
  }

  function toggleMissionDone(missionId: string) {
    setCompletedMissionIds((current) =>
      current.includes(missionId) ? current.filter((item) => item !== missionId) : [...current, missionId]
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.halftone} aria-hidden="true" />
      <section className={styles.shell}>
        <nav className={styles.topline} aria-label="Universe navigation">
          <Link href="/" className={styles.navButton}>
            Home
          </Link>
          <Link href="/tools" className={styles.navButton}>
            Signal Lab
          </Link>
        </nav>

        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>Mays Universe Observatory</p>
            <h1>主站观测台</h1>
            <p>
              这里不是工具箱，而是把整个主站视作一组运行中的宇宙模块：新闻、量化、
              游戏、照片和工具都在同一张星图里留下信号。
            </p>
          </div>
          <div className={styles.heroStats} aria-label="Universe stats">
            <span>Modules</span>
            <strong>{data.modules.length}</strong>
            <span>Events {data.events.length}</span>
          </div>
        </header>

        <section className={styles.commandDeck} aria-label="Universe filters">
          <button
            type="button"
            className={`${styles.filterButton} ${selectedModule === "all" ? styles.filterButtonActive : ""}`}
            aria-pressed={selectedModule === "all"}
            onClick={() => selectModule("all")}
          >
            All Signals
          </button>
          {data.modules.map((module) => (
            <button
              key={module.id}
              type="button"
              className={`${styles.filterButton} ${selectedModule === module.id ? styles.filterButtonActive : ""}`}
              aria-pressed={selectedModule === module.id}
              onClick={() => selectModule(module.id)}
            >
              {module.title}
            </button>
          ))}
        </section>

        <section className={styles.controlStrip} aria-label="Universe signal controls">
          <label className={styles.searchField} htmlFor="universe-search">
            <span>Search Signals</span>
            <input
              id="universe-search"
              className={styles.searchInput}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索日报、量化、游戏、照片或工具信号"
            />
          </label>
          <div className={styles.summaryTile}>
            <span>Focus Route</span>
            <strong>{watchRoute.length > 0 ? watchRoute.join(" / ") : "No modules pinned"}</strong>
            <small>点击模块卡片里的 Watch 切换关注路线。</small>
          </div>
          <div className={styles.summaryTile}>
            <span>Signal Load</span>
            <strong>
              {filteredEvents.length} signals · {highImpactEventCount} high
            </strong>
            <small>{openMissionCount} 个当前筛选下的未完成任务。</small>
          </div>
        </section>

        <div className={styles.observatoryGrid}>
          <section className={styles.starMapPanel} aria-labelledby="star-map-title">
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelLabel}>Orbit Map</p>
                <h2 id="star-map-title">信号星域</h2>
              </div>
              <span className={styles.timestamp}>Updated {formatEventTime(data.updatedAt)}</span>
            </div>
            <div className={styles.starMap}>
              <div className={styles.ringOuter} aria-hidden="true" />
              <div className={styles.ringInner} aria-hidden="true" />
              {data.modules.map((module) => (
                <button
                  key={module.id}
                  type="button"
                  className={`${styles.orb} ${styles[`tone_${module.tone}`]} ${
                    selectedModule === module.id ? styles.orbActive : ""
                  } ${watchedModules.includes(module.id) ? styles.orbWatched : ""}`}
                  style={{
                    left: `${module.orbit.x}%`,
                    top: `${module.orbit.y}%`,
                    width: `${module.orbit.size}px`,
                    height: `${module.orbit.size}px`
                  }}
                  aria-pressed={selectedModule === module.id}
                  onClick={() => selectModule(module.id)}
                >
                  <span>{module.eyebrow}</span>
                  <strong>{module.metricValue}</strong>
                </button>
              ))}
            </div>
          </section>

          <section className={styles.modulePanel} aria-labelledby="module-panel-title">
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelLabel}>Selected Module</p>
                <h2 id="module-panel-title">
                  {selectedModuleData ? selectedModuleData.title : "Whole Universe"}
                </h2>
              </div>
            </div>
            <ModuleBrief
              modules={data.modules}
              selectedModule={selectedModuleData}
              watchedModules={watchedModules}
              onToggleWatchedModule={toggleWatchedModule}
            />
          </section>

          <section className={styles.timelinePanel} aria-labelledby="timeline-title">
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelLabel}>{moduleLabels[selectedModule]}</p>
                <h2 id="timeline-title">近期事件</h2>
              </div>
              <span className={styles.countPill}>{filteredEvents.length} items</span>
            </div>
            <div className={styles.timelineList}>
              {filteredEvents.length > 0 ? (
                filteredEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    className={`${styles.timelineItem} ${
                      activeEvent?.id === event.id ? styles.timelineItemActive : ""
                    }`}
                    aria-pressed={activeEvent?.id === event.id}
                    onClick={() => setActiveEventId(event.id)}
                  >
                    <span>
                      {formatEventTime(event.occurredAt)} · {impactText(event.impact)}
                    </span>
                    <strong>{event.title}</strong>
                    <small>{event.description}</small>
                  </button>
                ))
              ) : (
                <p className={styles.emptyState}>当前筛选和搜索下没有匹配事件。</p>
              )}
            </div>
          </section>

          <section className={styles.eventPanel} aria-labelledby="event-detail-title">
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelLabel}>Signal Detail</p>
                <h2 id="event-detail-title">{activeEvent?.title ?? "暂无事件"}</h2>
              </div>
              {activeEvent ? (
                <Link href={activeEvent.href} className={styles.navButton}>
                  Open
                </Link>
              ) : null}
            </div>
            <div className={styles.eventDetail}>
              <div className={styles.eventMeta}>
                <span className={styles.eventKind}>{activeEvent?.kind ?? "empty"}</span>
                <span className={styles.eventKind}>{activeEvent ? impactText(activeEvent.impact) : "No impact"}</span>
              </div>
              <p>{activeEvent?.description ?? "当前模块暂无可展示事件。"}</p>
              {activeEvent ? (
                <div className={styles.relatedModules}>
                  {activeEvent.relatedModuleIds.map((moduleId) => {
                    const relatedModule = data.modules.find((module) => module.id === moduleId);

                    return (
                      <button
                        key={moduleId}
                        type="button"
                        className={styles.relatedButton}
                        onClick={() => selectModule(moduleId)}
                      >
                        {relatedModule?.title ?? moduleId}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              {activeEvent ? (
                <div className={styles.nextAction}>
                  <span>Next action</span>
                  <strong>{activeEvent.nextAction}</strong>
                </div>
              ) : null}
              {activeModule ? (
                <div className={styles.eventModule}>
                  <span>{activeModule.title}</span>
                  <strong>{activeModule.signal}</strong>
                </div>
              ) : null}
            </div>
          </section>

          <section className={styles.missionPanel} aria-labelledby="mission-title">
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelLabel}>Mission Board</p>
                <h2 id="mission-title">下一步任务</h2>
              </div>
            </div>
            <div className={styles.missionList}>
              {filteredMissions.length > 0 ? (
                filteredMissions.map((mission) => (
                  <div
                    key={mission.id}
                    className={`${styles.missionCard} ${
                      completedMissionIds.includes(mission.id) ? styles.missionCardDone : ""
                    }`}
                  >
                    <span>
                      {priorityText(mission.priority)} · {mission.estimate}
                    </span>
                    <strong>{mission.title}</strong>
                    <small>{mission.detail}</small>
                    <small>产出：{mission.output}</small>
                    <div className={styles.missionActions}>
                      <Link href={mission.href} className={styles.smallLink}>
                        Open
                      </Link>
                      <button
                        type="button"
                        className={styles.miniButton}
                        onClick={() => toggleMissionDone(mission.id)}
                      >
                        {completedMissionIds.includes(mission.id) ? "Reset" : "Done"}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className={styles.emptyState}>这个模块暂时没有挂起任务。</p>
              )}
            </div>
          </section>

          <section className={styles.connectionPanel} aria-labelledby="connection-title">
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelLabel}>Constellation Links</p>
                <h2 id="connection-title">模块关联</h2>
              </div>
              <span className={styles.countPill}>{activeConnections.length} links</span>
            </div>
            <div className={styles.connectionList}>
              {activeConnections.map((connection) => {
                const fromModule = data.modules.find((module) => module.id === connection.from);
                const toModule = data.modules.find((module) => module.id === connection.to);

                return (
                  <button
                    key={connection.id}
                    type="button"
                    className={`${styles.connectionCard} ${styles[`connection_${connection.strength}`]}`}
                    onClick={() => selectModule(connection.to)}
                  >
                    <span>{strengthText(connection.strength)}</span>
                    <strong>
                      {fromModule?.title ?? connection.from} to {toModule?.title ?? connection.to}
                    </strong>
                    <small>{connection.label}</small>
                    <small>{connection.detail}</small>
                  </button>
                );
              })}
            </div>
          </section>

          <section className={styles.healthPanel} aria-labelledby="health-title">
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelLabel}>System Health</p>
                <h2 id="health-title">健康读数</h2>
              </div>
            </div>
            <div className={styles.healthGrid}>
              {data.health.map((item) => (
                <div key={item.label} className={`${styles.healthCard} ${styles[`health_${item.tone}`]}`}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <small>{item.detail}</small>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.notePanel} aria-labelledby="note-title">
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelLabel}>Local Notes</p>
                <h2 id="note-title">观察笔记</h2>
              </div>
              <button type="button" className={styles.navButton} onClick={() => setNote("")}>
                Clear
              </button>
            </div>
            <textarea
              className={styles.noteInput}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              aria-label="Universe observation note"
              placeholder="写下今天观察到的异常、灵感或下一步想看的东西。内容只保存在当前浏览器。"
            />
          </section>
        </div>
      </section>
    </main>
  );
}

function ModuleBrief({
  modules,
  selectedModule,
  watchedModules,
  onToggleWatchedModule
}: {
  modules: UniverseModule[];
  selectedModule: UniverseModule | null;
  watchedModules: UniverseModuleId[];
  onToggleWatchedModule: (moduleId: UniverseModuleId) => void;
}) {
  if (selectedModule) {
    const watched = watchedModules.includes(selectedModule.id);

    return (
      <div className={styles.moduleBrief}>
        <span className={styles.statusPill}>{statusText(selectedModule.status)}</span>
        <p>{selectedModule.summary}</p>
        <p className={styles.focusHint}>{selectedModule.focusHint}</p>
        <div className={styles.metricRow}>
          <span>{selectedModule.metricLabel}</span>
          <strong>{selectedModule.metricValue}</strong>
          <small>{selectedModule.secondaryMetric}</small>
        </div>
        <div className={styles.moduleActions}>
          <Link href={selectedModule.path} className={styles.primaryLink}>
            {selectedModule.actionLabel}
          </Link>
          <button
            type="button"
            className={`${styles.miniButton} ${watched ? styles.miniButtonActive : ""}`}
            onClick={() => onToggleWatchedModule(selectedModule.id)}
          >
            {watched ? "Watching" : "Watch"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.moduleStack}>
      {modules.map((module) => (
        <button
          key={module.id}
          type="button"
          className={`${styles.moduleMiniCard} ${watchedModules.includes(module.id) ? styles.moduleMiniCardWatched : ""}`}
          onClick={() => onToggleWatchedModule(module.id)}
        >
          <span>{module.eyebrow}</span>
          <strong>{module.title}</strong>
          <small>{module.signal}</small>
          <small>{watchedModules.includes(module.id) ? "Watching route" : "Click to watch"}</small>
        </button>
      ))}
    </div>
  );
}
