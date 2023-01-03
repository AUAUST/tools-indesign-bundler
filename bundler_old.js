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
  return `${prefix}${message.replace(/[\n\r]+/g, `\n${prefix} `)}`;
}
function areArraysTheSame(...arrays) {
  const sortedArrays = arrays.slice().map((array) => array.slice().sort());
  const refArray = JSON.stringify(sortedArrays.pop());
  return sortedArrays.every((array) => refArray === JSON.stringify(array));
}
function arraysDifference(arrayA, arrayB) {
  let onlyInArrayA = [];
  let onlyInArrayB = [];
  arrayA.forEach((value) => {
    if (!arrayB.includes(value)) onlyInArrayA.push(value);
  });
  arrayB.forEach((value) => {
    if (!arrayA.includes(value)) onlyInArrayB.push(value);
  });
  return { onlyFirstArray: onlyInArrayA, onlyLastArray: onlyInArrayB };
}
function initIndex() {
  INDEX.content = null;
  GLOBALS.required = [];
  LOCALS.before.required = [];
  LOCALS.after.required = [];

  let indexContent = "";
  try {
    indexContent = fs.readFileSync(INDEX.path, "utf-8");
  } catch (e) {
    fatal(`COULDN'T FIND THE INDEX AT ${INDEX.path}`);
  }
  if (firstTime) {
    firstTime = false;
    say(`${consoleFormat.AQUA}INDEX FILE FOUND!`);
  }
  INDEX.content = indexContent;
  let readingHeader = false;
  for (const line of indexContent.split("\n")) {
    if (line.startsWith("/* AUAUST") && !line.includes("*/")) {
      readingHeader = true;
      continue;
    }

    if (readingHeader) {
      if (line.includes("*/")) {
        readingHeader = false;
        continue;
      }
      // matches anything[(.*)] after {^}<start of string>{\s*}<0 or more spaces>{[*]}<an asterisk>{\s*}<0 or more spaces>
      let instruction = line.match(/^\s*[*]\s*(?<instruction>.*)/); // prettier-ignore
      // if the instruction is null, undefined or an empty string, ignore the line
      if (!instruction) {
        continue;
      }
      instruction = instruction.groups.instruction;
      const [command, ...arguments] = instruction.split(" ");
      switch (command.toLowerCase()) {
        case "useglobal":
          for (const index in arguments) {
            const argument = arguments[index];
            if (GLOBALS.required.includes(argument))
              warn(`Global script ${argument} is declared multiple times.`);
            else GLOBALS.required.push(argument);
          }
          break;
        case "uselocal":
          const position = arguments.find(argument => argument.startsWith('@')); // prettier-ignore
          if (position) {
            const index = arguments.indexOf(position);
            arguments.splice(index, 1);
          } else {
            error(
              `Declared an "useLocal" rule without specifying "@before", "@after" or "@here". Ignoring the declaration.`
            );
            break;
          }
          switch (position) {
            case "@before":
              for (const index in arguments) {
                const argument = arguments[index];
                // Check if it is present for the SAME position
                if (LOCALS.before.required.includes(argument)) {
                  warn(`File "${argument}" is declared multiple times with the @before position in an "useLocal" rule.`); // prettier-ignore
                }
                // Otherwise add it
                else {
                  LOCALS.before.required.push(argument);
                }
                // Check it it it present for the OTHER position to log a warn
                if (LOCALS.after.required.includes(argument)) {
                  warn(`File "${argument}" is declared with the @before AND @after positions in an "useLocal" rule. Added twice, be aware of errors.`); // prettier-ignore
                }
              }
              break;
            case "@after":
              for (const index in arguments) {
                const argument = arguments[index];
                // Check if it is present for the SAME position
                if (LOCALS.after.required.includes(argument)) {
                  warn(`File "${argument}" is declared multiple times with the @after position in an "useLocal" rule.`); // prettier-ignore
                }
                // Otherwise add it
                else {
                  LOCALS.after.required.push(argument);
                }
                // Check it it it present for the OTHER position to log a warn
                if (LOCALS.before.required.includes(argument)) {
                  warn(`File "${argument} "is declared with the @after AND @before positions in an "useLocal" rule. Added twice, be aware of errors.`); // prettier-ignore
                }
              }
              break;
            default:
              error(
                `The only @ arguments allowed are "@before", "@after" and “@here". The rule has been ignored.`
              );
              break;
          }
        default:
          break;
      }
    }
  }
  let somethingChanged = false;
  const objectsToLook = [
    {
      object: LOCALS.before,
      path: LOCALS.path,
    },
    {
      object: LOCALS.after,
      path: LOCALS.path,
    },
    {
      object: GLOBALS,
      path: GLOBALS.path,
    },
  ];
  objectsToLook.forEach((data) => {
    if (!areArraysTheSame(data.object.required, data.object.imported)) {
      somethingChanged = true;

      const differences = arraysDifference(data.object.required, data.object.imported); // prettier-ignore
      const mustAdd = differences.onlyFirstArray;
      const mustRemove = differences.onlyLastArray;

      mustAdd.forEach((fileName) => {
        addFileWatcher(fileName, data.path, data.object);
        getAndCacheContent({
          path: data.path,
          fileName: fileName,
          object: data.object,
        });
      });
      mustRemove.forEach((fileName) => {
        removeFileWatcher(fileName, data.path, data.object);
      });
    }
  });
  if (somethingChanged) {
    say(`${consoleFormat.AQUA}INDEX DEPENDENCIES UPDATED !`);
  }
}
function addFileWatcher(fileName, path, object) {
  const fullName = `${path}${fileName}.js`;
  fs.watchFile(fullName, { interval: 5000 }, (current, previous) =>
    fileWatcher({
      current: current,
      previous: previous,
      fileName: fileName,
      path: path,
      object: object,
    })
  );
  object.watchers.push(fileName);
  say(`STARTED WATCHING FOR ${fullName} !`);
}
function removeFileWatcher(fileName, path, object) {
  const fullName = `${path}${fileName}.js`;
  fs.unwatchFile(fullName);
  say(`STOPPED WATCHING FOR ${fullName} !`);
}
function fileWatcher({ current, previous, fileName, path, object }) {
  if (current.mtime !== previous.mtime) {
    getAndCacheContent({ path: path, fileName: fileName, object: object });
    updateBundle(`${path}${fileName}.js`);
  }
}
function getAndCacheContent({ path, fileName, object }) {
  try {
    object.contents[fileName] = fs.readFileSync(
      `${path}${fileName}.js`,
      "utf-8"
    );
  } catch (e) {
    object.contents[
      fileName
    ] = `/* File ${fileName} is empty or doesn't exist. */\n`;
    error(`ERROR TRYING TO READ ${e.path} ! Error code: ${e.code}.`);
  }
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
function updateBundle(source) {
  let bundleContents = "";

  GLOBALS.imported = [];
  Object.keys(GLOBALS.required).forEach((index) => {
    const fileName = GLOBALS.required[index];
    bundleContents +=
      GLOBALS.contents[fileName] ||
      `/* File ${fileName} is empty or doesn't exist. */\n`;
    GLOBALS.imported.push(fileName);
  });

  LOCALS.before.imported = [];
  Object.keys(LOCALS.before.required).forEach((index) => {
    const fileName = LOCALS.before.required[index];
    bundleContents +=
      LOCALS.before.contents[fileName] ||
      `/* File ${fileName} is empty or doesn't exist. */\n`;
    LOCALS.before.imported.push(fileName);
  });

  bundleContents += INDEX.content;

  LOCALS.after.imported = [];
  Object.keys(LOCALS.after.required).forEach((index) => {
    const fileName = LOCALS.after.required[index];
    bundleContents +=
      LOCALS.after.contents[fileName] ||
      `/* File ${fileName} is empty or doesn't exist. */\n`;
    LOCALS.after.imported.push(fileName);
  });

  bundleContents = bundleContents
    .replace(/^\s*(\/\/.*)?$/gm, "")
    .replace(/\n+/g, "\n");

  const bundleFullName = `${ENV.path}/BUNDLES/${ENV.projectName}.idjs`;

  fs.writeFile(bundleFullName, bundleContents, (error) => {
    if (error) {
      error(error);
      return;
    }
    say(
      `BUNDLED AND APPLIED CHANGES TO ${bundleFullName} ! (Source of change: ${
        source ?? "unknown"
      })`
    );
  });
}
const fs = require("fs");
const dotenv = require("dotenv").config();

const ENV = {
  path: process.env.PWD,
  scriptName: process.mainModule.filename.split("/").pop(),
  projectName: process.env.CURRENT_PROJECT ?? null,
  projetPath: null,
};
if (ENV.projectName == null) {
  fatal(
    `Please provide a project name by setting CURRENT_PROJECT=<id> in .env file.`
  );
}

ENV.projetPath = `${ENV.path}/PROJECTS/${ENV.projectName}`;

const INDEX = {
  path: `${ENV.projetPath}/index.js`,
  content: "",
};
const GLOBALS = {
  path: `${ENV.path}/GLOBALS/`,
  required: [],
  imported: [],
  watchers: [],
  contents: {},
};
const LOCALS = {
  path: `${ENV.projetPath}/IMPORTS/`,
  before: { required: [], imported: [], watchers: [], contents: {} },
  after: { required: [], imported: [], watchers: [], contents: {} },
};
let firstTime = true;
say(`${consoleFormat.GREEN}BUNDLER SCRIPT STARTED${consoleFormat.RESET} —— See debug information below.`); //prettier-ignore

fs.watchFile(INDEX.path, { interval: 4000 }, (current, previous) => {
  if (current.mtime !== previous.mtime) {
    initIndex();
    updateBundle("index updated");
  }
});
// Init and bundle once @ start
initIndex();
updateBundle("script start");
