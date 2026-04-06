<template>
  <view class="tabbar">
    <view
      v-for="item in tabs"
      :key="item.key"
      class="tab-item"
      :class="{ active: current === item.key }"
      @click="go(item.key)"
    >
      <image
        class="icon"
        :src="current === item.key ? item.activeIcon : item.icon"
      />
      <text class="text">{{ item.text }}</text>
    </view>
  </view>
</template>

<script setup>
const props = defineProps({
  current: String
})

const emit = defineEmits(['change'])

const tabs = [
  {
    key: 'news',
    text: '新闻',
    icon: '/static/tabbar/news.png',
    activeIcon: '/static/tabbar/news_active.png'
  },
  {
    key: 'search',
    text: '无极搜',
    icon: '/static/tabbar/search.png',
    activeIcon: '/static/tabbar/search_active.png'
  },
  {
    key: 'video',
    text: '视频',
    icon: '/static/tabbar/video.png',
    activeIcon: '/static/tabbar/video_active.png'
  }
]

function go(key) {
  emit('change', key)
}
</script>

<style>
.tabbar {
  position: fixed;
  bottom: 20px;
  left: 5%;
  width: 90%;
  height: 70px;
  z-index: 999;
  
  transform: none !important;
  
  backface-visibility: hidden;
  background: #fff;
  border-radius: 40px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  box-shadow: 0 5px 20px rgba(0,0,0,0.1);
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}



.icon {
  width: 26px;
  height: 26px;
  margin-bottom: 4px;
}

.text {
  font-size: 10px;
}

.active {
  background: black;
  color: white;
  transform: scale(1.2);
}
</style>