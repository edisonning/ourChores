import { ref, onUnmounted } from "vue";
import { onShow, onHide, onPullDownRefresh } from "@dcloudio/uni-app";
import { useHome } from "./stores/home.js";
import { readSession, sessionVersion } from "./api.js";
export function usePage(page, period = ref("week"), resetForm = () => {}) {
  const s = useHome(),
    loading = ref(false),
    busy = ref(false),
    error = ref("");
  let timer,
    visible = false,
    revision = 0;
  const reset = () => {
    revision++;
    s.reset();
    resetForm();
    error.value = "";
    busy.value = false;
    loading.value = false;
    clearInterval(timer);
  };
  uni.$on("session-reset", reset);
  async function load() {
    if (!readSession()) return;
    const id = ++revision;
    loading.value = true;
    error.value = "";
    try {
      await s.refresh(page, period.value);
    } catch (e) {
      if (!e.stale && id === revision) error.value = e.message;
    } finally {
      if (id === revision) loading.value = false;
      uni.stopPullDownRefresh();
    }
  }
  async function act(fn, success = () => {}) {
    if (busy.value) return;
    busy.value = true;
    error.value = "";
    const version = sessionVersion();
    try {
      await fn();
      if (version !== sessionVersion()) return;
      success();
      await load();
    } catch (e) {
      if (!e.stale && version === sessionVersion()) error.value = e.message;
    } finally {
      if (version === sessionVersion()) busy.value = false;
    }
  }
  onShow(() => {
    visible = true;
    if (!readSession()?.token) {
      uni.reLaunch({ url: "/pages/login/index" });
      return;
    }
    s.user = readSession().user;
    load();
    clearInterval(timer);
    if (page === "today")
      timer = setInterval(() => {
        if (visible && !loading.value && !busy.value) load();
      }, 30000);
  });
  onHide(() => {
    visible = false;
    clearInterval(timer);
  });
  onPullDownRefresh(load);
  onUnmounted(() => {
    clearInterval(timer);
    uni.$off("session-reset", reset);
  });
  return { s, loading, busy, error, load, act };
}
