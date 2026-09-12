<script setup>
import { computed } from 'vue'
import { householdBalance } from '../../../shared/balance.mjs'
const standImage = '/static/scale-v2/stand.png'
const beamImage = '/static/scale-v2/beam.png'
const leftImage = '/static/scale-v2/left-pan.png'
const rightImage = '/static/scale-v2/right-pan.png'
const props = defineProps({ users: { type: Array, default: () => [] }, period: { type: String, default: 'week' } })
const balance = computed(() => householdBalance(props.users, props.period))
</script>
<template>
  <view class="balance-surface">
    <view class="balance-stage" aria-hidden="true">
      <image class="scale-image scale-stand" :src="standImage" mode="scaleToFill" />
      <view class="scale-moving" :style="{ transform: 'rotate(' + balance.angle + 'deg)' }">
        <image class="scale-image scale-pan scale-left" :src="leftImage" mode="scaleToFill" :style="{ transform: 'rotate(' + -balance.angle + 'deg)' }" />
        <image class="scale-image scale-pan scale-right" :src="rightImage" mode="scaleToFill" :style="{ transform: 'rotate(' + -balance.angle + 'deg)' }" />
        <image class="scale-image scale-beam" :src="beamImage" mode="scaleToFill" />
      </view>
    </view>
    <view class="balance-message">{{ balance.message }}</view>
    <view class="balance-detail">{{ balance.detail }}</view>
    <view class="balance-members">
      <view v-for="member in balance.members" :key="member.id" class="balance-member">
        <view class="balance-name">{{ member.name }}</view>
        <view class="balance-points">{{ member.points }}</view>
        <view class="balance-unit">本期获得糖果</view>
        <view class="balance-completed">已确认 {{ member.completed }} 件家务</view>
      </view>
    </view>
    <view class="balance-note">只记录本期已确认的家务积分 / 兑换心愿不会改变天平</view>
  </view>
</template>
<style scoped src="../../../shared/balance.css"></style>
