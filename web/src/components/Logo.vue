<script setup>
defineProps({ size: { type: Number, default: 84 } })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 96 96" fill="none" aria-hidden="true">
    <rect width="96" height="96" rx="26" fill="#FFF1E4" />
    <path d="M20 47 L48 24 L76 47" stroke="#FF6B5E" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M28 45 V68 a7 7 0 0 0 7 7 h26 a7 7 0 0 0 7-7 V45" stroke="#FF6B5E" stroke-width="8" stroke-linecap="round" />
    <path d="M48 64.5 c-6.6-5-11-8.8-11-13.2 a5.7 5.7 0 0 1 11-2.2 5.7 5.7 0 0 1 11 2.2 c0 4.4-4.4 8.2-11 13.2 z" fill="#0E9F86" />
    <circle cx="69" cy="30" r="4" fill="#F5A623" />
  </svg>
</template>
