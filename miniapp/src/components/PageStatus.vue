<script setup>
defineProps({ loading: Boolean, error: String });
defineEmits(["retry"]);
</script>
<template>
  <view v-if="error" class="notice"
    ><text>{{ error }}</text
    ><button class="btn line" :disabled="loading" @click="$emit('retry')">
      刷新重试
    </button></view
  ><view v-else-if="loading" class="muted status">正在刷新…</view>
</template>
