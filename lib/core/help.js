/*
 * @Description:
 * @version:
 * @Author: Murphy
 * @Date: 2022-09-07 20:54:13
 * @LastEditTime: 2022-09-07 20:57:00
 */
const helpOptions = function (program) {
  // 新增自定义的可选属性
  program.option('-f --framework <framework>', 'select your framework')
  program.option('-d --dest <dest>', 'a folder')

  // 处理帮助信息
  const examples = {
    create: ['my-cli create|crt <project>'],
    config: ['my-cli config|cfg set <k> <v>', 'my-cli config|cfg get']
  }

  // 触发事件
  program.on('--help', () => {
    console.log('examples:')
    Object.keys(examples).forEach((actionName) => {
      examples[actionName].forEach((item) => {
        console.log("  " + item)
      })
    })
  })
}
module.exports = helpOptions