<template>
  <div class="china-map-container">
    <div v-if="!mapLoaded" class="map-loading">
      <div class="loading-spinner"></div>
      <p>加载地图中...</p>
    </div>
    <v-chart
      v-else
      ref="chartRef"
      class="chart"
      :option="chartOption"
      :autoresize="true"
      @click="handleMapClick"
    />
    <div class="map-legend" v-if="mapLoaded">
      <div class="legend-item">
        <span class="legend-dot visited"></span>
        <span>已去过</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot active"></span>
        <span>当前选中</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import VChart from "vue-echarts";
import { use } from "echarts/core";
import { MapChart, EffectScatterChart, LinesChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  GeoComponent,
  VisualMapComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { registerMap } from "echarts/core";

// 注册 ECharts 组件
use([
  MapChart,
  EffectScatterChart,
  LinesChart,
  TitleComponent,
  TooltipComponent,
  GeoComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

// 城市坐标数据
const cityCoordinates: Record<string, [number, number]> = {
  北京: [116.405285, 39.904989],
  上海: [121.472644, 31.231706],
  广州: [113.280637, 23.125178],
  深圳: [114.085947, 22.547],
  杭州: [120.153576, 30.287459],
  南京: [118.767413, 32.041544],
  苏州: [120.619585, 31.299379],
  成都: [104.065735, 30.659462],
  重庆: [106.504962, 29.533155],
  武汉: [114.298572, 30.584355],
  西安: [108.948024, 34.263161],
  长沙: [112.982279, 28.19409],
  天津: [117.190182, 39.125596],
  青岛: [120.369557, 36.094406],
  大连: [121.618622, 38.91459],
  厦门: [118.11022, 24.490474],
  福州: [119.306239, 26.075302],
  郑州: [113.665412, 34.757975],
  济南: [117.000923, 36.675807],
  沈阳: [123.429096, 41.796767],
  哈尔滨: [126.642464, 45.756967],
  长春: [125.3245, 43.886841],
  石家庄: [114.502461, 38.045474],
  太原: [112.549248, 37.857014],
  呼和浩特: [111.670801, 40.818311],
  南宁: [108.320004, 22.82402],
  昆明: [102.712251, 25.040609],
  贵阳: [106.713478, 26.578343],
  兰州: [103.823557, 36.058039],
  银川: [106.278179, 38.46637],
  西宁: [101.778916, 36.623178],
  乌鲁木齐: [87.617733, 43.792818],
  拉萨: [91.132212, 29.660361],
  海口: [110.33119, 20.031971],
  三亚: [109.508268, 18.247872],
  香港: [114.173355, 22.320048],
  澳门: [113.54909, 22.198951],
  台北: [121.5654, 25.033],
  无锡: [120.301663, 31.574729],
  宁波: [121.549792, 29.868388],
  温州: [120.672111, 28.000575],
  合肥: [117.283042, 31.86119],
  南昌: [115.892151, 28.676493],
  烟台: [121.391382, 37.539297],
  威海: [122.116394, 37.509691],
  珠海: [113.553986, 22.224979],
  桂林: [110.299121, 25.274215],
  丽江: [100.233026, 26.872108],
  大理: [100.225668, 25.589449],
  张家界: [110.479921, 29.127401],
  黄山: [118.317325, 29.709239],
  九寨沟: [103.918146, 33.260318],
  敦煌: [94.661967, 40.142128],
};

const props = defineProps<{
  activeCity?: string | null;
  visitedCities: string[];
  cityPhotoCounts?: Record<string, number>;
  showConnections?: boolean;
}>();

const emit = defineEmits<{
  (e: "select", city: string): void;
}>();

const chartRef = ref();
const mapLoaded = ref(false);

// 获取已访问城市的数据
const visitedCityData = computed(() => {
  return props.visitedCities
    .filter((city) => cityCoordinates[city])
    .map((city) => ({
      name: city,
      value: [
        ...(cityCoordinates[city] || [0, 0]),
        props.cityPhotoCounts?.[city] || 0,
      ],
    }));
});

// 获取当前选中城市的数据
const activeCityData = computed(() => {
  if (!props.activeCity || !cityCoordinates[props.activeCity]) return [];
  return [
    {
      name: props.activeCity,
      value: [
        ...(cityCoordinates[props.activeCity] || [0, 0]),
        props.cityPhotoCounts?.[props.activeCity] || 0,
      ],
    },
  ];
});

// 连接线数据
const connectionLines = computed(() => {
  if (!props.showConnections || props.visitedCities.length < 2) return [];

  const lines: Array<{ coords: [number, number][] }> = [];
  const visited = props.visitedCities.filter((city) => cityCoordinates[city]);

  for (let i = 0; i < visited.length - 1; i++) {
    const currentCity = visited[i];
    const nextCity = visited[i + 1];
    if (currentCity && nextCity) {
      const from = cityCoordinates[currentCity];
      const to = cityCoordinates[nextCity];
      if (from && to) {
        lines.push({ coords: [from, to] });
      }
    }
  }
  return lines;
});

const chartOption = computed(() => ({
  backgroundColor: "transparent",
  tooltip: {
    trigger: "item",
    confine: true,
    formatter: (params: { name?: string; value?: number[] }) => {
      if (params.value && params.value[2] !== undefined) {
        return `<div style="font-weight: 600">${params.name}</div>
                <div style="color: #64748b; font-size: 12px">${params.value[2]} 张照片</div>`;
      }
      return params.name || "";
    },
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    padding: [8, 12],
    textStyle: {
      color: "#1e293b",
    },
  },
  geo: {
    map: "china",
    roam: true,
    zoom: 1.2,
    center: [105, 36],
    scaleLimit: {
      min: 0.8,
      max: 3,
    },
    itemStyle: {
      areaColor: "#f1f5f9",
      borderColor: "#cbd5e1",
      borderWidth: 1,
    },
    emphasis: {
      itemStyle: {
        areaColor: "#e2e8f0",
      },
      label: {
        show: false,
      },
    },
    select: {
      itemStyle: {
        areaColor: "#dbeafe",
      },
    },
    // 避免标签重叠时超出视图
    label: {
      show: false,
    },
  },
  // 尝试让标签自动避免重叠
  labelLayout: {
    hideOverlap: true,
    moveOverlap: true,
  },
  series: [
    // 足迹连线
    {
      type: "lines",
      coordinateSystem: "geo",
      zlevel: 1,
      effect: {
        show: true,
        period: 6,
        trailLength: 0.3,
        symbol: "arrow",
        symbolSize: 5,
        color: "#3b82f6",
      },
      lineStyle: {
        color: "#93c5fd",
        width: 2,
        opacity: 0.6,
        curveness: 0.2,
      },
      data: connectionLines.value,
    },
    // 已访问城市
    {
      type: "effectScatter",
      coordinateSystem: "geo",
      zlevel: 2,
      rippleEffect: {
        brushType: "stroke",
        scale: 3,
        period: 4,
      },
      symbol: "circle",
      symbolSize: (val: number[]) => {
        const count = val[2] || 0;
        return Math.max(10, Math.min(20, 10 + count * 2));
      },
      itemStyle: {
        color: "#10b981",
        shadowBlur: 10,
        shadowColor: "rgba(16, 185, 129, 0.4)",
      },
      label: {
        show: true,
        formatter: "{b}",
        position: "right",
        distance: 8,
        align: "left",
        fontSize: 11,
        color: "#475569",
        fontWeight: 500,
      },
      data: visitedCityData.value,
    },
    // 当前选中城市
    {
      type: "effectScatter",
      coordinateSystem: "geo",
      zlevel: 3,
      rippleEffect: {
        brushType: "stroke",
        scale: 4,
        period: 3,
      },
      symbol: "circle",
      symbolSize: 18,
      itemStyle: {
        color: "#3b82f6",
        shadowBlur: 15,
        shadowColor: "rgba(59, 130, 246, 0.5)",
      },
      label: {
        show: true,
        formatter: "{b}",
        position: "top",
        fontSize: 12,
        color: "#3b82f6",
        fontWeight: 600,
      },
      data: activeCityData.value,
    },
  ],
}));

// 加载中国地图
const loadChinaMap = async () => {
  try {
    // 从阿里云 DataV 获取中国地图数据
    const response = await fetch(
      "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json"
    );
    const geoJSON = await response.json();
    registerMap("china", geoJSON);
    mapLoaded.value = true;
  } catch (error) {
    console.error("Failed to load China map:", error);
    // 使用备用方案 - 简化的中国地图轮廓
    registerMap("china", {
      type: "FeatureCollection",
      features: [],
    });
    mapLoaded.value = true;
  }
};

// 处理地图点击
const handleMapClick = (params: { componentType?: string; name?: string }) => {
  if (
    params.componentType === "series" &&
    params.name &&
    props.visitedCities.includes(params.name)
  ) {
    emit("select", params.name);
  }
};

// 监听 activeCity 变化，更新地图视图
watch(
  () => props.activeCity,
  (city) => {
    if (city && cityCoordinates[city] && chartRef.value) {
      // 使用 VChart 提供的实例 API 来更新视图（设置 center/zoom）
      const instance = (chartRef.value as any).getEchartsInstance?.() ||
        (chartRef.value as any).chart;
      if (instance && instance.setOption) {
        instance.setOption(
          {
            geo: {
              center: cityCoordinates[city],
              zoom: 2,
            },
          },
          { replaceMerge: ["geo"] }
        );
      }
    }
  }
);

// 组件挂载时加载地图
onMounted(() => {
  loadChinaMap();
});
</script>

<style scoped>
.china-map-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 400px;
  overflow: hidden;
}

.chart {
  width: 100%;
  height: 100%;
  min-height: 400px;
  border-radius: 12px;
  background: transparent;
}

.map-legend {
  position: absolute;
  bottom: 16px;
  left: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  font-size: 12px;
  color: #64748b;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-dot.visited {
  background: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.5);
}

.legend-dot.active {
  background: #3b82f6;
  box-shadow: 0 0 6px rgba(59, 130, 246, 0.5);
}
</style>
