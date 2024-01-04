#!/usr/bin/env -S bun run
import { createClient } from "webdav";

const PLATFORMS_PATH = "https://oem-share.canonical.com/share/sutton/Platforms";
const CODE_NAME_KEY = "Code_Name";
const PLATFORM_KEY = "Canonical_Platform_Code_name";
const ENGINEER_KEY = "Canonical_Eng";
const TAG_KEYS = [
  "Official_Tag",
  "LP_Tag_short",
];

const PRODUCT_FAMILY_KEY = "BU";
const BIOS_PREFIX_KEY = "BIOS_first_3_bytes";

const PRODUCT_FAMILY = (Bun.env.PRODUCT_FAMILY || "").toLowerCase();
const BIOS_VERSION = (Bun.env.BIOS_VERSION || "").toLowerCase();

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
  if (squashedName === squashedCodeName) {
    return true;
  }
  if (BIOS_VERSION && PRODUCT_FAMILY) {
    const family = p[PRODUCT_FAMILY_KEY].toLowerCase();
    const biosPrefix = p[BIOS_PREFIX_KEY].toLowerCase();
    return family === PRODUCT_FAMILY && BIOS_VERSION.startsWith(biosPrefix);
  }
  return false;
});
if (!platform) {
  throw new Error(`platform ${codeName} not found`);
}

const engineer = platform[ENGINEER_KEY];
if (!engineer) {
  throw new Error(`platform ${codeName} is missing ${ENGINEER_KEY}`);
}

const lpTag = TAG_KEYS.map(key => platform[key]).find(t => t) || codeName.toLowerCase();
const tags = [lpTag, `${lpTag}-${index}`];
if (platform[PLATFORM_KEY]) {
  tags.unshift(platform[PLATFORM_KEY]);
}

const args = [
  "-p", "sutton",
  "-u", deviceName,
  "-t", ...tags,
  "-a", engineer,
];

console.log(args.join(" "));
