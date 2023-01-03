const fs = require("fs");
const { say, error, warn } = require("./console");

// `this` keyword = `INDEX`
function readFile() {
  try {
    this.rawContent = fs.readFileSync(this.path, "utf-8");
    return this.rawContent;
  } catch (e) {
    error(`Could not read the index. Error: ${e.message}`);
    return null;
  }
}
function parseFile() {
  let readingRules = false;
  let leftOffset = 0;
  let processedContent = {
    topOfFile: [],
    beforeIndex: [],
    indexContent: [],
    afterIndex: [],
  };
  let linesStack = "";
  // loops through each line
  this.rawContent.split(/\n|\r/).forEach((line) => {
    // matches not empty and not // comments lines
    if (!/^\s*(\/\/.*)?$/.test(line)) {
      if (readingRules) {
        // matches lines with */ inside of them, closing the AUAUST blocks
        if (line.includes("*/")) {
          readingRules = false;
        } else {
          let instruction = line.match(
            // expression that gets the first word after ` * ` in the "rule" group and everything else in "arguments"
            /^\s*\*?\s*(?<rule>\w+)\s+(?<arguments>.*)/
          );
          // instruction isn't equal to null only if there is both a rule and at least on argument
          if (instruction != null) {
            let parsedInstruction = parseInstruction.call({
              rule: instruction.groups.rule,
              arguments: instruction.groups.arguments,
            });
            if (parsedInstruction.valid) {
              // to facilitate update of single components, we individualize each argument
              const individualizedRules = parsedInstruction.arguments.map(
                (file) => {
                  return {
                    type: parsedInstruction.type,
                    fileName: file,
                    leftOffset: leftOffset,
                  };
                }
              );
              if (parsedInstruction.type === "local") {
                switch (parsedInstruction.position) {
                  case "before":
                    processedContent.beforeIndex.push(...individualizedRules);
                    break;
                  case "after":
                    processedContent.afterIndex.push(...individualizedRules);
                    break;
                  case "here":
                    // we add the current stack to the processed content and reset the variable
                    // but only if there's already something inside the variable
                    if (linesStack) {
                      processedContent.indexContent.push({
                        type: "text",
                        content: linesStack,
                      });
                      linesStack = "";
                    }

                    processedContent.indexContent.push(...individualizedRules);
                    break;
                }
              } else if (parsedInstruction.type === "global") {
                processedContent.topOfFile.push(...individualizedRules);
              }
            }
          }
        }
      }
      // matches lines starting with /* AUAUST
      else if (/^\s*\/\*(\s)*AUAUST(\s)*$/.test(line)) {
        readingRules = true;
        leftOffset = line.indexOf("/*");
      }
      // not reading rules, not opening an AUAUST block and we know we're not reading comments
      // so we add that line to the index stack without processing it
      else {
        linesStack += `${line}\n`;
      }
    }
  });
  if (linesStack) {
    processedContent.indexContent.push({
      type: "text",
      content: linesStack,
    });
  }

  this.processedContent = processedContent;
  return processedContent;
}

function parseInstruction() {
  let type = "";
  let position = "";
  let valid = true;
  let arguments = this.arguments.split(/\s+/);

  if (this.rule === "useLocal") {
    type = "local";
    const indexOfPosition = arguments.findIndex((argument) => {
      return argument.startsWith("@");
    });
    position = arguments.splice(indexOfPosition, 1)[0];
    // handles the lack of @position
    if (position == null) {
      valid = false;
      position = "unset";
    }
    // handles wrong @position
    else {
      if (["@here", "@before", "@after"].includes(position)) {
        position = position.slice(1);
      } // trims the @
      else {
        valid = false;
        position = "illegal";
      }
    }
  } else if (this.rule === "useGlobal") {
    type = "global";
  }
  return {
    valid: valid,
    type: type,
    position: position,
    arguments: arguments,
  };
}

module.exports = {
  readFile,
  parseFile,
};
