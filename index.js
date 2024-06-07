#!/usr/bin/env bun
import yargs from "yargs";
import fetch from "./platform";
import Device from "./device";
import logger from "./logger";

const PROJECT = "sutton";

const argv = yargs(process.argv.slice(2))
  .usage("Usage: $0 <device> [options]")
  .option("code-name", {
    type: "string",
    description: "The code name of the device",
  })
  .option("force-set", {
    type: "boolean",
    description: "Force set the platform",
  })
  .help()
  .version()
  .parse();

const device = new Device(argv._[0]);
device.forceSet = argv.forceSet;
const platforms = await fetch(PROJECT);
if (platforms.length === 0) {
  logger.error("the platforms list is empty");
  process.exit(1);
}

let min_distance = Infinity;
let closest_platform = null;

for (const platform of platforms) {
  if (argv.codeName && platform.codeName !== argv.codeName)
    continue;
  const distance = device.distance(platform);
  if (distance < min_distance) {
    min_distance = distance;
    closest_platform = platform;
  }
}

if (!closest_platform) {
  logger.error("no platforms found");
  process.exit(1);
}

closest_platform.codeName = argv.codeName;
device.platform = closest_platform;

const args = [
  "-p", PROJECT,
  "-u", device.name,
  "-t", device.tags.join(" "),
  "-a", device.platform.engineer,
];

console.log(args.join(" "));
