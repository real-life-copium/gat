#!/usr/bin/env -S bun run
import { createClient } from "webdav";

const PLATFORMS_PATH = "https://oem-share.canonical.com/share/sutton/Platforms";
const CODE_NAME_KEY = "Code_Name";
const CPU_VENDOR_KEY = "CPU_Vendor";
const ENGINEER_KEY = "Canonical_Eng";
const TAG_KEYS = [
  "Official_Tag",
  "LP_Tag_short",
];

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
  throw new Error("usage: bun run index.js {DEVICE_NAME}");
}

if (!Bun.env.WEBDAV_PASSWORD) {
  throw new Error("environment variable WEBDAV_PASSWORD is not set");
}

const deviceName = process.argv[2];
const [codeName, squashedCodeName, index] = getPlatform(deviceName);

const client = createClient(PLATFORMS_PATH, {
  username: "sutton",
  password: Bun.env.WEBDAV_PASSWORD
});

const bytes = await client.getFileContents("sutton-platform-tracker.json");
/** @type {any[]} */
const platforms = JSON.parse(bytes.toString());

const platform = platforms.find(p => {
  const name = p[CODE_NAME_KEY];
  if (!name) {
    return false;
  }
  const squashedName = name.toLowerCase().replace(/\s/g, "");
  return squashedName === squashedCodeName;
});
if (!platform) {
  throw new Error(`platform ${codeName} not found`);
}

const cpuVendor = platform[CPU_VENDOR_KEY];
if (!cpuVendor) {
  throw new Error(`platform ${codeName} is missing ${CPU_VENDOR_KEY}`);
}

const engineer = platform[ENGINEER_KEY];
if (!engineer) {
  throw new Error(`platform ${codeName} is missing ${ENGINEER_KEY}`);
}

const lpTag = TAG_KEYS.map(key => platform[key]).find(t => t) || codeName.toLowerCase();
const tags = [lpTag, `${lpTag}-${index}`];
switch (cpuVendor.toLowerCase()) {
  case "intel":
    tags.push("ihv-intel");
    break;
  case "amd":
    tags.push("ihv-amd");
    break;
  default:
    throw new Error(`unknown cpu vendor ${cpuVendor}`);
}

const args = [
  "-p", "sutton",
  "-u", deviceName,
  "-t", ...tags,
  "-a", engineer,
];

console.log(args.join(" "));
