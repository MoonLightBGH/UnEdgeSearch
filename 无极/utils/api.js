const API_BASE_KEY = 'apiBaseUrl'
const DEVICE_ID_KEY = 'deviceId'
const DEVICE_NAME_KEY = 'deviceName'
const RECONNECT_REQUIRED_KEY = 'reconnectRequired'
const DISCONNECT_REASON_KEY = 'disconnectReason'

let connectionLostHandler = null

function normalizeApiBase(base) {
  const trimmed = String(base || '').trim().replace(/\/+$/, '')

  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `http://${trimmed}`
}

function buildDeviceName() {
  try {
    const info = uni.getSystemInfoSync()
    const parts = [info.brand, info.model].filter(Boolean)
    return parts.length ? `无极-${parts.join('-')}` : '无极设备'
  } catch (error) {
    return '无极设备'
  }
}

function createDeviceId() {
  return `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function ensureDeviceId() {
  let deviceId = uni.getStorageSync(DEVICE_ID_KEY)

  if (!deviceId) {
    deviceId = createDeviceId()
    uni.setStorageSync(DEVICE_ID_KEY, deviceId)
  }

  return deviceId
}

function ensureDeviceName() {
  let deviceName = uni.getStorageSync(DEVICE_NAME_KEY)

  if (!deviceName) {
    deviceName = buildDeviceName()
    uni.setStorageSync(DEVICE_NAME_KEY, deviceName)
  }

  return deviceName
}

function notifyConnectionLost(reason = '服务器已断开当前设备') {
  uni.setStorageSync(RECONNECT_REQUIRED_KEY, '1')
  uni.setStorageSync(DISCONNECT_REASON_KEY, reason)

  if (typeof connectionLostHandler === 'function') {
    connectionLostHandler(reason)
  }
}

export function setConnectionLostHandler(handler) {
  connectionLostHandler = handler
}

export function needsReconnect() {
  return uni.getStorageSync(RECONNECT_REQUIRED_KEY) === '1'
}

export function getDisconnectReason() {
  return uni.getStorageSync(DISCONNECT_REASON_KEY) || ''
}

export function clearReconnectFlag() {
  uni.removeStorageSync(RECONNECT_REQUIRED_KEY)
  uni.removeStorageSync(DISCONNECT_REASON_KEY)
}

export function getApiBase() {
  return normalizeApiBase(uni.getStorageSync(API_BASE_KEY))
}

export function setApiBase(base) {
  const normalized = normalizeApiBase(base)

  if (normalized) {
    uni.setStorageSync(API_BASE_KEY, normalized)
  }

  return normalized
}

export function clearApiBase() {
  uni.removeStorageSync(API_BASE_KEY)
}

export function getSavedDeviceId() {
  return ensureDeviceId()
}

export function getSavedDeviceName() {
  return ensureDeviceName()
}

function rawRequest(base, options) {
  const normalizedBase = normalizeApiBase(base)

  return new Promise((resolve, reject) => {
    uni.request({
      ...options,
      url: `${normalizedBase}${options.url}`,
      success: (response) => {
        const { statusCode, data } = response

        if (statusCode >= 200 && statusCode < 300) {
          resolve(data)
          return
        }

        if (data?.code === 'DEVICE_DISCONNECTED' || data?.code === 'DEVICE_NOT_FOUND') {
          notifyConnectionLost(data?.error || '服务器已断开当前设备')
        }

        reject(new Error(data?.error || '请求失败'))
      },
      fail: (error) => {
        reject(error)
      }
    })
  })
}

export function request(options) {
  const base = getApiBase()

  if (!base) {
    return Promise.reject(new Error('请先配置服务器地址'))
  }

  return rawRequest(base, options)
}

export async function handshakeServer(base) {
  const normalizedBase = normalizeApiBase(base)

  if (!normalizedBase) {
    throw new Error('请输入服务器地址')
  }

  const result = await rawRequest(normalizedBase, {
    url: '/api/client/handshake',
    method: 'POST',
    data: {
      deviceId: ensureDeviceId(),
      deviceName: ensureDeviceName(),
      serverUrl: normalizedBase
    }
  })

  setApiBase(normalizedBase)
  clearReconnectFlag()
  return result
}

export function fetchClientStatus() {
  return request({
    url: `/api/client/status?deviceId=${encodeURIComponent(ensureDeviceId())}`,
    method: 'GET'
  })
}

export function sendHeartbeat() {
  return request({
    url: '/api/client/heartbeat',
    method: 'POST',
    data: {
      deviceId: ensureDeviceId()
    }
  })
}

export function fetchConfig() {
  return request({
    url: '/api/config',
    method: 'GET'
  })
}

export function fetchNews(type) {
  const query = type ? `?type=${encodeURIComponent(type)}` : ''
  return request({
    url: `/api/news${query}`,
    method: 'GET'
  })
}

export function fetchNewsDetail(id) {
  return request({
    url: `/api/news/${encodeURIComponent(id)}`,
    method: 'GET'
  })
}

export function syncNews() {
  return request({
    url: '/api/news/sync',
    method: 'POST'
  })
}

export function fetchVideos(type) {
  const query = type ? `?type=${encodeURIComponent(type)}` : ''
  return request({
    url: `/api/videos${query}`,
    method: 'GET'
  })
}

export function fetchVideoDetail(id) {
  return request({
    url: `/api/videos/${encodeURIComponent(id)}`,
    method: 'GET'
  })
}

export function fetchNovels() {
  return request({
    url: '/api/novels',
    method: 'GET'
  })
}

export function fetchNovelDetail(id) {
  return request({
    url: `/api/novels/${encodeURIComponent(id)}`,
    method: 'GET'
  })
}

export function searchAll(keyword) {
  return request({
    url: `/api/search?q=${encodeURIComponent(keyword)}`,
    method: 'GET'
  })
}

export function fetchSearchHistory() {
  return request({
    url: '/api/search/history',
    method: 'GET'
  })
}

export function createSearchHistory(payload) {
  return request({
    url: '/api/search/history',
    method: 'POST',
    data: payload
  })
}

export function deleteSearchHistory(id) {
  return request({
    url: `/api/search/history/${encodeURIComponent(id)}`,
    method: 'DELETE'
  })
}
