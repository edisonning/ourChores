let generation = 0;
export const sessionVersion = () => generation;
export function clearSession() {
  generation++;
  uni.removeStorageSync("session");
  uni.$emit("session-reset");
  uni.removeTabBarBadge({ index: 0, fail() {} });
}
export function saveSession(session) {
  clearSession();
  uni.setStorageSync("session", session);
}
export function readSession() {
  try {
    return uni.getStorageSync("session") || null;
  } catch {
    return null;
  }
}
export function api(path, { method = "GET", body } = {}) {
  const version = generation;
  const token = readSession()?.token;
  return new Promise((resolve, reject) => {
    const stale = () => Object.assign(new Error("身份已切换"), { stale: true });
    uni.request({
      url: import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "") + path,
      method,
      data: body,
      timeout: 12000,
      header: {
        "content-type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      success(res) {
        if (version !== generation) return reject(stale());
        if (res.statusCode === 401 && path !== "/login") {
          clearSession();
          uni.reLaunch({ url: "/pages/login/index" });
          return reject(stale());
        }
        if (res.statusCode < 200 || res.statusCode >= 300)
          return reject(
            new Error(res.data?.error || `请求失败（${res.statusCode}）`),
          );
        resolve(res.statusCode === 204 ? null : res.data);
      },
      fail(failure) {
        if (version !== generation) return reject(stale());
        const detail = failure?.errMsg || "";
        // Keep credentials and request bodies out of diagnostic logs.
        console.warn("[API connection]", method, path, detail);
        const message = /url not in domain list|合法域名/i.test(detail)
          ? "微信拦截了接口地址，请在开发调试中开启不校验合法域名后重试"
          : /timeout/i.test(detail)
            ? "连接超时，请确认手机与电脑在同一 Wi-Fi，且后端已启动"
            : "连接失败，请确认手机与电脑在同一 Wi-Fi，且后端已启动";
        reject(new Error(message + (method === "GET" ? "" : "；若刚提交过，请先刷新确认结果")));

      },
    });
  });
}
export const confirmAction = (content) => {
  const version = generation;
  return new Promise((resolve) =>
    uni.showModal({
      title: "请确认",
      content,
      success: (r) => resolve(r.confirm && version === generation),
      fail: () => resolve(false),
    }),
  );
};
