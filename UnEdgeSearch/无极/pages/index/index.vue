<template>
  <view class="container">

    <view class="content">
      <view class="page" :class="{ active: tab==='news' }">
        <News :active="tab==='news'" />
      </view>
    
      <view class="page" :class="{ active: tab==='search' }">
        <Search />
      </view>
    
      <view class="page" :class="{ active: tab==='video' }">
        <Video :active="tab==='video'" />
      </view>
    </view>

    <FloatTabBar :current="tab" @change="tab = $event" />

  </view>
</template>

<script setup>
import { ref, watch } from 'vue'

import FloatTabBar from '@/components/FloatTabBar.vue'
import News from '@/components/News.vue'
import Search from '@/components/Search.vue'
import Video from '@/components/Video.vue'

const tab = ref('search')

const order = ['news', 'search', 'video']
let oldIndex = order.indexOf(tab.value)

const transitionName = ref('slide-left')

watch(tab, (newVal) => {
  const newIndex = order.indexOf(newVal)

  transitionName.value =
    newIndex > oldIndex ? 'slide-left' : 'slide-right'

  oldIndex = newIndex
})
</script>

<style>
.container {
  height: 100vh;
  overflow: hidden;
  background: #fff;
}

.content {
  overflow: hidden;
  height: 100%;
  position: relative;
}

.page {
  position: absolute;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;

  opacity: 0;
  pointer-events: none;

  transition: opacity 0.2s ease;
}

.page.active {
  opacity: 1;
  pointer-events: auto;
}

</style>
