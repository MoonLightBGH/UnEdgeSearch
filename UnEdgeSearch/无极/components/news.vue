<template>
  <view class="container">
    <view class="header">
      <text class="header-title">新闻</text>
    </view>

    <view class="tabs">
      <view
        :class="['tab', tab === 'now' ? 'active' : '']"
        @click="switchTab('now')"
      >
        时事新闻
      </view>
      <view
        :class="['tab', tab === 'history' ? 'active' : '']"
        @click="switchTab('history')"
      >
        历史新闻
      </view>
    </view>

    <scroll-view class="news-scroll" scroll-y>
      <view v-if="loading" class="state-card">
        <text class="state-text">正在更新新闻，请稍等。</text>
      </view>

      <view v-else-if="error" class="state-card error">
        <text class="state-text">{{ error }}</text>
      </view>

      <transition v-else name="fade-slide" mode="out-in">
        <view :key="tab" class="list">
          <view
            v-for="item in filteredList"
            :key="item.id"
            class="card"
            @click="goDetail(item)"
          >
            <text class="title">{{ item.title }}</text>
            <text class="time">{{ formatTime(item.time) }}</text>
            <text class="desc">{{ getPreview(item.desc) }}</text>
          </view>

          <view v-if="!filteredList.length" class="state-card">
            <text class="state-text">
              {{ tab === 'now' ? '暂时还没有新的新闻。' : '历史新闻暂时为空。' }}
            </text>
          </view>
        </view>
      </transition>
    </scroll-view>
  </view>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { fetchNews } from '@/utils/api.js'

const props = defineProps({
  active: {
    type: Boolean,
    default: false
  }
})

const REFRESH_INTERVAL = 2 * 60 * 1000

const tab = ref('now')
const list = ref([])
const loading = ref(true)
const error = ref('')

let refreshTimer = null

function startRefreshTimer() {
  if (refreshTimer) return
  refreshTimer = setInterval(loadNewsList, REFRESH_INTERVAL)
}

function stopRefreshTimer() {
  if (!refreshTimer) return
  clearInterval(refreshTimer)
  refreshTimer = null
}

const filteredList = computed(() => {
  return list.value.filter((item) => item.type === tab.value)
})

function switchTab(nextTab) {
  tab.value = nextTab
}

function formatTime(value) {
  if (!value) return '时间未标注'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`
}

function getPreview(text) {
  const cleanText = String(text || '').replace(/\s+/g, ' ').trim()
  if (!cleanText) return '点击查看详情'
  if (cleanText.length <= 46) return cleanText
  return `${cleanText.slice(0, 46)}...`
}

async function loadNewsList() {
  try {
    error.value = ''
    const [nowList, historyList] = await Promise.all([
      fetchNews('now'),
      fetchNews('history')
    ])

    list.value = [...nowList, ...historyList]
  } catch (requestError) {
    error.value = '新闻加载失败，请检查网络或后端服务。'
  } finally {
    loading.value = false
  }
}

function goDetail(item) {
  uni.vibrateShort()

  setTimeout(() => {
    uni.navigateTo({
      url:
        `/pages/newsDetail/newsDetail?id=${encodeURIComponent(item.id || '')}` +
        `&image=${encodeURIComponent(item.image || '')}` +
        `&title=${encodeURIComponent(item.title)}` +
        `&desc=${encodeURIComponent(item.desc)}` +
        `&time=${encodeURIComponent(item.time || '')}`
    })
  }, 80)
}

onMounted(() => {
  loadNewsList()

  if (props.active) {
    startRefreshTimer()
  }
})

onUnmounted(() => {
  stopRefreshTimer()
})

watch(
  () => props.active,
  (nextActive) => {
    if (nextActive) {
      loadNewsList()
      startRefreshTimer()
    } else {
      stopRefreshTimer()
    }
  }
)
</script>

<style>
.container {
  height: 100%;
  padding: 24px 20px 0;
  box-sizing: border-box;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  margin-bottom: 20px;
  flex-shrink: 0;
}

.header-title {
  display: block;
  font-size: 34px;
  font-weight: 800;
  color: #111;
}

.tabs {
  display: flex;
  gap: 14px;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.tab {
  flex: 1;
  min-height: 58px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border-radius: 18px;
  font-size: 20px;
  color: #5d6775;
  border: 2px solid #e8ebf0;
}

.tab.active {
  background: #111111;
  color: #ffffff;
  font-weight: 800;
  border-color: #111111;
}

.news-scroll {
  flex: 1;
  min-height: 0;
  padding-bottom: 96px;
  box-sizing: border-box;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-bottom: 8px;
}

.card,
.state-card {
  background: #ffffff;
  padding: 24px 22px;
  border-radius: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border: 1px solid #ececec;
}

.state-card.error {
  border-color: #f1c0c0;
}

.title {
  display: block;
  font-size: 24px;
  font-weight: 800;
  line-height: 1.5;
  color: #111;
}

.time {
  display: block;
  margin-top: 12px;
  font-size: 19px;
  color: #7b8391;
}

.desc,
.state-text {
  display: block;
  margin-top: 14px;
  font-size: 21px;
  line-height: 1.8;
  color: #2c3440;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-slide-enter-active {
  transition: all 0.35s ease;
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-slide-leave-active {
  transition: all 0.25s ease;
}
</style>
