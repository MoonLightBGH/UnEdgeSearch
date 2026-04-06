<template>
  <view class="page">
    <view class="top-actions">
      <view class="floating-btn back" @click="goBack">
        <text class="btn-text">返回</text>
      </view>

      <view class="floating-btn voice" @click="toggleReading">
        <text class="btn-text">{{ isReading ? '停止朗读' : '听小说' }}</text>
      </view>
    </view>

    <scroll-view :class="['container', show ? 'fade-in' : 'fade-out']" scroll-y>
      <view class="content">
        <view class="hero-card">
          <image
            v-if="cover"
            class="cover"
            :src="cover"
            mode="aspectFill"
          />
          <view v-else class="cover placeholder">
            <text class="placeholder-tag">{{ source }}</text>
            <text class="placeholder-title">{{ title }}</text>
            <text class="placeholder-desc">支持语音朗读，适合长辈慢慢听</text>
          </view>
        </view>

        <view class="meta-row">
          <text class="source-tag">免费小说</text>
          <text class="source">{{ source }}</text>
          <text class="time">{{ formatTime(time) }}</text>
        </view>

        <text class="title">{{ title }}</text>

        <view class="intro-card">
          <text class="intro-title">内容简介</text>
          <text class="intro-desc">{{ desc || '点击上方听小说即可开始朗读正文。' }}</text>
        </view>

        <view class="article-card">
          <text class="section-title">正文试读</text>
          <text class="content-text">{{ content || '正在加载正文内容…' }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { fetchNovelDetail } from '@/utils/api.js'

const id = ref('')
const title = ref('')
const desc = ref('')
const time = ref('')
const cover = ref('')
const source = ref('免费小说')
const content = ref('')
const show = ref(false)
const isReading = ref(false)

let speechInstance = null
let stoppingByUser = false

function safeDecode(value) {
  if (!value) return ''

  try {
    return decodeURIComponent(value)
  } catch (error) {
    return value
  }
}

function formatTime(value) {
  if (!value) return '时间未标注'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

async function loadDetail() {
  if (!id.value) return

  try {
    const detail = await fetchNovelDetail(id.value)
    title.value = detail.title || title.value
    desc.value = detail.desc || desc.value
    time.value = detail.time || time.value
    cover.value = detail.cover || cover.value
    source.value = detail.source || source.value
    content.value = detail.content || content.value
  } catch (error) {
    uni.showToast({
      title: '小说内容加载失败',
      icon: 'none'
    })
  }
}

function stopReading() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    stoppingByUser = true
    window.speechSynthesis.cancel()
  }

  speechInstance = null
  isReading.value = false
}

function toggleReading() {
  if (isReading.value) {
    stopReading()
    return
  }

  if (typeof window === 'undefined' || !window.speechSynthesis || !window.SpeechSynthesisUtterance) {
    uni.showToast({
      title: '当前环境暂不支持语音朗读',
      icon: 'none'
    })
    return
  }

  const readingText = `${title.value}。${content.value || desc.value}`
  if (!readingText.trim()) {
    uni.showToast({
      title: '暂无可朗读内容',
      icon: 'none'
    })
    return
  }

  stopReading()

  const utterance = new window.SpeechSynthesisUtterance(readingText)
  utterance.lang = 'zh-CN'
  utterance.rate = 0.92
  utterance.pitch = 1
  utterance.onend = () => {
    stoppingByUser = false
    isReading.value = false
    speechInstance = null
  }
  utterance.onerror = () => {
    const wasUserStop = stoppingByUser
    stoppingByUser = false
    isReading.value = false
    speechInstance = null

    if (!wasUserStop) {
      uni.showToast({
        title: '语音朗读失败',
        icon: 'none'
      })
    }
  }

  speechInstance = utterance
  window.speechSynthesis.speak(utterance)
  isReading.value = true
}

function goBack() {
  stopReading()
  show.value = false
  setTimeout(() => {
    uni.navigateBack()
  }, 180)
}

onLoad(async (options) => {
  id.value = safeDecode(options.id || '')
  title.value = safeDecode(options.title || '')
  desc.value = safeDecode(options.desc || '')
  time.value = safeDecode(options.time || '')
  cover.value = safeDecode(options.cover || '')
  source.value = safeDecode(options.source || '免费小说')

  await loadDetail()

  setTimeout(() => {
    show.value = true
  }, 30)
})

onUnload(() => {
  stopReading()
})
</script>

<style>
.page {
  min-height: 100vh;
  background: #f5f5f5;
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

.container {
  height: 100vh;
  box-sizing: border-box;
  padding: 18px 16px 32px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.fade-in {
  opacity: 1;
}

.fade-out {
  opacity: 0;
}

.content {
  margin-top: 58px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hero-card,
.intro-card,
.article-card {
  background: #ffffff;
  border-radius: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border: 1px solid #ececec;
}

.hero-card {
  padding: 16px;
}

.cover {
  width: 100%;
  height: 210px;
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

.placeholder-tag {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.82);
}

.placeholder-title {
  font-size: 28px;
  font-weight: 800;
  line-height: 1.45;
  color: #ffffff;
}

.placeholder-desc {
  font-size: 18px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.82);
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 0 8px;
}

.source-tag {
  min-width: 72px;
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
  display: block;
  padding: 0 8px;
  font-size: 30px;
  font-weight: 800;
  line-height: 1.45;
  color: #111;
}

.intro-card,
.article-card {
  padding: 20px 18px 22px;
}

.intro-title,
.section-title {
  display: block;
  font-size: 22px;
  font-weight: 800;
  color: #111;
}

.intro-desc,
.content-text {
  display: block;
  margin-top: 14px;
  font-size: 21px;
  line-height: 1.85;
  color: #2c3440;
}
</style>
