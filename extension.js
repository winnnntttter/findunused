const fs = require("fs");
const path = require("path");
let basePath;
const vscode = require("vscode");
let filters = ["node_modules", ".git", ".vscode", ".gitignore", ".eslintrc", "package.json", "package-lock.json", "gulp.json", "webpack.config.js"];
let staticsIn = [".html", ".vue", ".jsx", ".jsp", ".js", ".css", ".less", ".sass", ".less", ".scss"];
let notStatics = [".html", ".vue", ".jsx", ".jsp"];
function regFun(arr) {
  let filterString1 = "";
  for (let i = 0; i < arr.length; i++) {
    filterString1 += arr[i] + "|";
  }
  filterString1 = filterString1.replace(/\./g, "\\.");
  filterString1 = filterString1.substr(0, filterString1.length - 1);
  return new RegExp(filterString1);
}

const reg1 = regFun(filters);
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
let flag = true,
  resultText = "",
  L = 0,
  L2 = 0,
  notiMsg = "",
  progressFlag = true,
  fileContents = {};
function findMatch(pa, fileName) {
  var menu = fs.readdirSync(pa);
  if (menu) {
    menu.forEach(ele => {
      if (fileFilter(ele)) {
        // 忽略的文件和文件夹
        return;
      } else {
        let pathTemp = path.join(pa, ele);
        if (fs.statSync(pathTemp).isDirectory()) {
          findMatch(pathTemp, fileName);
        } else {
          if (new RegExp(pathTemp).test(resultText)) {
            console.log(pathTemp);
          }
          if (!staticsInFilter(ele) || new RegExp(pathTemp).test(resultText)) {
            return;
          } else {
            if (fileContents[pathTemp]) {
              let re = new RegExp(fileName); // 文件名正则
              if (re.test(fileContents[pathTemp])) {
                flag = false;
                return;
              }
            } else {
              let fileContent = fs.readFileSync(pathTemp, "utf-8"); // 读取页面内容
              fileContents[pathTemp] = fileContent;
              let re = new RegExp(fileName); // 文件名正则
              if (re.test(fileContent)) {
                flag = false;
                return;
              }
            }
          }
        }
      }
    });
  }
}
function readDir(pa) {
  fs.readdir(pa, (err, menu) => {
    if (!progressFlag) return;
    if (err) throw err;
    if (!menu) return;
    menu.forEach(ele => {
      L2 += 1;
      notiMsg = path.join(pa, ele);
      // console.log(L2, path.join(pa, ele));
      if (fileFilter(ele)) {
        return;
      } else {
        let fileNow = path.join(pa, ele);
        fs.stat(fileNow, (err, info) => {
          if (err) throw err;
          if (info.isDirectory()) {
            // 文件夹则进入下一层
            readDir(fileNow);
          } else {
            if (notStaticsFilter(ele)) {
              return;
            } else {
              flag = true;
              findMatch(basePath, ele);
              if (flag) {
                resultText += "file:///" + fileNow + "\n";
                /* var a= fs.createWriteStream(path.join(basePath,'output.txt'))
                a.write(resultText) */
                if (L2 === L) {
                  fs.writeFile(path.join(basePath, "unused.md"), resultText, function(err) {
                    vscode.workspace.openTextDocument(vscode.Uri.file(path.join(basePath, "unused.md"))).then(doc => vscode.window.showTextDocument(doc));
                    if (err) throw err;
                  });
                  vscode.window.showInformationMessage("请仔细核对unused.md中列出的文件，确认后执行删除命令。");
                  console.log("end" + new Date().getTime());
                  progressFlag = false;
                }
              }
            }
          }
        });
      }
    });
  });
}

function getAllLength(pa) {
  var menu = fs.readdirSync(pa);
  if (!menu) {
    // console.log("a" + new Date().getTime());
    return;
  }
  L += menu.length;
  // console.log("a" + L + "-" + new Date().getTime());
  menu.forEach(ele => {
    if (fileFilter(ele)) {
      // 忽略的文件和文件夹
      return;
    } else {
      let pathTemp = path.join(pa, ele);
      if (fs.statSync(pathTemp).isDirectory()) {
        getAllLength(pathTemp);
      }
    }
  });
}

function activate(context) {
  vscode.commands.registerCommand("findUnused.find", function() {
    if (vscode.workspace.workspaceFolders.length === 1) {
      flag = true;
      resultText = "";
      L = 0;
      L2 = 0;
      progressFlag = true;
      basePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
      console.log("start" + new Date().getTime());
      getAllLength(basePath);
      // console.log("c" + new Date().getTime() + "a" + L);
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "正在查找!",
          cancellable: true
        },
        (progress, token) => {
          let timer;
          token.onCancellationRequested(() => {
            progressFlag = false;
            clearInterval(timer);
          });
          readDir(basePath);
          var p = new Promise(resolve => {
            timer = setInterval(() => {
              console.log((L2 / L) * 100);
              if (L2 < L) {
                progress.report({ increment: (L2 / L) * 100, message: "searching..." });
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
      vscode.window.showErrorMessage("目前只支持工作区包含一个根文件夹!");
    }
  });
  vscode.commands.registerCommand("findUnused.delete", function() {
    if (vscode.workspace.workspaceFolders.length === 1) {
      basePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
      fs.exists(path.join(basePath, "unused.md"), function(exists) {
        if (exists) {
          vscode.window.showInputBox({ prompt: "Find Unused: 请输入'yes'以删除unused.md中查询到的无用文件。" }).then(function(text) {
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
            }
          });
        } else {
          vscode.window.showErrorMessage("当前工作区根路径不存在unused.md!");
        }
      });
    } else {
      vscode.window.showErrorMessage("目前只支持工作区包含一个根文件夹!");
    }
  });
}
exports.activate = activate;

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
