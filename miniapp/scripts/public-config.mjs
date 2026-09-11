export function publicConfig(source) {
  const result = {};
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(
      /^\s*(?:export\s+)?(小程序appid|AppID|appid|APPID|WECHAT_APPID|VITE_API_BASE_URL)\s*[:=：]\s*["']?([^"'\s#]+)["']?\s*(?:#.*)?$/i,
    );
    if (match)
      result[match[1].toUpperCase() === "VITE_API_BASE_URL" ? "api" : "appid"] =
        match[2];
  }
  return result;
}
