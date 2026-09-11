import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs";
const dir = new URL("../src/static/", import.meta.url);
fs.mkdirSync(dir, { recursive: true });
const logo = fs
  .readFileSync(
    new URL("../../web/src/components/Logo.vue", import.meta.url),
    "utf8",
  )
  .match(/<svg[\s\S]*?<\/svg>/)[0]
  .replace(':width="size" :height="size"', 'width="192" height="192"')
  .replace("viewBox=", 'xmlns="http://www.w3.org/2000/svg" viewBox=');
fs.writeFileSync(new URL("logo.png", dir), new Resvg(logo).render().asPng());
const paths = {
  today: '<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
  tasks:
    '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="m8 9 1 1 2-2m2 1h3m-8 6 1 1 2-2m2 1h3"/>',
  rewards:
    '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13"/><path d="M12 8C3 8 6 0 10 4l2 4c9 0 6-8 2-4Z"/>',
  stats: '<path d="M4 21V11h4v10m2 0V3h4v18m2 0v-7h4v7"/>',
};
for (const [name, body] of Object.entries(paths))
  for (const active of [false, true]) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="${active ? "#E6462F" : "#80695E"}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
    fs.writeFileSync(
      new URL(`${name}${active ? "-active" : ""}.png`, dir),
      new Resvg(svg).render().asPng(),
    );
  }
