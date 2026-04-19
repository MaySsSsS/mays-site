"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

import { CHINA_CITIES } from "@/lib/photo";

import styles from "@/styles/photo/ChinaMap.module.css";

let chinaGeoJsonPromise: Promise<unknown> | null = null;

async function loadChinaGeoJson() {
  if (!chinaGeoJsonPromise) {
    chinaGeoJsonPromise = fetch("/data/china-geojson.json").then((response) =>
      response.json()
    );
  }

  return chinaGeoJsonPromise;
}

export function ChinaMap({
  activeCity,
  visitedCities,
  cityPhotoCounts,
  onSelect
}: Readonly<{
  activeCity: string | null;
  visitedCities: string[];
  cityPhotoCounts: Record<string, number>;
  onSelect: (city: string) => void;
}>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const visitedPayload = JSON.stringify(visitedCities);
  const countsPayload = JSON.stringify(cityPhotoCounts);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const chart = echarts.init(containerRef.current);
    let disposed = false;

    async function renderChart() {
      const geoJson = await loadChinaGeoJson();
      if (disposed) {
        return;
      }

      echarts.registerMap("china", geoJson as never);

      const currentCities = JSON.parse(visitedPayload) as string[];
      const currentCounts = JSON.parse(countsPayload) as Record<string, number>;

      const scatterData = currentCities
        .map((city) => {
          const coordinates = CHINA_CITIES[city];
          if (!coordinates) {
            return null;
          }

          return {
            name: city,
            value: [coordinates.lng, coordinates.lat, currentCounts[city] ?? 0]
          };
        })
        .filter(Boolean);

      const activeData =
        activeCity && CHINA_CITIES[activeCity]
          ? [
              {
                name: activeCity,
                value: [
                  CHINA_CITIES[activeCity].lng,
                  CHINA_CITIES[activeCity].lat,
                  currentCounts[activeCity] ?? 0
                ]
              }
            ]
          : [];

      chart.setOption({
        backgroundColor: "transparent",
        tooltip: {
          trigger: "item",
          formatter: (params: { name: string; value?: number[] }) => {
            if (Array.isArray(params.value)) {
              return `${params.name}<br />${params.value[2] ?? 0} 张照片`;
            }
            return params.name;
          }
        },
        geo: {
          map: "china",
          roam: false,
          itemStyle: {
            areaColor: "#ece3cf",
            borderColor: "#d4bea3"
          },
          emphasis: {
            itemStyle: {
              areaColor: "#e1c9a0"
            }
          }
        },
        series: [
          {
            type: "effectScatter",
            coordinateSystem: "geo",
            data: scatterData,
            symbolSize: (value: number[]) =>
              Math.max(12, Math.min(30, 12 + (value[2] ?? 0) * 2)),
            itemStyle: {
              color: "#d58452"
            },
            rippleEffect: {
              scale: 3
            }
          },
          {
            type: "effectScatter",
            coordinateSystem: "geo",
            data: activeData,
            symbolSize: 28,
            itemStyle: {
              color: "#365f48"
            },
            rippleEffect: {
              scale: 5
            }
          }
        ]
      });

      chart.off("click");
      chart.on("click", (params) => {
        if (typeof params.name === "string" && CHINA_CITIES[params.name]) {
          onSelect(params.name);
        }
      });
    }

    void renderChart();

    const resizeHandler = () => {
      chart.resize();
    };

    window.addEventListener("resize", resizeHandler);

    return () => {
      disposed = true;
      window.removeEventListener("resize", resizeHandler);
      chart.dispose();
    };
  }, [activeCity, countsPayload, onSelect, visitedPayload]);

  return <div ref={containerRef} className={styles.map} />;
}
