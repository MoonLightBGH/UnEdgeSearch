<script>
import { fetchClientStatus, getApiBase, needsReconnect, sendHeartbeat, setConnectionLostHandler, getDisconnectReason } from '@/utils/api'

const MONITOR_INTERVAL = 15000
let monitorTimer = null

function getCurrentRoute() {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  return current ? `/${current.route}` : ''
}

function isGuardPage() {
  const route = getCurrentRoute()
  return route.includes('/pages/boot/boot') || route.includes('/pages/connect/connect')
}

function redirectToConnect(reason = '') {
  if (isGuardPage()) return
  const query = reason ? `?reason=${encodeURIComponent(reason)}` : ''
  uni.reLaunch({
    url: `/pages/connect/connect${query}`
  })
}

export default {
  onLaunch() {
    setConnectionLostHandler((reason) => {
      redirectToConnect(reason)
    })
  },
  onShow() {
    this.startConnectionMonitor()
  },
  onHide() {
    this.stopConnectionMonitor()
  },
  methods: {
    async runConnectionCheck() {
      if (isGuardPage()) return

      const apiBase = getApiBase()

      if (!apiBase) {
        redirectToConnect()
        return
      }

      if (needsReconnect()) {
        redirectToConnect(getDisconnectReason())
        return
      }

      try {
        const status = await fetchClientStatus()

        if (!status.connected) {
          redirectToConnect('服务器已断开当前设备')
          return
        }

        await sendHeartbeat()
      } catch (error) {
        if (/断开|device/i.test(String(error?.message || ''))) {
          redirectToConnect(error.message)
        }
      }
    },
    startConnectionMonitor() {
      this.stopConnectionMonitor()
      this.runConnectionCheck()
      monitorTimer = setInterval(() => {
        this.runConnectionCheck()
      }, MONITOR_INTERVAL)
    },
    stopConnectionMonitor() {
      if (monitorTimer) {
        clearInterval(monitorTimer)
        monitorTimer = null
      }
    }
  }
}
</script>

<style>
/* 每个页面公共css */
</style>
