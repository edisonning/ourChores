export const DOW = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
export function recurrence(t) {
  if (!t.recurrence) return t.due_date ? "截止 " + t.due_date : "单次";
  if (t.recurrence === "daily") return "每天";
  return t.recurrence
    .split(":")[1]
    .split(",")
    .map((n) => DOW[n - 1])
    .join("·");
}
export function assignee(t, s) {
  return !t.assignee_id
    ? "都行"
    : t.assignee_id === s.user?.id
      ? "我做"
      : (s.users.find((u) => u.id === t.assignee_id)?.name || "对方") + "做";
}
