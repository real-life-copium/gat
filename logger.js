const Level = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const Color = {
  INFO: "\x1b[34m",
  DEBUG: "\x1b[36m",
  WARN: "\x1b[33m",
  ERROR: "\x1b[31m",
  RESET: "\x1b[m",
};

const log_level = Level[Bun.env.LOG_LEVEL || "INFO"];
const stderr_writer = Bun.stderr.writer();

/**
 * Log a message to the stderr.
 * @param {keyof Level} level_key - The level of the message.
 * @param {any?} message - The message to log.
 **/
function log(level_key, message) {
  if (Level[level_key] < log_level) return;
  const now = new Date().toLocaleString();
  stderr_writer.write(`${Color[level_key]}${now} [${level_key}]${Color.RESET} ${message}\n`);
}

function info(message) {
  log("INFO", message);
}

function debug(message) {
  log("DEBUG", message);
}

function warn(message) {
  log("WARN", message);
}

function error(message) {
  log("ERROR", message);
}

export default {
  info,
  debug,
  warn,
  error,
};
