var fs = require("fs");
var path = require("path");
var dir = require("node-dir");
// const vscode = require("vscode");
let ignores = ["node_modules", ".git", ".vscode", ".gitignore", ".eslintrc", "package.json", "package-lock.json", "gulp.json", "webpack.config.js", "unused.md"];
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

const reg1 = regFun(ignores);
const reg2 = regFun(staticsIn);
const reg3 = regFun(notStatics);
/* dir
  .promiseFiles("E:/my/my-extension/Find Unused/find-unused")
  .then(files => {
    console.log(files);
  })
  .catch(e => console.error(e)); */
/* dir.readFiles(
  "E:/my/my-extension/Find Unused/find-unused",
  {
    exclude: reg1,
    excludeDir: reg1
  },
  function(err, content, next) {
    if (err) throw err;
    console.log("content:", content);
    next();
  },
  function(err, files) {
    if (err) throw err;
    console.log("finished reading files:", files);
  }
); */

function travelSync(dir, callback, finish) {
  fs.readdir(dir, function(e, files) {
    if (e === null) {
      // i 用于定位当前遍历位置
      (function next(i) {
        // 当i >= files 表示已经遍历完成，进行遍历下一个文件夹
        if (i < files.length) {
          var pathname = path.join(dir, files[i]);
          if (
            fs.stat(pathname, function(e, stats) {
              if (stats.isDirectory()) {
                travelSync(pathname, callback, function() {
                  next(i + 1);
                });
              } else {
                callback(e, pathname, function() {
                  next(i + 1);
                });
              }
            })
          );
        } else {
          /**
           * 当 i >= files.length 时，即表示当前目录已经遍历完了， 需遍历下一个文件夹
           * 这里执行的时递归调用 传入的 方法 ， 方法里调用了 next(i) 记录了当前遍历位置
           */
          finish && finish();
        }
      })(0);
    } else {
      callback(e);
    }
  });
}
travelSync(
  "E:/my/my-extension/Find Unused/find-unused",
  function(e, file, next) {
    if (e !== null) {
      console.log(e);
    }
    console.log(file);
    // 获取下一个文件 next 里面调用了 next(i) 记录了当前遍历位置
    next();
  },
  () => {
    console.log("done");
  }
);
