import { Platform } from "./platform";
import { levenshtein } from "edit-distance";
import logger from "./logger";

/**
 * Squash a device name.
 * @param {string} name - The device name.
 * @returns {string} - The squashed device name.
 **/
function squash(name) {
  return name.toLowerCase().replace(/-|\s|\.0/g, "");
}

const change = _ => 1;
const update = (a, b) => a !== b;

function distinct(array) {
  return [...new Set(array)];
}

export default class Device {
  /** @type {string} */
  #name;
  /** @type {string} */
  #squashedName;
  /** @type {number} */
  #index;
  /** @type {Platform} */
  #platform;

  /** @type {boolean} */
  forceSet;

  /**
   * Create a new device.
   * @param {string} name - The device name.
   * @throws {Error} - If the device name is not valid.
   * @returns {Device} - The device.
   **/
  constructor(name) {
    const parts = name.split("-");
    const last = Number(parts.pop());
    if (Number.isNaN(last)) {
      throw new Error(`device name ${name} is not valid`);
    }
    this.#name = parts.join("-");
    this.#squashedName = squash(this.#name);
    this.#index = last;
    this.#platform = null;
    this.forceSet = false;
  }

  /**
   * Get the edit distance between this device and a platform.
   * This is used to determine the closest platform to this device.
   * @param {Platform} platform
   * @returns {number}
  **/
  distance(platform) {
    const mine = this.#squashedName;
    const theirs = platform.altNames.map(squash);
    let distance = Infinity;

    for (const their of theirs) {
      const lev = levenshtein(mine, their, change, change, update);
      distance = Math.min(distance, lev.distance);
    }

    if (!platform.isActive) {
      distance += 2;
    }

    logger.debug(JSON.stringify({ mine, theirs, distance }));
    return distance;
  }

  set platform(value) {
    const mine = this.#squashedName;
    const theirs = value.altNames.map(squash);

    if (!value.isActive)
      logger.warn(`platform ${JSON.stringify(value.altNames)} is not active`);

    if (theirs.some(t => t.startsWith(mine))) {
      this.#platform = value;
      return;
    }
    const ratio = this.distance(value) / mine.length;
    if (theirs.some(t => t.includes(mine)) && ratio < .5) {
      this.#platform = value;
      return;
    }
    if (ratio < .25) {
      this.#platform = value;
      return;
    }

    const message = `device name ${this.#name} is not close enough to platform ${JSON.stringify(value.altNames)}`;
    if (this.forceSet) {
      logger.warn(`Force setting platform: ${message}`);
      this.#platform = value;
      return;
    }
    throw new Error(message);
  }

  get platform() {
    return this.#platform;
  }

  get name() {
    return `${this.#name}-${this.#index}`
  }

  get tags() {
    const lpTag = this.#platform.tag;
    const tags = [lpTag, `${lpTag}-${this.#index}`];
    if (this.#platform.codeName) {
      tags.unshift(this.#platform.codeName);
    }
    return distinct(tags.map(t => t.toLowerCase()));
  }
}
