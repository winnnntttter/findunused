# find-unused README

Find and delete unused static resource, press `F1` or `ctrl+shift+p`, then enter `findUnused find` to find unused static files, then the files will be listed in unused.md. Check the file list carefully and delete the line that the file you still need. Then use command `findUnused delete` and enter `yes` to delete the files listed in unused.md. (Recommend backup before delete)

查找并删除无用的静态资源，按`F1`或`ctrl+shift+p`后输入命令`findUnused find`、会将查找到的无用静态文件保存在unused.md中，请仔细核查，添加遗漏文件或删除不正确的文件路径后，后输入命令`findUnused delete`，输入`yes`后将unused.md列表中的文件删除。（请谨慎使用，建议删除前备份）

configs:(edit in setting.jsom)

| config                | default                                                      | description                                                  |
| --------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| findUnused.ignores    | ["node_modules",".git",".vscode",".gitignore",".eslintrc"...] | The files and folders that you want to ignore when checking. |
| findUnused.staticsIn  | [".html",".vue",".jsx",".jsp",".js",".css"...]               | The file types that the statics may in                       |
| findUnused.notStatics | [".html",".vue",".jsx",".jsp"]                               | The file types that is not a statics file                    |


