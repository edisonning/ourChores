<script setup>
import { memberAvatar } from "../../../../shared/member-avatar.mjs";
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { api, readSession, saveSession } from "../../api.js";
import PageStatus from "../../components/PageStatus.vue";
const users = ref([]),
  selected = ref(null),
  pin = ref(""),
  loading = ref(false),
  busy = ref(false),
  error = ref("");
async function load() {
  loading.value = true;
  error.value = "";
  try {
    users.value = await api("/users");
  } catch (e) {
    if (!e.stale) error.value = e.message;
  } finally {
    loading.value = false;
  }
}
onShow(() => {
  pin.value = "";
  if (readSession()?.token) {
    uni.switchTab({ url: "/pages/today/index" });
    return;
  }
  load();
});
function choose(u) {
  selected.value = u;
  pin.value = "";
  error.value = "";
}
async function login() {
  if (busy.value) return;
  if (!selected.value || !/^\d{4}$/.test(pin.value)) {
    error.value = "请选择成员并输入四位数字 PIN";
    return;
  }
  busy.value = true;
  error.value = "";
  try {
    saveSession(
      await api("/login", {
        method: "POST",
        body: { id: selected.value.id, pin: pin.value },
      }),
    );
    pin.value = "";
    uni.switchTab({ url: "/pages/today/index" });
  } catch (e) {
    if (!e.stale) error.value = e.message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <view class="page login"
    ><image src="/static/logo.png" class="logo" /><view class="heading"
      >甜甜家务</view
    ><view class="sub">一起打理小家，让日子甜一点</view
    ><view class="members"
      ><button
        v-for="memberItem in users"
        :key="memberItem.id"
        class="member"
        :class="{ selected: selected?.id === memberItem.id }"
        :disabled="busy"
        @click="choose(memberItem)"
      >
        <text class="avatar" :class="'u' + memberItem.id">{{
          memberAvatar(memberItem.id, memberItem.name)
        }}</text
        >{{ memberItem.name }}
      </button></view
    ><view v-if="selected" class="card"
      ><view class="label">{{ selected.name }}，输入四位 PIN</view
      ><input
        v-model="pin"
        class="input pin"
        type="number"
        password
        maxlength="4"
        :disabled="busy"
        confirm-type="go"
        @confirm="login"
      /><button
        class="btn"
        style="margin-top: 18px"
        :disabled="busy || pin.length !== 4"
        :loading="busy"
        @click="login"
      >
        进入小家
      </button></view
    ><PageStatus :loading="loading" :error="error" @retry="load" /><view
      class="muted"
      >登录后会记住身份，可随时切换</view
    ></view
  >
</template>
