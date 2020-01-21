const fs = require("fs");
const path = require("path");
let basePath;
const vscode = require("vscode");
let ignores = vscode.workspace.getConfiguration("findUnused")["ignores"];
let staticsIn = vscode.workspace.getConfiguration("findUnused")["staticsIn"];
let notStatics = vscode.workspace.getConfiguration("findUnused")["notStatics"];
// const dir = require("node-dir");
function regFun(arr) {
  let filterString1 = "";
  for (let i = 0; i < arr.length; i++) {
    filterString1 += arr[i] + "|";
  }
  filterString1 = filterString1.replace(/\./g, "\\.");
  filterString1 = filterString1.substr(0, filterString1.length - 1);
  return new RegExp(filterString1);
}

const reg1 = regFun(ignores);
const reg2 = regFun(staticsIn);
const reg3 = regFun(notStatics);
/* const fileFilter = function(ele) {
  return reg1.test(ele);
}; */
const staticsInFilter = function(ele) {
  return reg2.test(ele);
};
const notStaticsFilter = function(ele) {
  return reg3.test(ele);
};
/* const fileFilter = function(ele) {
  return ele.match(/node_modules|\.git|\.vscode|\.gitignore|\.eslintrc|package\.json|package-lock\.json|gulp\.js|webpack\.config\.js/);
}; */
let resultText = "",
  contentText = "",
  // notiMsg = "",
  progressFlag = true,
  staticFiles = [],
  progressUpdate = "Starting up...",
  step = 0,
  listCount = 1,
  count = 0,
  countFlag = true,
  outList = [];
let staticFileReg = /[\w-\.]+\.\w{1,6}/gm;

function getUnused(progress, token, resolve) {
  for (let i = 0, iL = staticFiles.length; i < iL; i++) {
    let re = new RegExp(staticFiles[i].name); // 文件名正则
    if (!re.test(contentText)) {
      resultText += "file:///" + staticFiles[i].path + "\n";
    }
    if (!progressFlag) {
      break;
    }
  }
  if (progressFlag) {
    if (resultText) {
      fs.writeFile(path.join(basePath, "unused.md"), resultText, function(err) {
        vscode.workspace.openTextDocument(vscode.Uri.file(path.join(basePath, "unused.md"))).then(doc => vscode.window.showTextDocument(doc));
        if (err) throw err;
      });
      vscode.window.showInformationMessage("Please check the files in unused.md, delete the files you want to keep, then use command 'findUnused delete' to remove the rest.");
    } else {
      vscode.window.showInformationMessage("No unused files found.");
    }
  }
  resolve();

  // console.log("end" + new Date().getTime());
}

function executeSearch(basePath, progress, token) {
  return new Promise(resolve => {
    // var progressUpdate = "Starting up...";
    let interval = setInterval(() => progress.report({ increment: step, message: progressUpdate }), 200);
    // getAllLength(basePath, progress, token);
    readFiles(
      basePath,
      {
        excludeDir: reg1,
        exclude: reg1
      },
      function(err, content, next) {
        if (err) throw err;
        if (content) {
          let contentFiles = content.match(staticFileReg);
          if (contentFiles) {
            contentText += contentFiles.join(";");
          }
        }
        next();
      },
      function(err, files) {
        if (err) throw err;
        // console.log("finished reading files:", files[0]);
        getUnused(progress, token, resolve);
      }
    );

    token.onCancellationRequested(() => {
      progressFlag = false;
      clearInterval(interval);
      resolve();
    });
  });
}
function extend(target, source, modify) {
  var result = target ? (modify ? target : extend({}, target, true)) : {};
  if (!source) return result;
  for (var key in source) {
    if (source.hasOwnProperty(key) && source[key]) {
      result[key] = source[key];
    }
  }
  return result;
}
function matches(str, match) {
  if (Array.isArray(match)) return match.indexOf(str) > -1;
  return match.test(str);
}
function readFiles(dir, options, callback, complete) {
  if (typeof options === "function") {
    complete = callback;
    callback = options;
    options = {};
  }
  if (typeof options === "string") {
    options = {
      encoding: options
    };
  }
  options = extend(
    {
      recursive: true,
      encoding: "utf8",
      doneOnErr: true
    },
    options
  );
  let files = [];

  let done = function(err) {
    if (typeof complete === "function") {
      if (err) return complete(err);
      complete(null, files);
    }
  };
  if (!progressFlag) return done("已取消");
  fs.readdir(dir, function(err, list) {
    if (err) {
      if (options.doneOnErr === true) {
        if (err.code === "EACCES") return done();
        return done(err);
      }
    }
    if (countFlag) {
      countFlag = false;
      listCount = list.length;
      outList = list;
    }

    var i = 0;

    if (options.reverse === true || (typeof options.sort === "string" && /reverse|desc/i.test(options.sort))) {
      list = list.reverse();
    } else if (options.sort !== false) {
      list = list.sort();
    }

    (function next() {
      if (!progressFlag) return done("已取消");
      var filename = list[i++];
      if (!filename) return done(null, files);
      if (outList[outList.length - 1] === list[outList.length - 1]) {
        count += 1;
        step = parseFloat((count / listCount) * 10);
        // console.log(step);
      }
      var file = path.join(dir, filename);
      fs.stat(file, function(err, stat) {
        if (err && options.doneOnErr === true) return done(err);
        if (stat && stat.isDirectory()) {
          if (options.recursive) {
            if (options.matchDir && !matches(filename, options.matchDir)) return next();
            if (options.excludeDir && matches(filename, options.excludeDir)) return next();
            readFiles(file, options, callback, function(err, sfiles) {
              if (err && options.doneOnErr === true) return done(err);
              files = files.concat(sfiles);
              next();
            });
          } else {
            next();
          }
        } else if (stat && stat.isFile()) {
          if (options.match && !matches(filename, options.match)) return next();
          if (options.exclude && matches(filename, options.exclude)) return next();
          if (options.filter && !options.filter(filename)) return next();
          if (options.shortName) files.push(filename);
          else files.push(file);
          if (staticsInFilter(filename)) {
            progressUpdate = file;
            fs.readFile(file, options.encoding, function(err, data) {
              if (err) {
                if (err.code === "EACCES") return next();
                if (options.doneOnErr === true) {
                  return done(err);
                }
              }
              if (callback.length > 3) {
                if (options.shortName) callback(null, data, filename, next);
                else callback(null, data, file, next);
              } else {
                callback(null, data, next);
              }
            });
          } else {
            callback(null, false, next);
          }
          if (!notStaticsFilter(filename)) {
            let obj = {};
            obj.name = filename;
            obj.path = file;
            staticFiles.push(obj);
          }
        } else {
          next();
        }
      });
    })();
  });
}
function activate(context) {
  vscode.commands.registerCommand("findUnused.find", async () => {
    if (vscode.workspace.workspaceFolders.length === 1) {
      resultText = "";
      contentText = "";
      progressFlag = true;
      staticFiles = [];
      progressUpdate = "Starting up...";
      step = 0;
      listCount = 1;
      count = 0;
      countFlag = true;
      outList = [];
      basePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
      // console.log("start" + new Date().getTime());
      // getAllLength(basePath);
      // getUnused();
      // console.log("c" + new Date().getTime() + "a" + L);
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "searching...",
          cancellable: true
        },
        async (progress, token) => {
          /* token.onCancellationRequested(() => {
            progressFlag = false;
            // clearInterval(timer);
          }); */
          /* var p = new Promise(resolve => {
            timer = setInterval(() => {
              // console.log((L2 / L) * 100);
              if (L2 < L) {
                progress.report({ increment: (L2 / L) * 100, message: `${((L2 / L) * 100).toFixed(2)}%` });
              } else {
                clearInterval(timer);
                resolve();
              }
            }, 100);
          });
          return p; */
          return executeSearch(basePath, progress, token);
        }
      );
    } else {
      vscode.window.showErrorMessage("The extension only support one workspaceFolder for now.");
    }
  });
  vscode.commands.registerCommand("findUnused.delete", function() {
    if (vscode.workspace.workspaceFolders.length === 1) {
      basePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
      fs.exists(path.join(basePath, "unused.md"), function(exists) {
        if (exists) {
          vscode.window.showInputBox({ prompt: "Find Unused: Please enter 'yes' to delete file list in unused.md. (Please make a backup before you do this.)" }).then(function(text) {
            if (text === "yes") {
              let unusedFiles = path.join(basePath, "unused.md");
              let fileContentArr = fs
                .readFileSync(unusedFiles, "utf-8")
                .replace(/file:\/\/\//gm, "")
                .split("\n");
              fileContentArr.forEach(file => {
                if (file) {
                  fs.unlink(file, err => {
                    if (err) console.error(err);
                  });
                }
              });
              vscode.window.showInformationMessage("Deleted all files in unused.md.");
            }
          });
        } else {
          vscode.window.showErrorMessage("There is no file named unused.md!");
        }
      });
    } else {
      vscode.window.showErrorMessage("The extension only support one workspaceFolder for now.");
    }
  });
}

exports.activate = activate;

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
