#!/usr/bin/env bun
import { createClient } from "webdav";
import ed from "edit-distance";

const PLATFORMS_PATH = "https://oem-share.canonical.com/share/sutton/Platforms";
const CODE_NAME_KEY = "Code_Name";
const PLATFORM_KEY = "Canonical_Platform_Code_name";
const STATUS_KEY = "Status";
const ENGINEER_KEY = "Canonical_Eng";
const TAG_KEYS = [
  "Official_Tag",
  "LP_Tag_short",
];
const STRATEGIES = new Set(["default", "ignore-status"]);

/**
 * @param {string} deviceName
 * @returns {[string, string, number]}
**/
function getPlatform(deviceName) {
  const parts = deviceName.split("-");
  const last = Number(parts.pop());
  if (Number.isNaN(last)) {
    throw new Error(`device name ${deviceName} is not valid`);
  }
  const name = parts.join("-");
  const squashedName = parts.join("").toLowerCase();
  return [name, squashedName, last];
}

if (process.argv.length < 3) {
  throw new Error(
    "usage: bun run index.js {DEVICE_NAME} [STRATEGY]\n" +
    "  DEVICE_NAME:     the name of the device\n" +
    "  STRATEGY:        (optional) the strategy to use\n" +
    "  * default:       use the default strategy\n" +
    "    ignore-status: ignore the status of the platform"
  );
}

if (!Bun.env.WEBDAV_PASSWORD) {
  throw new Error("environment variable WEBDAV_PASSWORD is not set");
}

const deviceName = process.argv[2];
const [codeName, squashedCodeName, index] = getPlatform(deviceName);

const strategy = STRATEGIES.has(process.argv[3]) ? process.argv[3] : "default";

const client = createClient(PLATFORMS_PATH, {
  username: "sutton",
  password: Bun.env.WEBDAV_PASSWORD
});

const bytes = await client.getFileContents("sutton-platform-tracker.json");
/** @type {any[]} */
const platforms = JSON.parse(bytes.toString());

let platform;
let minDistance = Infinity;

const change = _ => 1;
const update = (a, b) => a !== b;

for (const p of platforms) {
  const name = p[CODE_NAME_KEY];
  if (!name) {
    continue;
  }
  if (strategy !== "ignore-status") {
    if (!["In-Flight", "Pipeline"].includes(p[STATUS_KEY])) {
      continue;
    }
  }
  const squashedName = name.toLowerCase().replace(/\s|\.0/g, "");
  const lev = ed.levenshtein(squashedCodeName, squashedName, change, change, update);
  if (lev.distance < minDistance) {
    minDistance = lev.distance;
    platform = p;
  }
}

if (!platform) {
  throw new Error(`platform ${codeName} not found`);
}

const engineer = platform[ENGINEER_KEY];
if (!engineer) {
  throw new Error(`platform ${codeName} is missing ${ENGINEER_KEY}`);
}

const lpTag = TAG_KEYS.map(key => platform[key]).find(t => t) || codeName;
const tags = [lpTag, `${lpTag}-${index}`];
if (platform[PLATFORM_KEY]) {
  tags.unshift(platform[PLATFORM_KEY]);
}

const args = [
  "-p", "sutton",
  "-u", deviceName,
  "-t", ...tags.map(t => t.toLowerCase()),
  "-a", engineer,
];

console.log(args.join(" "));
