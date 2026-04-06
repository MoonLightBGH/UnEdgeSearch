<template>
  <view class="page">
    <view class="top-actions">
      <view class="floating-btn back" @click="goBack">
        <text class="back-arrow">←</text>
        <text>返回</text>
      </view>

      <view class="floating-btn voice" @click="toggleReading">
        <text>{{ isReading ? '停止朗读' : '语音朗读' }}</text>
      </view>
    </view>

    <scroll-view :class="['container', show ? 'fade-in' : 'fade-out']" scroll-y>
      <view class="content">
        <text class="title">{{ title }}</text>
        <text class="time">{{ time }}</text>

        <view class="divider"></view>

        <view v-if="contentBlocks.length" class="blocks">
          <view v-for="(block, index) in contentBlocks" :key="`${block.type}-${index}`">
            <image
              v-if="block.type === 'image'"
              class="hero-image"
              :src="block.content"
              mode="widthFix"
            />
            <text v-else class="desc">{{ block.content }}</text>
          </view>
        </view>

        <view v-else>
          <view v-if="images.length" class="image-group">
            <image
              v-for="(item, index) in images"
              :key="item + index"
              class="hero-image"
              :src="item"
              mode="widthFix"
            />
          </view>
          <text class="desc">{{ desc }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { fetchNewsDetail } from '@/utils/api.js'

const id = ref('')
const title = ref('')
const desc = ref('')
const time = ref('')
const image = ref('')
const images = ref([])
const contentBlocks = ref([])
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

function parseImages(value) {
  if (!value) return []

  if (Array.isArray(value)) return value.filter(Boolean)

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch (error) {
    return []
  }
}

function parseBlocks(value) {
  if (!value) return []

  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    if (!Array.isArray(parsed)) return []

    return parsed.filter((item) => item && ['text', 'image'].includes(item.type) && item.content)
  } catch (error) {
    return []
  }
}

function mergeBlocksWithImages(blocks, imageList) {
  const normalizedBlocks = Array.isArray(blocks) ? [...blocks] : []
  const imagesInBlocks = new Set(
    normalizedBlocks
      .filter((item) => item.type === 'image')
      .map((item) => item.content)
  )

  const remainingImages = imageList.filter((item) => item && !imagesInBlocks.has(item))
  if (!remainingImages.length) return normalizedBlocks

  const hasImageBlocks = normalizedBlocks.some((item) => item.type === 'image')
  if (hasImageBlocks) return normalizedBlocks

  if (!normalizedBlocks.length) {
    return remainingImages.map((item) => ({ type: 'image', content: item }))
  }

  const captionLikeCount = normalizedBlocks.filter((item) => {
    return (
      item.type === 'text' &&
      /新华社发|摄）|摄\)|无人机照片|资料图片|这是\d+月\d+日/.test(item.content || '')
    )
  }).length

  if (captionLikeCount >= Math.max(2, Math.floor(normalizedBlocks.length / 2))) {
    const mergedByCaption = []

    normalizedBlocks.forEach((block, index) => {
      if (remainingImages[index]) {
        mergedByCaption.push({ type: 'image', content: remainingImages[index] })
      }
      mergedByCaption.push(block)
    })

    for (let i = normalizedBlocks.length; i < remainingImages.length; i += 1) {
      mergedByCaption.push({ type: 'image', content: remainingImages[i] })
    }

    return mergedByCaption
  }

  let textCount = 0
  let imageIndex = 0
  const merged = []

  for (const block of normalizedBlocks) {
    merged.push(block)

    if (block.type === 'text') {
      textCount += 1
    }

    if (block.type === 'text' && textCount % 3 === 1 && imageIndex < remainingImages.length) {
      merged.push({ type: 'image', content: remainingImages[imageIndex] })
      imageIndex += 1
    }
  }

  while (imageIndex < remainingImages.length) {
    merged.push({ type: 'image', content: remainingImages[imageIndex] })
    imageIndex += 1
  }

  return merged
}

function ensureReadableBlocks(blocks, fallbackDesc, imageList) {
  const merged = mergeBlocksWithImages(blocks, imageList)
  const hasTextBlock = merged.some((item) => item.type === 'text' && (item.content || '').trim())

  if (hasTextBlock) {
    return merged
  }

  const normalizedDesc = (fallbackDesc || '').trim()
  if (!normalizedDesc) {
    return merged
  }

  return [{ type: 'text', content: normalizedDesc }, ...merged]
}

function getReadingText() {
  if (contentBlocks.value.length) {
    return contentBlocks.value
      .filter((item) => item.type === 'text')
      .map((item) => item.content)
      .join(' ')
  }

  return desc.value
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

  const text = getReadingText()
  if (!text) {
    uni.showToast({
      title: '暂无可朗读内容',
      icon: 'none'
    })
    return
  }

  stopReading()

  const utterance = new window.SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  utterance.rate = 0.9
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

async function loadRemoteDetail() {
  if (!id.value) return

  try {
    const detail = await fetchNewsDetail(id.value)
    title.value = detail.title || title.value
    desc.value = detail.desc || desc.value
    time.value = detail.time || time.value
    image.value = detail.image || image.value
    images.value = parseImages(detail.images)
    contentBlocks.value = ensureReadableBlocks(parseBlocks(detail.blocks), desc.value, images.value)

    if (!images.value.length && image.value) {
      images.value = [image.value]
      contentBlocks.value = ensureReadableBlocks(contentBlocks.value, desc.value, images.value)
    }
  } catch (error) {
    // keep fallback query data when request fails
  }
}

onLoad((options) => {
  id.value = safeDecode(options.id || '')
  title.value = safeDecode(options.title || '')
  desc.value = safeDecode(options.desc || '')
  time.value = safeDecode(options.time || '')
  image.value = safeDecode(options.image || '')
  images.value = image.value ? [image.value] : []
  contentBlocks.value = ensureReadableBlocks([], desc.value, images.value)

  loadRemoteDetail()

  setTimeout(() => {
    show.value = true
  }, 30)
})

onUnload(() => {
  stopReading()
})

function goBack() {
  stopReading()
  show.value = false

  setTimeout(() => {
    uni.navigateBack()
  }, 200)
}
</script>

<style>
.page {
  height: 100vh;
  background: #f7f7f7;
}

.top-actions {
  position: fixed;
  top: 14px;
  left: 14px;
  right: 14px;
  z-index: 20;
  display: flex;
  justify-content: space-between;
  pointer-events: none;
}

.floating-btn {
  min-height: 54px;
  padding: 0 18px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.95);
  font-size: 22px;
  font-weight: 700;
  color: #111;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.1);
  display: inline-flex;
  align-items: center;
  pointer-events: auto;
  backdrop-filter: blur(8px);
}

.back-arrow {
  margin-right: 10px;
  font-size: 28px;
}

.container {
  height: 100vh;
  background: #f7f7f7;
  padding: 18px 16px 32px;
  box-sizing: border-box;
  opacity: 0;
  transform: scale(0.98);
  transition: opacity 0.2s ease;
}

.fade-in {
  opacity: 1;
  transform: scale(1);
}

.fade-out {
  opacity: 0;
  transform: scale(1);
}

.content {
  background: #ffffff;
  margin-top: 58px;
  padding: 24px 22px;
  border-radius: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.title {
  display: block;
  font-size: 29px;
  font-weight: 800;
  line-height: 1.6;
  color: #111;
}

.time {
  display: block;
  margin-top: 12px;
  font-size: 19px;
  color: #7b8391;
}

.divider {
  height: 1px;
  background: #ececec;
  margin: 20px 0;
}

.blocks,
.image-group {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.hero-image {
  width: 100%;
  border-radius: 18px;
  background: #f1f3f6;
}

.desc {
  display: block;
  font-size: 22px;
  line-height: 2;
  color: #333;
  text-indent: 2em;
  white-space: pre-wrap;
}
</style>
