const fs = require("fs");
const path = require("path");
let basePath;
const vscode = require("vscode");
let ignores = vscode.workspace.getConfiguration("findUnused")["ignores"];
let staticsIn = vscode.workspace.getConfiguration("findUnused")["staticsIn"];
let notStatics = vscode.workspace.getConfiguration("findUnused")["notStatics"];
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
const fileFilter = function(ele) {
  return reg1.test(ele);
};
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
  L = 0,
  L2 = 0,
  // notiMsg = "",
  progressFlag = true,
  staticFiles = [];
let staticFileReg = /[\w-\.]+\.\w{1,6}/gm;

function getAllLength(pa) {
  var menu = fs.readdirSync(pa);
  if (!menu) {
    // console.log("a" + new Date().getTime());
    return;
  }
  // L += menu.length;
  // console.log("a" + L + "-" + new Date().getTime());
  menu.forEach(ele => {
    if (fileFilter(ele)) {
      // 忽略的文件和文件夹
      return;
    } else {
      let pathTemp = path.join(pa, ele);
      if (fs.statSync(pathTemp).isDirectory()) {
        getAllLength(pathTemp);
      } else {
        if (staticsInFilter(ele)) {
          let contentFiles = fs.readFileSync(pathTemp, "utf-8").match(staticFileReg);
          if (contentFiles) {
            contentText += contentFiles.join(";");
          }
        }
        if (!notStaticsFilter(ele)) {
          L += 1;
          let obj = {};
          obj.name = ele;
          obj.path = pathTemp;
          staticFiles.push(obj);
        }
      }
    }
  });
}
function getUnused() {
  for (let i = 0, iL = staticFiles.length; i < iL; i++) {
    L2 += 1;
    let re = new RegExp(staticFiles[i].name); // 文件名正则
    if (!re.test(contentText)) {
      resultText += "file:///" + staticFiles[i].path + "\n";
    }
    if (!progressFlag) {
      break;
    }
  }
  // console.log(`L2${L2}`);
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
  // console.log("end" + new Date().getTime());
}

function activate(context) {
  vscode.commands.registerCommand("findUnused.find", function() {
    if (vscode.workspace.workspaceFolders.length === 1) {
      resultText = "";
      contentText = "";
      staticFiles = [];
      L = 0;
      L2 = 0;
      progressFlag = true;
      basePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
      // console.log("start" + new Date().getTime());
      getAllLength(basePath);
      getUnused();
      // console.log("c" + new Date().getTime() + "a" + L);
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "searching...",
          cancellable: true
        },
        (progress, token) => {
          let timer;
          token.onCancellationRequested(() => {
            progressFlag = false;
            clearInterval(timer);
          });
          var p = new Promise(resolve => {
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
          return p;
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
