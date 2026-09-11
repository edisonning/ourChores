import { ref, onMounted, onUnmounted } from "vue";
import { api } from "./api.js";
import { useSession } from "./stores/session.js";
export function useTaskPage(path) {
  const data = ref(null),
    error = ref(""),
    loading = ref(false),
    busy = ref(false),
    s = useSession();
  let alive = true,
    seq = 0,
    timer;
  async function refresh() {
    const id = ++seq;
    loading.value = true;
    error.value = "";
    try {
      const [result, today] = await Promise.all([
        api(path),
        path === "/today" ? Promise.resolve(null) : api("/today"),
      ]);
      if (!alive || id !== seq) return;
      data.value = result;
      const summary = today || result;
      s.points = Object.fromEntries(summary.users.map((u) => [u.id, u.points]));
      s.pendingCount = summary.pending_confirm.length;
    } catch (e) {
      if (alive && id === seq) error.value = e.message;
    } finally {
      if (alive && id === seq) loading.value = false;
    }
  }
  async function act(fn, success = () => {}) {
    if (busy.value) return;
    busy.value = true;
    error.value = "";
    try {
      await fn();
      if (!alive) return;
      success();
      await refresh();
    } catch (e) {
      if (alive) error.value = e.message;
    } finally {
      busy.value = false;
    }
  }
  function visible() {
    clearInterval(timer);
    if (document.hidden) return;
    refresh();
    timer = setInterval(() => {
      if (!busy.value && !loading.value) refresh();
    }, 30000);
  }
  onMounted(() => {
    visible();
    document.addEventListener("visibilitychange", visible);
  });
  onUnmounted(() => {
    alive = false;
    clearInterval(timer);
    document.removeEventListener("visibilitychange", visible);
  });
  return { data, error, loading, busy, refresh, act };
}
