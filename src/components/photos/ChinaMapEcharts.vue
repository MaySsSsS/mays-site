<template>
  <div class="china-map-container">
    <div v-if="loading" class="map-loading">
      <div class="loading-spinner"></div>
      <p>{{ loadingText }}</p>
    </div>
    <div v-show="!loading" ref="chartDom" class="chart"></div>
    <div class="map-legend" v-if="!loading">
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
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import * as echarts from "echarts";

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

const chartDom = ref<HTMLElement | null>(null);
const loading = ref(true);
const loadingText = ref("加载地图中...");
let chartInstance: echarts.ECharts | null = null;

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

// 图表配置
const getChartOption = () => ({
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
    label: {
      show: false,
    },
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
});

// 加载中国地图 GeoJSON
const loadChinaMap = async (): Promise<boolean> => {
  try {
    console.log("[ChinaMap] 开始加载中国地图 GeoJSON...");
    loadingText.value = "正在获取地图数据...";
    
    // 使用本地文件，避免外部 API 的 CORS/403 问题
    const baseUrl = import.meta.env.BASE_URL || '/';
    const response = await fetch(`${baseUrl}data/china.json`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const geoJSON = await response.json();
    console.log("[ChinaMap] GeoJSON 加载成功, 特征数量:", geoJSON.features?.length);
    
    loadingText.value = "正在注册地图...";
    echarts.registerMap("china", geoJSON);
    console.log("[ChinaMap] 地图注册成功");
    
    return true;
  } catch (error) {
    console.error("[ChinaMap] 加载地图失败:", error);
    loadingText.value = "地图加载失败，使用备用数据...";
    
    // 注册空地图作为备用
    echarts.registerMap("china", {
      type: "FeatureCollection",
      features: [],
    });
    
    return false;
  }
};

// 初始化图表
const initChart = async () => {
  console.log("[ChinaMap] 开始初始化图表...");
  
  // 1. 先加载地图数据
  await loadChinaMap();
  
  // 2. 等待 DOM 更新
  await nextTick();
  
  // 3. 确保 DOM 元素存在
  if (!chartDom.value) {
    console.error("[ChinaMap] 图表容器不存在");
    return;
  }
  
  // 4. 先隐藏加载状态，让图表容器可见
  loading.value = false;
  
  // 5. 等待 DOM 更新，确保容器可见
  await nextTick();
  
  console.log("[ChinaMap] 图表容器尺寸:", chartDom.value.offsetWidth, "x", chartDom.value.offsetHeight);
  
  // 6. 初始化 ECharts 实例
  try {
    chartInstance = echarts.init(chartDom.value);
    console.log("[ChinaMap] ECharts 实例创建成功");
    
    // 7. 设置配置
    const option = getChartOption();
    console.log("[ChinaMap] 图表配置:", JSON.stringify(option.geo, null, 2));
    chartInstance.setOption(option);
    
    // 8. 绑定点击事件
    chartInstance.on("click", (params: any) => {
      if (
        params.componentType === "series" &&
        params.name &&
        props.visitedCities.includes(params.name)
      ) {
        emit("select", params.name);
      }
    });
    
    console.log("[ChinaMap] 图表初始化完成");
  } catch (error) {
    console.error("[ChinaMap] 图表初始化失败:", error);
  }
};

// 更新图表数据
const updateChart = () => {
  if (chartInstance) {
    chartInstance.setOption(getChartOption());
  }
};

// 监听数据变化更新图表
watch(
  () => [props.visitedCities, props.cityPhotoCounts, props.showConnections],
  () => {
    updateChart();
  },
  { deep: true }
);

// 监听 activeCity 变化，更新地图视图
watch(
  () => props.activeCity,
  (city) => {
    if (!chartInstance) return;
    
    // 更新选中城市的数据
    updateChart();
    
    // 如果有选中城市，平移到该城市
    if (city && cityCoordinates[city]) {
      chartInstance.setOption({
        geo: {
          center: cityCoordinates[city],
          zoom: 2,
        },
      });
    }
  }
);

// 窗口大小变化时重新调整图表
const handleResize = () => {
  chartInstance?.resize();
};

// 组件挂载
onMounted(() => {
  console.log("[ChinaMap] 组件已挂载");
  initChart();
  window.addEventListener("resize", handleResize);
});

// 组件卸载
onUnmounted(() => {
  console.log("[ChinaMap] 组件卸载，销毁图表实例");
  window.removeEventListener("resize", handleResize);
  chartInstance?.dispose();
  chartInstance = null;
});
</script>

<style scoped>
.china-map-container {
  position: relative;
  width: 100%;
  height: 500px;
  min-height: 400px;
  overflow: hidden;
}

.map-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
  color: #64748b;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top: 3px solid #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.chart {
  width: 100%;
  height: 500px;
  min-height: 400px;
  border-radius: 12px;
  background: #fafafa;
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
  z-index: 10;
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
