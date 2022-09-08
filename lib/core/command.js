/*
 * @Description:
 * @version:
 * @Author: Murphy
 * @Date: 2022-09-07 20:54:28
 * @LastEditTime: 2022-09-07 20:57:13
 */
const { createAction } = require('./actions')
const helpCommand = function (program) {
  // 添加自定义命令 别名 描述 action回调 project必填 others选填
  program
    .command('create <project> [others...]')
    .alias('crt')
    .description('create new project')
    .action(createAction)
}
module.exports = helpCommand