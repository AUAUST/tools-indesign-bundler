const consoleFormat = {
  RESET: "\x1b[0m", INVISIBLE: "\x1b[8m",
  BOLD: "\x1b[1m", LIGHT: "\x1b[2m", ITALIC: "\x1b[3m", UNDERLINE: "\x1b[4m",
  SLOW_BLINK: "\x1b[5m", FAST_BLINK: "\x1b[6m",
  BLACK: "\x1b[30m", RED: "\x1b[31m", GREEN: "\x1b[32m", YELLOW: "\x1b[33m", BLUE: "\x1b[34m", PINK: "\x1b[35m",AQUA: "\x1b[36m", GRAY: "\x1b[37m",
}; // prettier-ignore
function say(message) {
  console.error(`${formatMessage(message)}`);
}
function warn(message) {
  console.warn(`${formatMessage(message, "warn")}`);
}
function error(message) {
  console.error(`${formatMessage(message, "error")}`);
}
function update(message) {
  console.log(`${formatMessage(message, "update")}`);
}
function fatal(message) {
  console.error(`${formatMessage(message, "fatal")}`);
  process.exit();
}
function formatMessage(message, type) {
  const prefixes = {
    tag: `${consoleFormat.BLUE}AUAUST${consoleFormat.GRAY}`,
    types: {
      default: ` ${consoleFormat.RESET}OK! ${consoleFormat.GRAY}`,
      warn: ` ${consoleFormat.YELLOW}WRN ${consoleFormat.GRAY}`,
      update: ` ${consoleFormat.PINK}NEW ${consoleFormat.GRAY}`,
      error: ` ${consoleFormat.RED}ERR ${consoleFormat.GRAY}`,
      fatal: ` ${consoleFormat.RED}FATAL ERROR! ${consoleFormat.GRAY}`,
    },
  };
  if (typeof message !== "string") {
    message = `${JSON.stringify(message, "", 2)}`;
  }
  const prefix = `${prefixes.tag} ${timeTagNow()}${
    prefixes.types[type] ?? prefixes.types.default
  }`;
  // return message.replace("\n, " ———— ")
  return `${prefix}${message.replace(/[\n\r]+/g, `\n${prefix}`)}`;
}
function timeTagNow() {
  const date = new Date();
  return `${
    String(date.getFullYear()).padStart(2, "0")
  }${
    String(date.getMonth() + 1).padStart(2, "0")
  }${
    String(date.getDay() + 1).padStart(2, "0")
  }-${
    String(date.getHours()).padStart(2, "0")
  }${
    String(date.getMinutes()).padStart(2, "0")
  }${
    String(date.getSeconds()).padStart(2, "0")
  }`; // prettier-ignore
}

module.exports = {
  say,
  warn,
  update,
  error,
  fatal,
  consoleFormat,
};
