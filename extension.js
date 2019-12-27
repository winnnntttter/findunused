const fs = require("fs");
const path = require("path");
let basePath;
const vscode = require("vscode");
const fileFilter = function(ele) {
  return ele.match(/node_modules|\.git|\.vscode|\.gitignore|\.eslintrc|package\.json|package-lock\.json|gulp\.js|webpack\.config\.js/);
};
let flag = true,
  resultText = "",
  L = 0,
  L2 = 0,
  notiMsg = "",
  progressFlag = true;
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
          if (!ele.match(/\.html|\.js|\.css|\.less|\.vue|\.jsx|\.sass|\.scss/)) {
            return;
          } else {
            let fileContent = fs.readFileSync(pathTemp, "utf-8"); // 读取页面内容
            var re = new RegExp("/" + fileName); // 文件名正则
            if (fileContent.match(re)) {
              flag = false;
              return;
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
            if (ele.match(/\.html|\.vue|\.jsx|\.jsp/)) {
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
                    vscode.workspace.openTextDocument(path.join(basePath, "unused.md")).then(doc => vscode.window.showTextDocument(doc));
                    if (err) throw err;
                  });
                  vscode.window.showInformationMessage("请仔细核对unused.md中列出的文件，确认后执行删除命令。");
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
  if (!menu) return;
  L += menu.length;
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
      getAllLength(basePath);
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "正在查找!",
          cancellable: true
        },
        (progress, token) => {
          token.onCancellationRequested(() => {
            progressFlag = false;
          });
          readDir(basePath);
          var p = new Promise(resolve => {
            let timer = setInterval(() => {
              // console.log((L2 / L) * 100);
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
