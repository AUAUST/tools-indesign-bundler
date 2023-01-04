const fs = require("fs");
const {
  consoleFormat,
  say,
  warn,
  error,
  fatal,
} = require("./MODULES/console.js");
// Is required to access .env variables
require("dotenv").config();

const time = {
  started: new Date(),
  ready: undefined,
};

const ENV = {
  path: process.env.PWD,
  scriptName: process.mainModule.filename.split("/").pop(),
  projectName: process.env.CURRENT_PROJECT ?? null,
  projetPath: null,
  indexFile: process.env.INDEX_FILE ?? null,
};
if (ENV.projectName == null) {
  fatal(
    `Please provide a project name by setting CURRENT_PROJECT=<id> in .env file.`
  );
}
ENV.projetPath = `${ENV.path}/PROJECTS/${ENV.projectName}`;

const INDEX = {
  path: `${ENV.projetPath}/${ENV.indexFile ?? "index.js"}`,
  rawContent: "",
  processedContent: {},
  actions: require("./MODULES/index"),
};

const FILES = {
  GLOBALS: {
    path: `${ENV.path}/GLOBALS/`,
    required: [],
    imported: [],
    watchers: [],
    rawContents: {},
    processedContents: {},
  },
  LOCALS: {
    path: `${ENV.projetPath}/IMPORTS/`,
    required: [],
    imported: [],
    watchers: [],
    rawContents: {},
    processedContents: {},
  },
};

time.ready = new Date();
say(`${consoleFormat.GREEN}BUNDLER SCRIPT STARTED IN ${time.ready.getTime() - time.started.getTime()}ms${consoleFormat.RESET} —— See debug information below.`); //prettier-ignore
INDEX.actions.readFile.call(INDEX);
INDEX.actions.parseFile.call(INDEX);

try {
  fs.watchFile(INDEX.path, (current, previous) => {
    if (current.mtime !== previous.mtime) {
      INDEX.actions.readFile.call(INDEX);
      INDEX.actions.parseFile.call(INDEX);
      updateBundle(`index updated`);
    }
  });
  say(
    `${consoleFormat.AQUA}INDEX FOUND! ${consoleFormat.RESET}The current project is "${ENV.projectName}".`
  );
  say(
    `Started watching for the ${consoleFormat.AQUA}INDEX${consoleFormat.GRAY} here: ${INDEX.path}.`
  );
} catch (e) {
  fatal(`Failed to watch for the index file. Error: ${e.message}`);
}
updateBundle("script start");
function updateBundle(source) {
  let bundleContents = "";
  [
    INDEX.processedContent.topOfFile,
    INDEX.processedContent.beforeIndex,
    INDEX.processedContent.indexContent,
    INDEX.processedContent.afterIndex,
  ].forEach((arrayOfSnippets) => {
    arrayOfSnippets.forEach((snippet) => {
      switch (snippet.type) {
        case "text":
          bundleContents += snippet.content;
          break;
        case "local":
          bundleContents += getAndCacheContent({
            fileName: snippet.fileName,
            type: "LOCALS",
            leftOffset: snippet.leftOffset,
          });
          break;
        case "global":
          bundleContents += getAndCacheContent({
            fileName: snippet.fileName,
            type: "GLOBALS",
            leftOffset: snippet.leftOffset,
          });
          break;
      }
    });
  });
  try {
    fs.writeFileSync(
      `${ENV.path}/BUNDLES/${ENV.projectName}.idjs`,
      bundleContents
    );
    say(`Bundle updated. Source: ${source}`);
  } catch (e) {
    error(`Failed to write to the bundle file. Error: ${e.message}`);
  }
}
function getAndCacheContent({ type, fileName, leftOffset }) {
  let object = FILES[type];
  let filePath = `${object.path}${fileName}.js`;
  let processedContent = object.processedContents[fileName];
  let rawContent = "";

  if (/^(\s|\n|\r)+$/.test(processedContent)) {
    return `/* File ${filePath} is empty. */\n`;
  }
  if (processedContent) {
    return processedContent;
  }
  try {
    rawContent = fs.readFileSync(filePath, "utf-8");
  } catch (e) {
    error(`The file ${filePath} wasn't found. Error: ${e.message}`);
    return `/* File ${filePath} wasn't found. */\n`;
  }

  processedContent = rawContent
    // trim comments
    .replace(/^\s*\/\/.*/gm, "")
    // remove empty lines and apply left offset to ensure code alignment
    .replace(/\n+/g, `\n${" ".repeat(leftOffset)}`)
    // remove spaces in the last line
    .replace(/\n(\s*)$/, "\n");
  object.processedContents[fileName] = processedContent;

  if (!object.watchers.includes(fileName)) {
    try {
      fs.watchFile(filePath, { interval: 5000 }, (current, previous) => {
        say("update");
        fileWatcher({
          current: current,
          previous: previous,
          fileName: fileName,
          filePath: filePath,
          leftOffset: leftOffset,
          type: type,
        });
      });
      object.watchers.push(fileName);
      say(`Watcher added to ${filePath}!`);
    } catch (e) {
      error(`Failed to watch for ${filePath}. Error: ${e.message}`);
    }
  }

  if (/^(\s|\n|\r)+$/.test(processedContent)) {
    return `/* File ${filePath} is empty. */\n`;
  }
  return processedContent;
}
function fileWatcher({
  current,
  previous,
  fileName,
  filePath,
  type,
  leftOffset,
}) {
  if (current.mtime !== previous.mtime) {
    let object = FILES[type];
    object.processedContents[fileName] = undefined;
    getAndCacheContent({
      type: type,
      fileName: fileName,
      leftOffset: leftOffset,
    });
    updateBundle(`${filePath}`);
  }
}
