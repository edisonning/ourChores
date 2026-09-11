<script setup>
import { memberAvatar } from "../../../shared/member-avatar.mjs";
import { useHome } from "../stores/home.js";
import { confirmAction } from "../api.js";
const s = useHome();
async function change() {
  if (await confirmAction("切换身份后，需要重新输入 PIN。")) s.logout();
}
</script>
<template>
  <view class="identity"
    ><view class="grow"
      ><text class="avatar" :class="'u' + s.user?.id">{{
        memberAvatar(s.user?.id, s.user?.name)
      }}</text
      ><text>{{ s.user?.name }}</text></view
    ><button class="btn line" @click="change">切换身份</button></view
  ><view v-if="s.today" class="balances"
    ><text
      v-for="memberItem in s.users"
      :key="memberItem.id"
      :class="'role' + memberItem.id"
      >{{ memberItem.name }} · {{ memberItem.points }} 颗糖果</text
    ></view
  >
</template>
