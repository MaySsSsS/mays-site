"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";

import type { SignalArenaEquityPoint } from "@/types/signal-arena";
import styles from "@/styles/signal-arena.module.css";

type RangeKey = "7D" | "30D" | "ALL";

type SignalArenaEquityChartProps = {
  history: SignalArenaEquityPoint[];
  defaultRange: RangeKey;
  onPointClick: (point: SignalArenaEquityPoint) => void;
};

const RANGE_OPTIONS: RangeKey[] = ["7D", "30D", "ALL"];
const UP_COLOR = "#f6465d";
const DOWN_COLOR = "#00c076";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0
  }).format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("zh-CN", {
    hour12: false
  });
}

function rangeStart(points: SignalArenaEquityPoint[], range: RangeKey): number {
  if (range === "ALL" || points.length === 0) {
    return Number.NEGATIVE_INFINITY;
  }

  const latest = Math.max(...points.map((point) => Date.parse(point.capturedAt)).filter(Number.isFinite));
  const days = range === "7D" ? 7 : 30;
  return latest - days * 24 * 60 * 60 * 1000;
}

function pointDelta(points: SignalArenaEquityPoint[], index: number): number {
  if (index <= 0) {
    return 0;
  }

  return points[index].totalAssets - points[index - 1].totalAssets;
}

function tooltipHtml(points: SignalArenaEquityPoint[], value: unknown): string {
  if (!Array.isArray(value)) {
    return "";
  }

  const id = value[2];
  const pointIndex = points.findIndex((point) => point.id === id);
  const point = points[pointIndex];
  if (!point) {
    return "";
  }

  const delta = pointDelta(points, pointIndex);
  const deltaText = `${delta >= 0 ? "+" : ""}${formatMoney(delta)}`;

  return [
    `<strong>${formatDateTime(point.capturedAt)}</strong>`,
    `总资产 ${formatMoney(point.totalAssets)}`,
    `收益率 ${formatPercent(point.returnRate)}`,
    `变动 ${deltaText}`,
    `状态 ${point.status}`,
    point.actionSummary ? `动作 ${point.actionSummary}` : "动作 无"
  ].join("<br/>");
}

function clickPoint(params: unknown, points: SignalArenaEquityPoint[]): SignalArenaEquityPoint | null {
  if (!params || typeof params !== "object") {
    return null;
  }

  const data = (params as { data?: unknown }).data;
  if (!data || typeof data !== "object") {
    return null;
  }

  const value = (data as { value?: unknown }).value;
  if (!Array.isArray(value)) {
    return null;
  }

  const id = value[2];
  return points.find((point) => point.id === id) ?? null;
}

export function SignalArenaEquityChart({
  history,
  defaultRange,
  onPointClick
}: SignalArenaEquityChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const [range, setRange] = useState<RangeKey>(defaultRange);

  const points = useMemo(() => {
    const sorted = [...history].sort((left, right) => Date.parse(left.capturedAt) - Date.parse(right.capturedAt));
    const start = rangeStart(sorted, range);
    return sorted.filter((point) => Date.parse(point.capturedAt) >= start);
  }, [history, range]);

  useEffect(() => {
    if (!chartRef.current || points.length === 0) {
      return undefined;
    }

    const chart = echarts.init(chartRef.current, undefined, { renderer: "canvas" });
    chartInstanceRef.current = chart;

    const segmentSeries: echarts.SeriesOption[] = points.slice(1).map((point, index) => {
      const previous = points[index];
      const isUp = point.totalAssets >= previous.totalAssets;

      return {
        type: "line" as const,
        data: [
          [Date.parse(previous.capturedAt), previous.returnRate * 100],
          [Date.parse(point.capturedAt), point.returnRate * 100]
        ],
        showSymbol: false,
        smooth: true,
        lineStyle: {
          color: isUp ? UP_COLOR : DOWN_COLOR,
          width: 3
        },
        emphasis: {
          disabled: true
        }
      };
    });

    const option: echarts.EChartsOption = {
      backgroundColor: "transparent",
      animation: false,
      grid: {
        left: 48,
        right: 18,
        top: 24,
        bottom: 36
      },
      tooltip: {
        trigger: "item",
        borderColor: "#2b3440",
        backgroundColor: "#101820",
        textStyle: {
          color: "#e6edf3",
          fontFamily: "var(--font-mono)"
        },
        formatter: (params: unknown) => {
          const data = params && typeof params === "object" ? (params as { data?: { value?: unknown } }).data : null;
          return tooltipHtml(points, data?.value);
        }
      },
      xAxis: {
        type: "time",
        axisLine: { lineStyle: { color: "#334155" } },
        axisTick: { show: false },
        axisLabel: {
          color: "#8fa3b8",
          hideOverlap: true
        },
        splitLine: { show: false }
      },
      yAxis: {
        type: "value",
        axisLabel: {
          color: "#8fa3b8",
          formatter: "{value}%"
        },
        splitLine: { lineStyle: { color: "#1f2a36" } }
      },
      series: [
        ...segmentSeries,
        {
          type: "scatter" as const,
          data: points.map((point, index) => ({
            name: point.id,
            value: [Date.parse(point.capturedAt), point.returnRate * 100, point.id],
            itemStyle: {
              color: index === 0 || point.totalAssets >= points[index - 1].totalAssets ? UP_COLOR : DOWN_COLOR,
              opacity: 0.92
            }
          })),
          symbolSize: 8,
          z: 4
        }
      ]
    };

    chart.setOption(option);

    const handleClick = (params: unknown) => {
      const point = clickPoint(params, points);
      if (point) {
        onPointClick(point);
      }
    };
    chart.on("click", handleClick);

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.off("click", handleClick);
      chart.dispose();
      chartInstanceRef.current = null;
    };
  }, [onPointClick, points]);

  return (
    <section className={styles.chartPanel}>
      <div className={styles.chartHeader}>
        <div>
          <h2 className={styles.sectionTitle}>收益曲线</h2>
          <p className={styles.sectionNote}>默认展示最近 7 天，点位可打开对应 AI 决策。</p>
        </div>
        <div className={styles.rangeTabs} aria-label="收益曲线范围">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={option === range ? styles.rangeButtonActive : styles.rangeButton}
              onClick={() => setRange(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {points.length === 0 ? (
        <p className={styles.empty}>收益曲线等待首个快照。</p>
      ) : (
        <div
          ref={chartRef}
          className={styles.chartCanvas}
          aria-label="Signal Arena equity curve"
          onClick={points.length === 1 ? () => onPointClick(points[0]) : undefined}
        />
      )}
    </section>
  );
}
