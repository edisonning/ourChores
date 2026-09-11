<script setup>
import { memberAvatar } from "../../../shared/member-avatar.mjs";
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Delete, ArrowLeft } from 'lucide-vue-next'
import { api } from '../api.js'
import { useSession } from '../stores/session.js'
import Logo from '../components/Logo.vue'

const s = useSession()
const router = useRouter()
const users = ref([])
const picking = ref(null)
const pin = ref('')
const error = ref('')

onMounted(async () => {
  users.value = await api('/users')
  s.users = users.value
})

function press(d) {
  if (pin.value.length < 4) pin.value += d
}

watch(pin, async (v) => {
  if (v.length !== 4 || !picking.value) return
  error.value = ''
  try {
    await s.login(picking.value, v)
    router.replace('/')
  } catch (e) {
    error.value = e.message
    setTimeout(() => (pin.value = ''), 180)
  }
})

function back() {
  picking.value = null
  pin.value = ''
  error.value = ''
}
</script>

<template>
  <div class="login">
    <div class="login-logo fade-up">
      <Logo />
      <h1>甜甜家务</h1>
      <p>一起把日子过甜</p>
    </div>

    <div v-if="!picking" class="login-users fade-up">
      <button v-for="u in users" :key="u.id" class="login-user card" @click="picking = u.id">
        <span class="avatar big" :class="'u' + u.id">{{ memberAvatar(u.id, u.name) }}</span>
        <b>{{ u.name }}</b>
      </button>
    </div>

    <div v-else class="pinpad card fade-up">
      <button class="icon-btn back" @click="back"><ArrowLeft :size="20" /></button>
      <p class="pin-name">{{ users.find(u => u.id === picking)?.name }}，请输入 PIN</p>
      <div class="pin-dots">
        <i v-for="i in 4" :key="i" :class="{ on: pin.length >= i }" />
      </div>
      <p class="err">{{ error }}</p>
      <div class="pad">
        <button v-for="n in 9" :key="n" @click="press(String(n))">{{ n }}</button>
        <span />
        <button @click="press('0')">0</button>
        <button @click="pin = pin.slice(0, -1)"><Delete :size="22" /></button>
      </div>
    </div>

    <p class="login-hint">请使用你设置的四位 PIN 登录</p>
  </div>
</template>
