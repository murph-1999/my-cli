#! /usr/bin/env node
const { program } = require('commander')
const helpOptions = require('../lib/core/help')
const helpCommand = require('../lib/core/command')

// 处理自定义的帮助信息提示
helpOptions(program)
// 添加自定义命令
helpCommand(program)
// 配置版本号信息
program.version(require('../package.json').version).parse(process.argv)