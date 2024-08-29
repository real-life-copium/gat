import { createClient } from "webdav";
import logger from "./logger";

/**
 * Fetches the platforms JSON from the OEM Share.
 * @param {string} username - The username of the OEM.
 * @returns {Promise<Platform[]>} - The platforms.
**/
async function fetch(username) {
  const password = Bun.env.WEBDAV_PASSWORD;
  if (!password) {
    throw new Error("env WEBDAV_PASSWORD is not set");
  }

  const platforms_path = `https://oem-share.canonical.com/share/${username}/Platforms`;
  const client = createClient(platforms_path, { username, password });
  const bytes = await client.getFileContents("platform-tracker.json");
  const platforms = JSON.parse(bytes.toString());
  return platforms.map(p => new Platform(p));
}

/** A wrapper around the platform JSON. */
export class Platform {
  #inner;
  /**
   * Override the code name of the platform.
   * @type {string}
  **/
  #codeName;

  constructor(inner) {
    this.#inner = inner;
    this.#codeName = null;
  }

  get name() {
    const KEY = "Platform";
    return this.#inner[KEY];
  }

  get altName() {
    const KEY = "Code_Name";
    return this.#inner[KEY];
  }

  get altNames() {
    return [this.name, this.altName];
  }

  set codeName(value) {
    this.#codeName = value;
  }

  get codeName() {
    const KEY = "Canonical_Platform_Code_name";
    return this.#codeName || this.#inner[KEY];
  }

  get status() {
    const KEY = "Status";
    return this.#inner[KEY];
  }

  get isActive() {
    const VALUES = ["In-Flight", "Pipeline"];
    return VALUES.includes(this.status);
  }

  get tag() {
    const KEYS = [
      "Official_Tag",
      "LP_tag_short",
    ];
    for (const key of KEYS) {
      const value = this.#inner[key];
      if (value) {
        logger.info(`key: ${key} value: ${value}`);
        return value;
      }
    }
    return this.codeName;
  }

  get engineer() {
    const KEY = "Canonical_Eng";
    return this.#inner[KEY];
  }
}

export default fetch;
