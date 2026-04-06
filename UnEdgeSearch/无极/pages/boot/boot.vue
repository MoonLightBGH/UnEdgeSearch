<template>
  <view class="boot-page" :class="{ ready: showContent && !leaving, leaving }">
    <view class="brand-wrap">
      <image class="brand-logo" src="/static/icons/UnEdge.png" mode="aspectFit" />
      <view class="brand-ring"></view>
    </view>
    <text class="brand-title">无极</text>
    <text class="brand-subtitle">让陪伴、资讯与搜索更简单</text>
  </view>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { fetchClientStatus, getApiBase, getDisconnectReason, needsReconnect, sendHeartbeat } from '@/utils/api'

const showContent = ref(false)
const leaving = ref(false)

function smoothReLaunch(url) {
  leaving.value = true
  setTimeout(() => {
    uni.reLaunch({ url })
  }, 260)
}

function goConnect(reason = '') {
  const query = reason ? `?reason=${encodeURIComponent(reason)}` : ''
  smoothReLaunch(`/pages/connect/connect${query}`)
}

function goHome() {
  smoothReLaunch('/pages/index/index')
}

async function bootstrap() {
  const savedBase = getApiBase()

  if (!savedBase) {
    goConnect()
    return
  }

  if (needsReconnect()) {
    goConnect(getDisconnectReason())
    return
  }

  try {
    const status = await fetchClientStatus()

    if (!status.connected) {
      goConnect('服务器已断开当前设备')
      return
    }

    await sendHeartbeat()
    goHome()
  } catch (error) {
    goConnect(error?.message || '连接服务器失败，请重新输入地址')
  }
}

onMounted(() => {
  requestAnimationFrame(() => {
    showContent.value = true
  })

  setTimeout(() => {
    bootstrap()
  }, 2200)
})
</script>

<style scoped>
.boot-page {
  min-height: 100vh;
  background: radial-gradient(circle at top, #ffffff 0%, #f7f8fb 60%, #eef2f6 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  overflow: hidden;
  opacity: 0;
  transition: opacity 0.42s ease;
}

.boot-page.ready {
  opacity: 1;
}

.boot-page.leaving {
  opacity: 0;
}

.brand-wrap {
  position: relative;
  width: 168px;
  height: 168px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-logo {
  width: 126px;
  height: 126px;
  border-radius: 32px;
  box-shadow: 0 20px 50px rgba(17, 17, 17, 0.14);
  animation: logoFloat 1.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  position: relative;
  z-index: 2;
}

.brand-ring {
  position: absolute;
  inset: 10px;
  border-radius: 42px;
  border: 2px solid rgba(17, 17, 17, 0.08);
  animation: ringPulse 1.9s ease-out infinite;
}

.brand-title {
  font-size: 52rpx;
  font-weight: 800;
  color: #111111;
  letter-spacing: 4rpx;
  animation: textFade 0.95s ease-out 0.28s both;
}

.brand-subtitle {
  font-size: 28rpx;
  color: #77808d;
  animation: textFade 0.95s ease-out 0.42s both;
}

@keyframes logoFloat {
  0% {
    opacity: 0;
    transform: scale(0.78) translateY(26px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes ringPulse {
  0% {
    transform: scale(0.92);
    opacity: 0;
  }
  40% {
    opacity: 1;
  }
  100% {
    transform: scale(1.08);
    opacity: 0;
  }
}

@keyframes textFade {
  0% {
    opacity: 0;
    transform: translateY(12px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
