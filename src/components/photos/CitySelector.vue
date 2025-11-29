<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="close">
        <div class="modal-container">
          <div class="modal-header">
            <h3 class="modal-title">选择城市</h3>
            <button class="close-btn" @click="close">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <!-- 搜索框 -->
            <div class="search-box">
              <svg
                class="search-icon"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索城市..."
                class="search-input"
                ref="searchInput"
              />
            </div>

            <!-- 地区分类 -->
            <div class="regions-list">
              <div
                v-for="(cities, region) in filteredCitiesByRegion"
                :key="region"
                class="region-group"
              >
                <h4 class="region-title">{{ region }}</h4>
                <div class="cities-grid">
                  <button
                    v-for="city in cities"
                    :key="city"
                    :class="['city-btn', { selected: city === selectedCity }]"
                    @click="selectCity(city)"
                  >
                    {{ city }}
                  </button>
                </div>
              </div>
            </div>

            <!-- 自定义城市 -->
            <div class="custom-city">
              <span class="custom-label">没有找到？</span>
              <button
                class="add-custom-btn"
                @click="showCustomInput = true"
                v-if="!showCustomInput"
              >
                + 添加自定义位置
              </button>
              <div v-else class="custom-input-group">
                <input
                  v-model="customCity"
                  type="text"
                  placeholder="输入城市/地点名称"
                  class="custom-input"
                  @keyup.enter="confirmCustomCity"
                />
                <button class="confirm-btn" @click="confirmCustomCity">
                  确定
                </button>
                <button class="cancel-btn" @click="showCustomInput = false">
                  取消
                </button>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" @click="close">取消</button>
            <button
              class="btn btn-primary"
              :disabled="!selectedCity"
              @click="confirm"
            >
              确认选择
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";

const props = defineProps<{
  visible: boolean;
  initialCity?: string | null;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "select", city: string): void;
}>();

const searchQuery = ref("");
const selectedCity = ref<string | null>(null);
const showCustomInput = ref(false);
const customCity = ref("");
const searchInput = ref<HTMLInputElement | null>(null);

// 城市按地区分组
const CITIES_BY_REGION: Record<string, string[]> = {
  华北: [
    "北京", "天津", "石家庄", "唐山", "秦皇岛", "邯郸", "邢台", "保定", "张家口", "承德", "沧州", "廊坊", "衡水",
    "太原", "大同", "阳泉", "长治", "晋城", "朔州", "晋中", "运城", "忻州", "临汾", "吕梁",
    "呼和浩特", "包头", "乌海", "赤峰", "通辽", "鄂尔多斯", "呼伦贝尔", "巴彦淖尔", "乌兰察布", "兴安盟", "锡林郭勒盟", "阿拉善盟"
  ],
  东北: [
    "沈阳", "大连", "鞍山", "抚顺", "本溪", "丹东", "锦州", "营口", "阜新", "辽阳", "盘锦", "铁岭", "朝阳", "葫芦岛",
    "长春", "吉林", "四平", "辽源", "通化", "白山", "松原", "白城", "延边朝鲜族自治州",
    "哈尔滨", "齐齐哈尔", "鸡西", "鹤岗", "双鸭山", "大庆", "伊春", "佳木斯", "七台河", "牡丹江", "黑河", "绥化", "大兴安岭地区"
  ],
  华东: [
    "上海", "南京", "无锡", "徐州", "常州", "苏州", "南通", "连云港", "淮安", "盐城", "扬州", "镇江", "泰州", "宿迁",
    "杭州", "宁波", "温州", "嘉兴", "湖州", "绍兴", "金华", "衢州", "舟山", "台州", "丽水",
    "合肥", "芜湖", "蚌埠", "淮南", "马鞍山", "淮北", "铜陵", "安庆", "黄山", "滁州", "阜阳", "宿州", "六安", "亳州", "池州", "宣城",
    "福州", "厦门", "莆田", "三明", "泉州", "漳州", "南平", "龙岩", "宁德",
    "南昌", "景德镇", "萍乡", "九江", "新余", "鹰潭", "赣州", "吉安", "宜春", "抚州", "上饶",
    "济南", "青岛", "淄博", "枣庄", "东营", "烟台", "潍坊", "济宁", "泰安", "威海", "日照", "临沂", "德州", "聊城", "滨州", "菏泽"
  ],
  华中: [
    "郑州", "开封", "洛阳", "平顶山", "安阳", "鹤壁", "新乡", "焦作", "濮阳", "许昌", "漯河", "三门峡", "南阳", "商丘", "信阳", "周口", "驻马店",
    "武汉", "黄石", "十堰", "宜昌", "襄阳", "鄂州", "荆门", "孝感", "荆州", "黄冈", "咸宁", "随州", "恩施土家族苗族自治州",
    "长沙", "株洲", "湘潭", "衡阳", "邵阳", "岳阳", "常德", "张家界", "益阳", "郴州", "永州", "怀化", "娄底", "湘西土家族苗族自治州"
  ],
  华南: [
    "广州", "韶关", "深圳", "珠海", "汕头", "佛山", "江门", "湛江", "茂名", "肇庆", "惠州", "梅州", "汕尾", "河源", "阳江", "清远", "东莞", "中山", "潮州", "揭阳", "云浮",
    "南宁", "柳州", "桂林", "梧州", "北海", "防城港", "钦州", "贵港", "玉林", "百色", "贺州", "河池", "来宾", "崇左",
    "海口", "三亚", "三沙", "儋州", "香港", "澳门"
  ],
  西南: [
    "重庆", "成都", "自贡", "攀枝花", "泸州", "德阳", "绵阳", "广元", "遂宁", "内江", "乐山", "南充", "眉山", "宜宾", "广安", "达州", "雅安", "巴中", "资阳",
    "阿坝藏族羌族自治州", "甘孜藏族自治州", "凉山彝族自治州",
    "贵阳", "六盘水", "遵义", "安顺", "毕节", "铜仁", "黔西南布依族苗族自治州", "黔东南苗族侗族自治州", "黔南布依族苗族自治州",
    "昆明", "曲靖", "玉溪", "保山", "昭通", "丽江", "普洱", "临沧", "楚雄彝族自治州", "红河哈尼族彝族自治州", "文山壮族苗族自治州", "西双版纳傣族自治州", "大理白族自治州", "德宏傣族景颇族自治州", "怒江傈僳族自治州", "迪庆藏族自治州",
    "拉萨", "日喀则", "昌都", "林芝", "山南", "那曲", "阿里地区"
  ],
  西北: [
    "西安", "铜川", "宝鸡", "咸阳", "渭南", "延安", "汉中", "榆林", "安康", "商洛",
    "兰州", "嘉峪关", "金昌", "白银", "天水", "武威", "张掖", "平凉", "酒泉", "庆阳", "定西", "陇南", "临夏回族自治州", "甘南藏族自治州",
    "西宁", "海东", "海北藏族自治州", "黄南藏族自治州", "海南藏族自治州", "果洛藏族自治州", "玉树藏族自治州", "海西蒙古族藏族自治州",
    "银川", "石嘴山", "吴忠", "固原", "中卫",
    "乌鲁木齐", "克拉玛依", "吐鲁番", "哈密", "昌吉回族自治州", "博尔塔拉蒙古自治州", "巴音郭楞蒙古自治州", "阿克苏地区", "克孜勒苏柯尔克孜自治州", "喀什地区", "和田地区", "伊犁哈萨克自治州", "塔城地区", "阿勒泰地区"
  ],
  台湾: ["台北", "高雄"]
};

// 搜索过滤
const filteredCitiesByRegion = computed(() => {
  if (!searchQuery.value.trim()) {
    return CITIES_BY_REGION;
  }

  const query = searchQuery.value.toLowerCase();
  const result: Record<string, string[]> = {};

  for (const [region, cities] of Object.entries(CITIES_BY_REGION)) {
    const filtered = cities.filter((city) =>
      city.toLowerCase().includes(query)
    );
    if (filtered.length > 0) {
      result[region] = filtered;
    }
  }

  return result;
});

// 监听弹窗显示
watch(
  () => props.visible,
  (val) => {
    if (val) {
      selectedCity.value = props.initialCity || null;
      searchQuery.value = "";
      showCustomInput.value = false;
      customCity.value = "";
      nextTick(() => {
        searchInput.value?.focus();
      });
    }
  }
);

const selectCity = (city: string) => {
  selectedCity.value = city;
};

const confirmCustomCity = () => {
  if (customCity.value.trim()) {
    selectedCity.value = customCity.value.trim();
    showCustomInput.value = false;
  }
};

const close = () => {
  emit("update:visible", false);
};

const confirm = () => {
  if (selectedCity.value) {
    emit("select", selectedCity.value);
    close();
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-container {
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(59, 130, 246, 0.08);
  color: #1e293b;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.search-box {
  position: relative;
  margin-bottom: 1.5rem;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
}

.search-input {
  width: 100%;
  padding: 0.75rem 0.75rem 0.75rem 2.75rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  color: #1e293b;
  font-size: 0.95rem;
  outline: none;
  transition: all 0.2s ease;
}

.search-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-input::placeholder {
  color: #94a3b8;
}

.regions-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.region-group {
  background: #f8fafc;
  border-radius: 12px;
  padding: 1rem;
}

.region-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #3b82f6;
  margin: 0 0 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.cities-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.city-btn {
  padding: 0.4rem 0.8rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #64748b;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.city-btn:hover {
  background: rgba(59, 130, 246, 0.08);
  border-color: #3b82f6;
  color: #3b82f6;
}

.city-btn.selected {
  background: rgba(59, 130, 246, 0.1);
  border-color: #3b82f6;
  color: #3b82f6;
  font-weight: 500;
}

.custom-city {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.custom-label {
  font-size: 0.9rem;
  color: #64748b;
}

.add-custom-btn {
  padding: 0.4rem 0.8rem;
  background: transparent;
  border: 1px dashed #3b82f6;
  border-radius: 8px;
  color: #3b82f6;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-custom-btn:hover {
  background: rgba(59, 130, 246, 0.08);
}

.custom-input-group {
  display: flex;
  gap: 0.5rem;
  flex: 1;
}

.custom-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #1e293b;
  font-size: 0.9rem;
  outline: none;
}

.custom-input:focus {
  border-color: #3b82f6;
}

.confirm-btn,
.cancel-btn {
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.confirm-btn {
  background: #3b82f6;
  border: none;
  color: #ffffff;
}

.cancel-btn {
  background: transparent;
  border: 1px solid #e2e8f0;
  color: #64748b;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.btn {
  padding: 0.6rem 1.25rem;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: transparent;
  border: 1px solid #e2e8f0;
  color: #64748b;
}

.btn-secondary:hover {
  background: #f8fafc;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border: none;
  color: #ffffff;
}

.btn-primary:hover:not(:disabled) {
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 过渡动画 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95) translateY(20px);
}

/* 滚动条样式 */
.modal-body::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-track {
  background: transparent;
}

.modal-body::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
