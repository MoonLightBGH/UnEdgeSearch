<template>
  <view class="connect-page" :class="{ leaving }">
    <view class="hero">
      <view class="logo-shell">
        <image class="logo" src="/static/icons/UnEdge.png" mode="aspectFit" />
      </view>
      <text class="title">无极</text>
      <text class="subtitle">请输入服务器地址，连接你的无极后端</text>
    </view>

    <view class="panel">
      <view v-if="tipText" class="tip">{{ tipText }}</view>
      <input
        v-model="serverUrl"
        class="server-input"
        placeholder="例如：http://0.0.0.0:7890"
        placeholder-class="placeholder"
        :disabled="loading"
      />
      <button class="connect-btn" :disabled="loading" @click="handleConnect">
        {{ loading ? '连接中...' : '连接服务器' }}
      </button>
      <text class="helper">连接成功后会自动保存，下次启动默认使用这个地址。</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { clearReconnectFlag, getApiBase, handshakeServer } from '@/utils/api'

const serverUrl = ref(getApiBase())
const loading = ref(false)
const tipText = ref('')
const leaving = ref(false)

function smoothEnterHome() {
  leaving.value = true
  setTimeout(() => {
    uni.reLaunch({
      url: '/pages/index/index'
    })
  }, 260)
}

onLoad((options) => {
  if (options?.reason) {
    tipText.value = decodeURIComponent(options.reason)
  }
})

async function handleConnect() {
  if (!serverUrl.value.trim()) {
    tipText.value = '请先输入服务器地址'
    return
  }

  loading.value = true
  tipText.value = '正在检查后端握手，请稍等...'

  try {
    await handshakeServer(serverUrl.value)
    clearReconnectFlag()
    smoothEnterHome()
  } catch (error) {
    tipText.value = error?.message || '连接失败，请重新输入服务器地址'
  } finally {
    if (!leaving.value) {
      loading.value = false
    }
  }
}
</script>

<style scoped>
.connect-page {
  height: 100vh;
  overflow: hidden;
  box-sizing: border-box;
  background: linear-gradient(180deg, #f8fafc 0%, #f2f4f7 100%);
  padding: 104rpx 44rpx 56rpx;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 44rpx;
  opacity: 1;
  transition: opacity 0.26s ease;
}

.connect-page.leaving {
  opacity: 0;
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.logo-shell {
  width: 154rpx;
  height: 154rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 24rpx 60rpx rgba(17, 17, 17, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.logo {
  width: 112rpx;
  height: 112rpx;
  transform: translateY(6rpx);
}

.title {
  font-size: 56rpx;
  font-weight: 800;
  color: #111111;
  letter-spacing: 6rpx;
}

.subtitle {
  font-size: 28rpx;
  color: #7b8592;
  text-align: center;
  line-height: 1.8;
}

.panel {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 32rpx;
  padding: 36rpx 28rpx;
  box-shadow: 0 20rpx 54rpx rgba(17, 17, 17, 0.08);
  border: 1px solid rgba(17, 17, 17, 0.05);
  flex-shrink: 0;
}

.tip {
  margin-bottom: 20rpx;
  padding: 20rpx 22rpx;
  background: #f4f6f8;
  color: #2a3440;
  font-size: 28rpx;
  line-height: 1.8;
  border-radius: 22rpx;
}

.server-input {
  width: 100%;
  min-height: 104rpx;
  border-radius: 999rpx;
  background: #ffffff;
  border: 1px solid #e6ebf0;
  padding: 0 34rpx;
  font-size: 32rpx;
  color: #111111;
  box-sizing: border-box;
}

.placeholder {
  color: #a2acb8;
}

.connect-btn {
  margin-top: 22rpx;
  height: 96rpx;
  line-height: 96rpx;
  border-radius: 999rpx;
  background: #111111;
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 700;
}

.helper {
  display: block;
  margin-top: 18rpx;
  color: #8a94a0;
  font-size: 24rpx;
  line-height: 1.8;
}
</style>
