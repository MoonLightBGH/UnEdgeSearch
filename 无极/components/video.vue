<template>
  <view class="container">
    <view class="header">
      <text class="header-title">视频</text>
    </view>

    <view class="menu-btn" @click="toggleMenu">
      <text class="menu-dots">···</text>
    </view>

    <scroll-view class="tabs-scroll" scroll-x>
      <view class="tabs">
        <view
          v-for="item in availableTabs"
          :key="item"
          :class="['tab', tab === item ? 'active' : '']"
          @click="switchTab(item)"
        >
          {{ item }}
        </view>
      </view>
    </scroll-view>

    <scroll-view class="video-scroll" scroll-y>
      <view v-if="loading" class="state-card">
        <text class="state-text">正在更新适合长辈观看的视频，请稍等。</text>
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
            @click="openVideo(item)"
          >
            <view class="cover-wrap">
            <image
              v-if="item.cover"
              class="cover"
              :src="item.cover"
              mode="aspectFill"
            />
            <view v-else class="cover placeholder">
              <view class="placeholder-top">
                <text class="placeholder-tag">{{ item.type }}</text>
                <text class="placeholder-source">{{ getSourceText(item) }}</text>
              </view>
              <text class="placeholder-title">{{ item.title }}</text>
              <view class="placeholder-bottom">
                <text class="play-icon">▶</text>
                <text class="placeholder-hint">暂无封面，点开即可播放</text>
              </view>
            </view>
              <view class="play-badge">
                <text class="play-text">播放</text>
              </view>
            </view>

            <view class="content">
              <text class="video-title">{{ item.title }}</text>
              <text class="desc">{{ getPreview(item.desc) }}</text>

              <view class="meta">
                <text class="tag">{{ item.type }}</text>
                <text class="source">{{ getSourceText(item) }}</text>
                <text class="time">{{ formatTime(item.time) }}</text>
              </view>
            </view>
          </view>

          <view v-if="!filteredList.length" class="state-card">
            <text class="state-text">这一栏暂时还没有合适视频，我们会继续补充。</text>
          </view>
        </view>
      </transition>
    </scroll-view>

    <transition name="fade">
      <view v-if="showMenu" class="mask" @click="showMenu = false"></view>
    </transition>

    <transition name="menu">
      <view v-if="showMenu" class="menu-popup" @click.stop>
        <view class="menu-item" @click="goTo('favorite')">收藏的视频</view>
        <view class="menu-item" @click="goTo('like')">点赞的视频</view>
      </view>
    </transition>

    <FloatTabBar current="video" />
  </view>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import FloatTabBar from '@/components/FloatTabBar.vue'
import { fetchNovels, fetchVideos } from '@/utils/api.js'

const props = defineProps({
  active: {
    type: Boolean,
    default: false
  }
})

const REFRESH_INTERVAL = 3 * 60 * 1000
const TAB_ORDER = ['推荐', '健康', '生活', '三农', '小说']

const tab = ref('推荐')
const list = ref([])
const loading = ref(true)
const error = ref('')
const showMenu = ref(false)

let refreshTimer = null

function startRefreshTimer() {
  if (refreshTimer) return
  refreshTimer = setInterval(loadVideos, REFRESH_INTERVAL)
}

function stopRefreshTimer() {
  if (!refreshTimer) return
  clearInterval(refreshTimer)
  refreshTimer = null
}

const availableTabs = computed(() => {
  const types = new Set(list.value.map((item) => item.type).filter(Boolean))
  const ordered = TAB_ORDER.filter((item) => types.has(item))
  return ordered.length ? ordered : ['推荐']
})

const filteredList = computed(() => {
  return list.value.filter((item) => item.type === tab.value)
})

watch(availableTabs, (nextTabs) => {
  if (!nextTabs.includes(tab.value)) {
    tab.value = nextTabs[0]
  }
})

function normalizeType(item) {
  const sourceText = `${item.type || ''} ${item.source || ''} ${item.title || ''} ${item.desc || ''}`.toLowerCase()

  if (/小说|有声书|有声小说|多人小说剧|评书|爽文|听书/.test(sourceText)) {
    return '小说'
  }

  if (/健康|养生|中医|平安365|保健|医生|科普/.test(sourceText)) {
    return '健康'
  }

  if (/三农|农业|农民|春耕|乡村|种植|养殖|科技苑|每日农经/.test(sourceText)) {
    return '三农'
  }

  if (/生活|法治|反诈|家政|出行|民生|安全|服务/.test(sourceText)) {
    return '生活'
  }

  return '推荐'
}

function decorateVideos(items) {
  return (items || []).map((item) => ({
    ...item,
    type: normalizeType(item),
    kind: 'video'
  }))
}

function decorateNovels(items) {
  return (items || []).map((item) => ({
    ...item,
    type: '小说',
    kind: 'novel',
    desc: item.desc || item.chapter_title || '点击进入听小说'
  }))
}

function switchTab(nextTab) {
  tab.value = nextTab
}

function toggleMenu() {
  showMenu.value = !showMenu.value
}

function goTo(type) {
  showMenu.value = false
  uni.navigateTo({
    url: `/pages/videoList/videoList?type=${encodeURIComponent(type)}`,
    animationType: 'fade-in',
    animationDuration: 200
  })
}

function formatTime(value) {
  if (!value) return '时间未标注'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

function getSourceText(item) {
  if (item.source) return item.source
  if ((item.url || '').includes('bilibili.com')) return '哔哩哔哩'
  if ((item.url || '').includes('cctv.com')) return '央视视频'
  if ((item.url || '').includes('news.cn')) return '新华视频'
  return '精选视频'
}

function getPreview(text) {
  const cleanText = String(text || '').replace(/\s+/g, ' ').trim()
  if (!cleanText) return '点击进入查看简介和播放入口。'
  if (cleanText.length <= 28) return cleanText
  return `${cleanText.slice(0, 28)}...`
}

async function loadVideos() {
  try {
    error.value = ''
    const [videoRows, novelRows] = await Promise.all([fetchVideos(), fetchNovels()])
    list.value = [...decorateVideos(videoRows), ...decorateNovels(novelRows)]
  } catch (requestError) {
    error.value = '视频加载失败，请检查网络或后端服务。'
  } finally {
    loading.value = false
  }
}

function openVideo(item) {
  uni.vibrateShort()
  setTimeout(() => {
    if (item.kind === 'novel') {
      uni.navigateTo({
        url:
          `/pages/novelDetail/novelDetail?id=${encodeURIComponent(item.id || '')}` +
          `&title=${encodeURIComponent(item.title || '')}` +
          `&desc=${encodeURIComponent(item.desc || '')}` +
          `&time=${encodeURIComponent(item.time || '')}` +
          `&cover=${encodeURIComponent(item.cover || '')}` +
          `&source=${encodeURIComponent(item.source || '免费小说')}`,
        animationType: 'fade-in',
        animationDuration: 200
      })
      return
    }

    uni.navigateTo({
      url:
        `/pages/videoDetail/videoDetail?id=${encodeURIComponent(item.id || '')}` +
        `&title=${encodeURIComponent(item.title || '')}` +
        `&desc=${encodeURIComponent(item.desc || '')}` +
        `&time=${encodeURIComponent(item.time || '')}` +
        `&cover=${encodeURIComponent(item.cover || '')}` +
        `&url=${encodeURIComponent(item.url || '')}` +
        `&source=${encodeURIComponent(getSourceText(item))}` +
        `&type=${encodeURIComponent(item.type || '推荐')}`,
      animationType: 'fade-in',
      animationDuration: 200
    })
  }, 80)
}

onMounted(() => {
  loadVideos()

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
      loadVideos()
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

.menu-btn {
  position: fixed;
  top: 24px;
  right: 20px;
  min-width: 58px;
  height: 52px;
  padding: 0 16px;
  border-radius: 18px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #ececec;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
  z-index: 3003;
}

.menu-dots {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  color: #111;
}

.tabs-scroll {
  margin-bottom: 16px;
  white-space: nowrap;
  flex-shrink: 0;
}

.tabs {
  display: inline-flex;
  gap: 12px;
  padding-right: 20px;
}

.tab {
  min-width: 72px;
  height: 52px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border-radius: 18px;
  font-size: 19px;
  color: #5d6775;
  border: 2px solid #e8ebf0;
}

.tab.active {
  background: #111111;
  color: #ffffff;
  font-weight: 800;
  border-color: #111111;
}

.video-scroll {
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
  padding: 18px;
  border-radius: 22px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border: 1px solid #ececec;
}

.state-card.error {
  border-color: #f1c0c0;
}

.cover-wrap {
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  background: #e9edf2;
}

.cover {
  width: 100%;
  height: 210px;
  display: block;
}

.cover.placeholder {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 18px;
  box-sizing: border-box;
  background: linear-gradient(135deg, #111111 0%, #2a2f38 55%, #525b69 100%);
}

.placeholder-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.placeholder-tag {
  min-width: 58px;
  height: 30px;
  padding: 0 12px;
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 700;
}

.placeholder-source {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.78);
}

.placeholder-title {
  display: block;
  font-size: 26px;
  font-weight: 800;
  line-height: 1.45;
  color: #ffffff;
}

.placeholder-bottom {
  display: flex;
  align-items: center;
  gap: 10px;
}

.play-icon {
  font-size: 34px;
  color: #ffffff;
}

.placeholder-hint {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.82);
}

.play-badge {
  position: absolute;
  right: 14px;
  bottom: 14px;
  min-width: 72px;
  height: 38px;
  padding: 0 16px;
  border-radius: 19px;
  background: rgba(17, 17, 17, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-text {
  font-size: 17px;
  color: #ffffff;
  font-weight: 700;
}

.content {
  padding: 18px 4px 4px;
}

.video-title {
  display: block;
  font-size: 24px;
  font-weight: 800;
  line-height: 1.45;
  color: #111;
}

.desc,
.state-text {
  display: block;
  margin-top: 12px;
  font-size: 20px;
  line-height: 1.75;
  color: #2c3440;
}

.meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 14px;
}

.tag {
  min-width: 60px;
  height: 34px;
  padding: 0 14px;
  border-radius: 17px;
  background: #111111;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
}

.source,
.time {
  font-size: 17px;
  color: #7b8391;
}

.mask {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(0, 0, 0, 0.28);
}

.menu-popup {
  position: fixed;
  top: 88px;
  right: 20px;
  width: 170px;
  padding: 8px 0;
  background: #ffffff;
  border-radius: 18px;
  z-index: 3002;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.14);
}

.menu-item {
  padding: 16px 20px;
  font-size: 19px;
  color: #111;
}

.menu-item:active {
  background: #f5f5f5;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.menu-enter-active,
.menu-leave-active {
  transition: all 0.2s ease;
  transform-origin: top right;
}

.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: scale(0.92);
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
