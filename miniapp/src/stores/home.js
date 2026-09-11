import { defineStore } from "pinia";
import { api, readSession, clearSession, sessionVersion } from "../api.js";
let refreshSequence = 0;
const pageSequences = new Map();
let todaySequence = 0;
export const useHome = defineStore("home", {
  state: () => ({
    user: readSession()?.user || null,
    today: null,
    tasks: null,
    rewards: null,
    stats: null,
  }),
  getters: {
    users: (s) => s.today?.users || [],
    partner: (s) => s.today?.users.find((u) => u.id !== s.user?.id),
  },
  actions: {
    reset() {
      this.$reset();
      this.user = null;
    },
    logout() {
      clearSession();
      this.reset();
      uni.reLaunch({ url: "/pages/login/index" });
    },
    async refresh(page, period = "week") {
      const version = sessionVersion();
      const sequence = ++refreshSequence;
      pageSequences.set(page, sequence);
      const paths = {
        tasks: "/tasks",
        rewards: "/rewards",
        stats: `/stats?period=${period}`,
      };
      const [today, data] = await Promise.all([
        api("/today"),
        page === "today" ? Promise.resolve(null) : api(paths[page]),
      ]);
      if (version !== sessionVersion()) return;
      if (data && pageSequences.get(page) === sequence) this[page] = data;
      if (sequence < todaySequence) return;
      todaySequence = sequence;
      this.today = today;
      const count = today.pending_confirm.length;
      if (count)
        uni.setTabBarBadge({ index: 0, text: String(count), fail() {} });
      else uni.removeTabBarBadge({ index: 0, fail() {} });
    },
  },
});
