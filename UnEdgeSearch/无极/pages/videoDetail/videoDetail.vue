<template>
  <view :class="['page', show ? 'fade-in' : 'fade-out']">
    <view class="top-actions">
      <view class="floating-btn back" @click="goBack">
        <text class="btn-text">返回</text>
      </view>

      <view class="floating-btn play" @click="openVideoUrl">
        <text class="btn-text">去播放</text>
      </view>
    </view>

    <view class="content">
      <view class="hero-card">
        <image
          v-if="cover"
          class="cover"
          :src="cover"
          mode="aspectFill"
        />
        <view v-else class="cover placeholder">
          <view class="placeholder-top">
            <text class="placeholder-tag">{{ typeText }}</text>
            <text class="placeholder-source">{{ source }}</text>
          </view>
          <text class="placeholder-title">{{ title }}</text>
          <view class="placeholder-bottom">
            <text class="placeholder-icon">▶</text>
            <text class="placeholder-hint">暂无封面，仍可打开原站播放</text>
          </view>
        </view>

        <view class="play-chip" @click="openVideoUrl">
          <text class="play-chip-text">原站播放</text>
        </view>
      </view>

      <view class="meta-row">
        <text class="type-tag">{{ typeText }}</text>
        <text class="source">{{ source }}</text>
        <text class="time">{{ formatTime(time) }}</text>
      </view>

      <text class="title">{{ title }}</text>

      <view class="actions">
        <view class="action-btn" :class="{ active: liked }" @click="toggleLike">
          <text class="action-text">{{ liked ? '已点赞' : '点赞' }}</text>
        </view>

        <view class="action-btn" :class="{ active: favorited }" @click="toggleFavorite">
          <text class="action-text">{{ favorited ? '已收藏' : '收藏' }}</text>
        </view>
      </view>

      <view class="tip-card">
        <text class="tip-text">为保护版权，视频会跳转到原站播放，这里只展示简短介绍。</text>
      </view>

      <view class="article-card">
        <text class="section-title">视频简介</text>
        <text class="desc">{{ shortDesc }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { fetchVideoDetail } from '@/utils/api.js'

const id = ref('')
const title = ref('')
const desc = ref('')
const time = ref('')
const cover = ref('')
const url = ref('')
const source = ref('精选视频')
const type = ref('推荐')
const show = ref(false)
const liked = ref(false)
const favorited = ref(false)

function safeDecode(value) {
  if (!value) return ''

  try {
    return decodeURIComponent(value)
  } catch (error) {
    return value
  }
}

const storageKey = computed(() => `video_action_${id.value || url.value || title.value}`)

const currentVideo = computed(() => ({
  id: id.value,
  title: title.value,
  desc: shortDesc.value,
  time: time.value,
  cover: cover.value,
  url: url.value,
  source: source.value,
  type: type.value
}))

const typeText = computed(() => type.value || '推荐')

const shortDesc = computed(() => {
  const cleanText = String(desc.value || '').replace(/\s+/g, ' ').trim()
  if (!cleanText) return '暂时还没有简介内容。'
  if (cleanText.length <= 110) return cleanText
  return `${cleanText.slice(0, 110)}...`
})

function normalizeType(item) {
  const text = `${item.type || ''} ${item.source || ''} ${item.title || ''} ${item.desc || ''}`.toLowerCase()

  if (/小说|有声书|有声小说|多人小说剧|评书|爽文|听书/.test(text)) {
    return '小说'
  }

  if (/健康|养生|中医|平安365|保健|医生|科普/.test(text)) {
    return '健康'
  }

  if (/三农|农业|农民|春耕|乡村|种植|养殖|科技苑|每日农经/.test(text)) {
    return '三农'
  }

  if (/生活|法治|反诈|家政|出行|民生|安全|服务/.test(text)) {
    return '生活'
  }

  return '推荐'
}

function getSourceText(item) {
  if (item.source) return item.source
  if ((item.url || '').includes('bilibili.com')) return '哔哩哔哩'
  if ((item.url || '').includes('cctv.com')) return '央视视频'
  if ((item.url || '').includes('news.cn')) return '新华视频'
  return '精选视频'
}

function formatTime(value) {
  if (!value) return '时间未标注'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

function saveState() {
  uni.setStorageSync(storageKey.value, {
    liked: liked.value,
    favorited: favorited.value,
    item: currentVideo.value
  })
}

function readState() {
  const saved = uni.getStorageSync(storageKey.value)
  if (!saved) return

  liked.value = Boolean(saved.liked)
  favorited.value = Boolean(saved.favorited)
}

async function loadRemoteDetail() {
  if (!id.value) return

  try {
    const detail = await fetchVideoDetail(id.value)
    title.value = detail.title || title.value
    desc.value = detail.desc || desc.value
    time.value = detail.time || time.value
    cover.value = detail.cover || cover.value
    url.value = detail.url || url.value
    source.value = getSourceText(detail)
    type.value = normalizeType(detail)
    readState()
  } catch (error) {
    // use fallback params
  }
}

function goBack() {
  show.value = false
  setTimeout(() => {
    uni.navigateBack()
  }, 180)
}

function openVideoUrl() {
  if (!url.value) {
    uni.showToast({
      title: '暂时没有可播放链接',
      icon: 'none'
    })
    return
  }

  if (typeof plus !== 'undefined' && plus.runtime && plus.runtime.openURL) {
    plus.runtime.openURL(url.value)
    return
  }

  if (typeof window !== 'undefined' && typeof window.open === 'function') {
    window.open(url.value, '_blank')
    return
  }

  uni.setClipboardData({
    data: url.value,
    success: () => {
      uni.showToast({
        title: '链接已复制，请在浏览器打开',
        icon: 'none'
      })
    }
  })
}

function toggleLike() {
  liked.value = !liked.value
  saveState()
  uni.showToast({
    title: liked.value ? '已加入点赞' : '已取消点赞',
    icon: 'none'
  })
}

function toggleFavorite() {
  favorited.value = !favorited.value
  saveState()
  uni.showToast({
    title: favorited.value ? '已加入收藏' : '已取消收藏',
    icon: 'none'
  })
}

onLoad(async (options) => {
  id.value = safeDecode(options.id || '')
  title.value = safeDecode(options.title || '')
  desc.value = safeDecode(options.desc || '')
  time.value = safeDecode(options.time || '')
  cover.value = safeDecode(options.cover || '')
  url.value = safeDecode(options.url || '')
  source.value = safeDecode(options.source || '精选视频')
  type.value = safeDecode(options.type || '推荐')

  readState()
  await loadRemoteDetail()

  setTimeout(() => {
    show.value = true
  }, 30)
})
</script>

<style>
.page {
  height: 100vh;
  overflow: hidden;
  background: #f5f5f5;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.fade-in {
  opacity: 1;
}

.fade-out {
  opacity: 0;
}

.top-actions {
  position: fixed;
  top: 18px;
  left: 16px;
  right: 16px;
  display: flex;
  justify-content: space-between;
  z-index: 20;
}

.floating-btn {
  min-width: 110px;
  height: 52px;
  padding: 0 18px;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.96);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.btn-text {
  font-size: 22px;
  font-weight: 800;
  color: #111;
}

.content {
  height: 100vh;
  box-sizing: border-box;
  padding: 76px 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hero-card,
.article-card,
.tip-card {
  background: #ffffff;
  border-radius: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border: 1px solid #ececec;
}

.hero-card {
  padding: 16px;
  position: relative;
}

.cover {
  width: 100%;
  height: 200px;
  border-radius: 18px;
  display: block;
  background: #e9edf2;
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
  font-size: 28px;
  font-weight: 800;
  line-height: 1.45;
  color: #ffffff;
}

.placeholder-bottom {
  display: flex;
  align-items: center;
  gap: 10px;
}

.placeholder-icon {
  font-size: 36px;
  color: #ffffff;
}

.placeholder-hint {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.82);
}

.play-chip {
  position: absolute;
  right: 28px;
  bottom: 28px;
  min-width: 110px;
  height: 42px;
  padding: 0 18px;
  border-radius: 21px;
  background: rgba(17, 17, 17, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-chip-text {
  font-size: 18px;
  color: #ffffff;
  font-weight: 700;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 0 8px;
}

.type-tag {
  min-width: 64px;
  height: 36px;
  padding: 0 14px;
  border-radius: 18px;
  background: #111111;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  font-weight: 700;
}

.source,
.time {
  font-size: 18px;
  color: #7b8391;
}

.title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  padding: 0 8px;
  font-size: 28px;
  font-weight: 800;
  line-height: 1.4;
  color: #111;
}

.actions {
  display: flex;
  gap: 14px;
  padding: 0 8px;
}

.action-btn {
  flex: 1;
  min-height: 52px;
  border-radius: 18px;
  background: #ffffff;
  border: 2px solid #e8ebf0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn.active {
  background: #111111;
  border-color: #111111;
}

.action-text {
  font-size: 20px;
  font-weight: 700;
  color: #344050;
}

.action-btn.active .action-text {
  color: #ffffff;
}

.tip-card {
  padding: 16px 18px;
}

.tip-text {
  display: block;
  font-size: 18px;
  line-height: 1.65;
  color: #4f5b6a;
}

.article-card {
  flex: 1;
  min-height: 0;
  padding: 20px 18px 22px;
}

.section-title {
  display: block;
  font-size: 22px;
  font-weight: 800;
  color: #111;
}

.desc {
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: 14px;
  font-size: 22px;
  line-height: 1.8;
  color: #2c3440;
}
</style>
