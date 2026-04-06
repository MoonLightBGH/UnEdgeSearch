<template>
  <view :class="['page', show ? 'fade-in' : 'fade-out']">
    <view class="top-actions">
      <view class="floating-btn back" @click="goBack">
        <text class="btn-text">返回</text>
      </view>
    </view>

    <view class="content">
      <text class="page-title">{{ pageTitle }}</text>

      <scroll-view class="list-scroll" scroll-y>
        <view v-if="!list.length" class="state-card">
          <text class="state-text">{{ emptyText }}</text>
        </view>

        <view v-else class="list">
          <view
            v-for="item in list"
            :key="item.id || item.url || item.title"
            class="card"
            @click="openVideo(item)"
          >
            <image
              v-if="item.cover"
              class="cover"
              :src="item.cover"
              mode="aspectFill"
            />
            <view v-else class="cover placeholder">
              <view class="placeholder-top">
                <text class="placeholder-tag">{{ item.type || '推荐' }}</text>
                <text class="placeholder-source">{{ item.source || '精选视频' }}</text>
              </view>
              <text class="placeholder-title">{{ item.title }}</text>
              <view class="placeholder-bottom">
                <text class="placeholder-icon">▶</text>
                <text class="placeholder-hint">暂无封面，点开即可播放</text>
              </view>
            </view>

            <view class="card-content">
              <text class="title">{{ item.title }}</text>
              <text class="desc">{{ getPreview(item.desc) }}</text>

              <view class="meta">
                <text class="tag">{{ item.type || '推荐' }}</text>
                <text class="source">{{ item.source || '精选视频' }}</text>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const list = ref([])
const pageTitle = ref('收藏的视频')
const emptyText = ref('暂时还没有收藏的视频。')
const show = ref(false)

function getPreview(text) {
  const cleanText = String(text || '').replace(/\s+/g, ' ').trim()
  if (!cleanText) return '点击进入查看简介和播放入口。'
  if (cleanText.length <= 30) return cleanText
  return `${cleanText.slice(0, 30)}...`
}

function goBack() {
  show.value = false
  setTimeout(() => {
    uni.navigateBack()
  }, 180)
}

function openVideo(item) {
  uni.navigateTo({
    url:
      `/pages/videoDetail/videoDetail?id=${encodeURIComponent(item.id || '')}` +
      `&title=${encodeURIComponent(item.title || '')}` +
      `&desc=${encodeURIComponent(item.desc || '')}` +
      `&time=${encodeURIComponent(item.time || '')}` +
      `&cover=${encodeURIComponent(item.cover || '')}` +
      `&url=${encodeURIComponent(item.url || '')}` +
      `&source=${encodeURIComponent(item.source || '')}` +
      `&type=${encodeURIComponent(item.type || '推荐')}`,
    animationType: 'fade-in',
    animationDuration: 200
  })
}

onLoad((options) => {
  const viewType = options.type === 'like' ? 'like' : 'favorite'
  pageTitle.value = viewType === 'favorite' ? '收藏的视频' : '点赞的视频'
  emptyText.value =
    viewType === 'favorite' ? '暂时还没有收藏的视频。' : '暂时还没有点赞的视频。'

  const keys = uni.getStorageInfoSync().keys
  const result = []

  keys.forEach((key) => {
    if (!key.startsWith('video_action_')) return

    const data = uni.getStorageSync(key)
    if (!data || !data.item) return

    if ((viewType === 'favorite' && data.favorited) || (viewType === 'like' && data.liked)) {
      result.push(data.item)
    }
  })

  list.value = result.reverse()

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
  justify-content: flex-start;
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
  padding: 86px 18px 18px;
}

.page-title {
  display: block;
  margin-bottom: 18px;
  font-size: 30px;
  font-weight: 800;
  color: #111;
}

.list-scroll {
  height: calc(100vh - 144px);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-bottom: 18px;
}

.card,
.state-card {
  background: #ffffff;
  padding: 18px;
  border-radius: 22px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border: 1px solid #ececec;
}

.cover {
  width: 100%;
  height: 190px;
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
  font-size: 24px;
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
  font-size: 34px;
  color: #ffffff;
}

.placeholder-hint {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.82);
}

.card-content {
  padding-top: 16px;
}

.title {
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

.source {
  font-size: 17px;
  color: #7b8391;
}
</style>
