<template>
  <view class="container" :class="{ archiving: archiving }">
    <scroll-view v-if="summary" class="result" scroll-y>
      <view class="result-inner">
        <text class="summary-title">AI总结</text>
        <text class="summary-text">{{ summary }}</text>

        <view v-for="section in sections" :key="section.key" class="result-group">
          <view class="group-head">
            <text class="group-title">{{ section.label }}</text>
            <text class="group-count">{{ section.items.length }}条</text>
          </view>

          <view
            v-for="item in section.items"
            :key="`${section.key}-${item.id}`"
            class="result-item"
            @click="openItem(section.key, item)"
          >
            <text class="item-title">{{ item.title }}</text>
            <text class="item-desc">{{ getPreview(section.key, item) }}</text>
            <view class="item-meta">
            <text class="item-chip">{{ section.label }}</text>
              <text class="item-time">{{ getMetaText(section.key, item) }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <view class="center-box" :class="getPositionClass" :style="getBottomStyle">
      <text class="title" :class="showTitle ? 'title-show' : 'title-hide'">
        今天要搜点什么？
      </text>

      <view class="input-wrapper" :class="{ multiline: isMultiLine }">
        <textarea
          :disabled="isBusy"
          v-model="keyword"
          class="input-area"
          placeholder="输入问题..."
          auto-height
          maxlength="200"
          @focus="onFocus"
          @confirm="doSearch"
        ></textarea>

        <view class="search-btn" :class="{ disabled: isBusy }" @click="doSearch">
          <image src="/static/tabbar/search_active.png" />
        </view>
      </view>

      <view class="progress" :class="searching ? 'progress-show' : 'progress-hide'">
        <view
          class="bar"
          :class="progressActive ? 'active' : 'no-anim'"
          :style="{ width: progress + '%' }"
        ></view>
      </view>
    </view>

    <view class="archive-btn" :class="{ disabled: isBusy }" @click="handleArchiveClick">
      <image src="/static/icons/archive.png" />
    </view>

    <FloatTabBar />
  </view>

  <view class="confirm-mask" :class="{ show: showConfirm }" @click.self="showConfirm = false">
    <view class="confirm-box">
      <view class="confirm-content">
        <view class="confirm-title">删除记录？</view>
        <view class="confirm-desc">删除后将无法恢复</view>
      </view>

      <view class="confirm-actions">
        <view class="btn cancel" @click="showConfirm = false">取消</view>
        <view class="btn danger" @click="doDelete">删除</view>
      </view>
    </view>
  </view>

  <view class="drawer" :class="{ show: showDrawer }">
    <view class="drawer-mask" @click="showDrawer = false"></view>

    <view class="drawer-panel">
      <view class="drawer-header">
        <image src="/static/icons/back.png" class="back" @click="showDrawer = false" />
        <view class="drawer-title">历史记录</view>
      </view>

      <scroll-view scroll-y class="drawer-list">
        <view v-for="item in archives" :key="item.id" class="drawer-item">
          <view class="text" @click="loadArchive(item)">
            {{ item.keyword }}
          </view>

          <image
            src="/static/icons/delete.png"
            class="delete"
            @click.stop="confirmDelete(item.id)"
          />
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import FloatTabBar from '@/components/FloatTabBar.vue'
import {
  createSearchHistory,
  deleteSearchHistory,
  fetchSearchHistory,
  searchAll
} from '@/utils/api.js'

const keyword = ref('')
const summary = ref('')
const progress = ref(0)
const sections = ref([])

const searching = ref(false)
const searched = ref(false)
const showDrawer = ref(false)
const archiving = ref(false)
const progressActive = ref(true)
const showConfirm = ref(false)
const deleteId = ref(null)
const keyboardHeight = ref(0)
const archives = ref([])

let keyboardHandler = null

onMounted(async () => {
  keyboardHandler = (res) => {
    keyboardHeight.value = res.height
  }

  if (uni.onKeyboardHeightChange) {
    uni.onKeyboardHeightChange(keyboardHandler)
  }

  await loadArchives()
})

onUnmounted(() => {
  if (uni.offKeyboardHeightChange && keyboardHandler) {
    uni.offKeyboardHeightChange(keyboardHandler)
  }
})

const showTitle = computed(() => !searched.value && keyboardHeight.value === 0)

const getPositionClass = computed(() => {
  if (searched.value) return 'bottom-fixed'
  if (keyboardHeight.value > 0) return 'bottom'
  return 'center'
})

const isBusy = computed(() => searching.value)

const getBottomStyle = computed(() => {
  if (keyboardHeight.value > 0) {
    return { bottom: `${keyboardHeight.value}px` }
  }
  return {}
})

const isMultiLine = computed(() => keyword.value.includes('\n') || keyword.value.length > 30)

function onFocus() {}

async function loadArchives() {
  try {
    archives.value = await fetchSearchHistory()
  } catch (error) {
    archives.value = []
  }
}

function getPreview(sectionKey, item) {
  const text = sectionKey === 'novel'
    ? (item.desc || item.chapter_title || item.content || '')
    : (item.desc || '')

  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  if (!clean) {
    return sectionKey === 'video' ? '点击查看详情和播放入口。' : '点击查看详细内容。'
  }

  const limit = sectionKey === 'novel' ? 42 : 36
  return clean.length > limit ? `${clean.slice(0, limit)}...` : clean
}

function getTimeText(value) {
  if (!value) return '未标注时间'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10)
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getMetaText(sectionKey, item) {
  if (sectionKey === 'web') {
    return item.source || '网页结果'
  }

  return getTimeText(item.time)
}

async function saveArchive() {
  if (!keyword.value.trim() || !summary.value) return

  try {
    await createSearchHistory({
      keyword: keyword.value.trim(),
      summary: summary.value
    })
    await loadArchives()
  } catch (error) {
    // ignore archive save failure
  }
}

function startProgress() {
  progressActive.value = false
  progress.value = 0

  requestAnimationFrame(() => {
    progressActive.value = true
    progress.value = 1
  })
}

async function doSearch() {
  const text = keyword.value.trim()
  if (!text || searching.value) return

  startProgress()
  searched.value = true
  searching.value = true
  summary.value = ''
  sections.value = []

  const timer = setInterval(() => {
    if (progress.value < 95) {
      progress.value += 2
    }
  }, 100)

  try {
    const response = await searchAll(text)
    clearInterval(timer)
    progress.value = 100

    setTimeout(async () => {
      summary.value = response.summary || '已经帮你整理好了相关内容。'
      sections.value = Array.isArray(response.sections) ? response.sections : []
      searching.value = false
      await saveArchive()
    }, 180)
  } catch (error) {
    clearInterval(timer)
    progress.value = 100

    setTimeout(() => {
      summary.value = error.message || '搜索失败，请稍后再试。'
      sections.value = []
      searching.value = false
    }, 180)
  }
}

function handleArchiveClick() {
  if (searched.value) {
    archiveAnimation()
    return
  }

  showDrawer.value = true
}

function archiveAnimation() {
  archiving.value = true

  setTimeout(() => {
    summary.value = ''
    sections.value = []
    searched.value = false
    keyword.value = ''
    archiving.value = false
  }, 400)
}

function confirmDelete(id) {
  deleteId.value = id
  showConfirm.value = true
}

async function doDelete() {
  try {
    await deleteSearchHistory(deleteId.value)
    archives.value = archives.value.filter((item) => item.id !== deleteId.value)
  } catch (error) {
    uni.showToast({ title: '删除失败', icon: 'none' })
  } finally {
    showConfirm.value = false
  }
}

async function loadArchive(item) {
  keyword.value = item.keyword || ''
  showDrawer.value = false
  await doSearch()
}

function openItem(sectionKey, item) {
  if (sectionKey === 'web') {
    const targetUrl = item.url || ''
    if (!targetUrl) return

    if (typeof plus !== 'undefined' && plus.runtime && plus.runtime.openURL) {
      plus.runtime.openURL(targetUrl)
      return
    }

    if (typeof window !== 'undefined' && window.open) {
      window.open(targetUrl, '_blank')
      return
    }

    uni.setClipboardData({
      data: targetUrl,
      success: () => {
        uni.showToast({
          title: '链接已复制',
          icon: 'none'
        })
      }
    })
    return
  }

  if (sectionKey === 'news') {
    uni.navigateTo({
      url:
        `/pages/newsDetail/newsDetail?id=${encodeURIComponent(item.id || '')}` +
        `&image=${encodeURIComponent(item.image || '')}` +
        `&title=${encodeURIComponent(item.title || '')}` +
        `&desc=${encodeURIComponent(item.desc || '')}` +
        `&time=${encodeURIComponent(item.time || '')}`
    })
    return
  }

  if (sectionKey === 'video') {
    uni.navigateTo({
      url:
        `/pages/videoDetail/videoDetail?id=${encodeURIComponent(item.id || '')}` +
        `&title=${encodeURIComponent(item.title || '')}` +
        `&desc=${encodeURIComponent(item.desc || '')}` +
        `&time=${encodeURIComponent(item.time || '')}` +
        `&cover=${encodeURIComponent(item.cover || '')}` +
        `&url=${encodeURIComponent(item.url || '')}` +
        `&source=${encodeURIComponent(item.source || '')}` +
        `&type=${encodeURIComponent(item.type || '推荐')}`
    })
    return
  }

  uni.navigateTo({
    url:
      `/pages/novelDetail/novelDetail?id=${encodeURIComponent(item.id || '')}` +
      `&title=${encodeURIComponent(item.title || '')}` +
      `&desc=${encodeURIComponent(item.desc || '')}` +
      `&time=${encodeURIComponent(item.time || '')}` +
      `&cover=${encodeURIComponent(item.cover || '')}` +
      `&source=${encodeURIComponent(item.source || '免费小说')}`
  })
}
</script>

<style>
page {
  background: #fff;
}

.container {
  height: 100vh;
  background: #fff;
  transition: transform 0.35s ease, opacity 0.35s ease;
}

.center-box {
  position: fixed;
  left: 50%;
  width: min(calc(100vw - 40px), 760px);
  max-width: 760px;
  box-sizing: border-box;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  transform: translateX(-50%);
  transition:
    top 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.25s ease;
}

.center {
  top: 39%;
  transform: translate(-50%, -50%);
}

.bottom {
  top: auto;
  bottom: 16px;
  transform: translateX(-50%);
}

.bottom-fixed {
  top: auto;
  bottom: 112px;
  transform: translateX(-50%);
}

.title {
  font-size: 28px;
  font-weight: bold;
  text-align: center;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 10px;
  max-width: 88%;
  line-height: 1.35;
}

.title-show {
  opacity: 1;
  transform: translateY(0);
}

.title-hide {
  opacity: 0;
  transform: translateY(-10px);
}

.center-box.bottom-fixed {
  gap: 0;
}

.center-box.bottom-fixed .title,
.center-box.bottom .title {
  display: none;
}

.progress {
  width: 80%;
  height: 4px;
  margin: 14px auto 0;
  border-radius: 2px;
  background: #eee;
  overflow: hidden;
  opacity: 0;
  transform-origin: center top;
  transition:
    opacity 0.22s ease,
    transform 0.22s ease,
    margin 0.22s ease;
}

.progress-show {
  opacity: 1;
  height: 4px;
  margin: 14px auto 0;
  transform: scaleY(1);
}

.progress-hide {
  opacity: 0;
  margin: 9px auto 0;
  transform: scaleY(0.15);
}

.bar {
  height: 100%;
  background: black;
}

.bar.active {
  transition: width 0.2s linear;
}

.bar.no-anim {
  transition: none;
}

.input-wrapper {
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.96);
  border-radius: 999px;
  padding: 12px 16px;
  transition:
    width 0.28s cubic-bezier(0.4, 0, 0.2, 1),
    max-width 0.28s cubic-bezier(0.4, 0, 0.2, 1),
    border-radius 0.25s ease,
    box-shadow 0.25s ease,
    background 0.25s ease;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.10);
  border: 1px solid rgba(17, 17, 17, 0.06);
  backdrop-filter: blur(14px);
}

.center-box.center .input-wrapper {
  max-width: 620px;
}

.center-box.bottom-fixed .input-wrapper,
.center-box.bottom .input-wrapper {
  max-width: 100%;
  margin-bottom: 0;
}

.input-wrapper.multiline {
  border-radius: 18px;
  align-items: flex-end;
}

.input-area {
  flex: 1;
  font-size: 18px;
  line-height: 22px;
  min-height: 22px;
  padding-top: 1px;
  padding-bottom: 0;
  text-align: center;
  max-height: 96px;
  overflow-y: auto;
  background: transparent;
  box-sizing: border-box;
}

.input-area:focus {
  text-align: left;
}

.input-wrapper:focus-within {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
}

textarea::placeholder {
  text-align: center;
  line-height: 22px;
  transform: translateY(-2px);
}

textarea {
  padding: 0 !important;
  margin: 0;
  display: block;
  line-height: 24px;
}

.search-btn {
  width: 36px;
  height: 36px;
  background: black;
  border-radius: 50%;
  margin-bottom: 0;
  transform: translateY(-1px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-btn image {
  width: 18px;
  height: 18px;
}

.result {
  position: fixed;
  top: 80px;
  bottom: 188px;
  left: 0;
  width: 100%;
  animation: fadeIn 0.3s ease;
  overflow: hidden;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.result-inner {
  padding: 20px 34px 40px 24px;
}

.summary-title {
  display: block;
  font-weight: bold;
  font-size: 18px;
  margin-bottom: 10px;
  color: #6b7280;
  letter-spacing: 1px;
}

.summary-text {
  display: block;
  font-size: 21px;
  font-weight: 600;
  line-height: 1.8;
  color: #1f2937;
  background: linear-gradient(180deg, #ffffff 0%, #f4f4f4 100%);
  padding: 22px 20px 20px;
  border-radius: 24px;
  border: 1px solid #e9e9e9;
  box-shadow:
    0 16px 36px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  word-break: break-word;
  white-space: normal;
}

.result-group {
  margin-top: 18px;
}

.group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.group-title {
  font-size: 18px;
  font-weight: 700;
  color: #111;
}

.group-count {
  font-size: 14px;
  color: #7b8391;
}

.result-item {
  padding: 14px 16px;
  background: linear-gradient(180deg, #f8f8f8 0%, #f3f3f3 100%);
  border-radius: 20px;
  margin-bottom: 10px;
  border: 1px solid #ededed;
}

.item-title {
  display: block;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.55;
  color: #111;
}

.item-desc {
  display: block;
  margin-top: 8px;
  font-size: 15px;
  line-height: 1.7;
  color: #475467;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.item-chip {
  min-width: 48px;
  height: 26px;
  padding: 0 10px;
  border-radius: 13px;
  background: #111;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}

.item-time {
  font-size: 13px;
  color: #7b8391;
}

.archive-btn {
  position: fixed;
  top: 18px;
  left: 12px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transition: all 0.2s;
  z-index: 1200;
}

.archive-btn image {
  width: 18px;
  height: 18px;
}

.archive-btn:active {
  transform: scale(0.92);
  background: #eaeaea;
}

.archiving {
  transform: scale(0.92) translateY(20px);
  opacity: 0;
}

.drawer {
  position: fixed;
  inset: 0;
  z-index: 9999;
  overflow: hidden;
  pointer-events: none;
}

.result ::-webkit-scrollbar,
.drawer-list ::-webkit-scrollbar {
  width: 6px;
}

.result ::-webkit-scrollbar-track,
.drawer-list ::-webkit-scrollbar-track {
  background: transparent;
}

.result ::-webkit-scrollbar-thumb,
.drawer-list ::-webkit-scrollbar-thumb {
  background: rgba(17, 17, 17, 0.18);
  border-radius: 999px;
}

.drawer-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  font-size: 17px;
  border-bottom: 1px solid #eee;
}

.drawer-title {
  font-size: 20px;
  font-weight: 700;
  line-height: 24px;
  padding: 0;
  color: #111;
  margin: 0;
}

.drawer-item .text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 10px;
}

.delete {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.drawer.show {
  pointer-events: auto;
}

.drawer-mask {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(2px);
  opacity: 0;
  transition: opacity 0.3s;
}

.drawer.show .drawer-mask {
  opacity: 1;
}

.drawer-panel {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 40%;
  max-width: 320px;
  background: #fff;
  z-index: 2;
  border-top-right-radius: 22px;
  border-bottom-right-radius: 22px;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
}

.drawer-list {
  flex: 1;
  overflow-y: auto;
}

.drawer.show .drawer-panel {
  transform: translateX(0);
}

.confirm-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s;
}

.confirm-mask.show {
  opacity: 1;
  pointer-events: auto;
}

.confirm-content {
  padding-bottom: 12px;
}

.confirm-box {
  width: 75%;
  max-width: 300px;
  background: #fff;
  border-radius: 18px;
  padding: 16px 18px 0;
  text-align: center;
  display: flex;
  flex-direction: column;
  transform: scale(0.9);
  opacity: 0;
  transition: all 0.25s;
}

.confirm-mask.show .confirm-box {
  transform: scale(1);
  opacity: 1;
}

.confirm-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 8px;
}

.confirm-desc {
  font-size: 15px;
  color: #666;
  margin-bottom: 8px;
}

.confirm-actions {
  display: flex;
  border-top: 1px solid #eee;
  min-height: 56px;
  align-items: center;
}

.btn {
  flex: 1;
  padding: 20px 0;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cancel {
  color: #666;
}

.danger {
  color: #000;
  font-weight: bold;
}

.drawer-header {
  display: flex;
  align-items: center;
  padding: 20px 18px 12px;
}

.back {
  width: 24px;
  height: 24px;
  margin-right: 12px;
  display: block;
}

.disabled {
  opacity: 0.4;
  pointer-events: none;
}

@keyframes pop {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
}
</style>
