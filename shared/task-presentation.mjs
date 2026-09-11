export const statusLabels = {
  todo: "待完成",
  pending: "待确认",
  confirmed: "已完成",
  rejected: "待重做",
  not_scheduled: "今日无需执行",
  missed: "未完成",
};
export const roleClass = (task) =>
  task.assignee_id ? `owner-${task.assignee_id}` : "owner-shared";
export const ownerLabel = (task) =>
  task.assignee_name ||
  { 1: "老公", 2: "老婆" }[task.assignee_id] ||
  "谁都可以做";
export const stateLabel = (task) => statusLabels[task.status] || "待完成";
export const actorLine = (task, userId) => {
  const c = task.completion;
  if (!c) return "";
  const actor = c.user_name || { 1: "老公", 2: "老婆" }[c.user_id] || "成员";
  if (task.status === "pending")
    return `${actor}已打卡 · ${c.user_id === userId ? "等对方确认" : "待我确认"}`;
  if (task.status === "rejected") return `${actor}的打卡被打回，请重新完成`;
  return `实际完成：${actor}`;
};
export const completionDate = (task) =>
  task.completion?.confirmed_at
    ? `完成日期：${task.completion.confirmed_at.slice(0, 10)}`
    : task.completion
      ? `打卡日期：${task.completion.date_key}`
      : "";
export function ownerGroups(tasks, users, userId) {
  const sorted = [...users].sort((a, b) =>
    a.id === userId ? -1 : b.id === userId ? 1 : a.id - b.id,
  );
  return [
    ...sorted.map((u) => ({
      id: u.id,
      name: u.name + "的任务",
      tasks: tasks.filter((t) => t.assignee_id === u.id),
    })),
    { id: 0, name: "谁都可以做", tasks: tasks.filter((t) => !t.assignee_id) },
  ];
}
