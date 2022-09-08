/*
 * @Description:命令执行回调
 * @version:
 * @Author: Murphy
 * @Date: 2022-08-24 12:31:15
 * @LastEditTime: 2022-09-08 09:25:16
 */
const chalk = require('chalk')
const axios = require('axios')
const ora = require('ora')
const fs = require('fs')
const ncp = require('ncp')
const { render } = require('consolidate').ejs
const { promisify } = require('util')
const inquirer = require('inquirer')
let downLoadFn = require('download-git-repo')
const path = require('path')
const { fstat } = require('fs')
const { promise } = require('ora')
const Metalsmith = require('metalsmith')
const { spawn } = require('child_process')

downLoadFn = promisify(downLoadFn)
const toUnixPath = function (path) {
  return path.replace(/\\/g, '/')
}

const fetchInfo = async function (repoName, tmpName) {
  const headers = { "Authorization": "token: " + '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' }
  const repoUrl = `https://api.github.com/orgs/${repoName}/repos`
  const tmpUrl = `https://api.github.com/repos/${repoName}/${tmpName}/tags`
  const url = !tmpName ? repoUrl : tmpUrl
  const { data } = await axios({ url, method: 'get', headers: headers })
  console.log(data);
  return data.map(item => item.name)
}

const addLoading = function (fn) {
  return async function (...args) {
    const spinner = ora('searching').start()
    const ret = await fn(...args)
    spinner.succeed('search finished')
    return ret
  }
}

// 选定版本号后下载仓库
const downLoadRepo = async function (repo, tag) {
  // 定义缓存目录
  const cacheDir = toUnixPath(`${process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME']}/.tmp`)
  // 下载
  let api = `my-cli-template/${repo}`
  if (tag) api += `#/${tag}`
  // 完善缓存目录
  const dest = tag ? toUnixPath(path.resolve(cacheDir, repo, tag)) : toUnixPath(path.resolve(cacheDir, repo))
  // 判断dist目录是否有缓存
  if (!fs.existsSync(dest)) {
    // 将api对应的内容下载到dest目录中
    await addLoading(downLoadFn)(api, dest)
  }
  // 将目录返回回去，用于将来拷贝内容
  return dest
}

//* 工具方法执行 npm i ，子进程与主进程的回调，子进程的结果都写入到主进程中，当子进程执行完的执行close
const commandSpawn = (...args) => {
  return new Promise((resolve, reject) => {
    const childProcess = spawn(...args)
    childProcess.stdout.pipe(process.stdout)
    childProcess.stdout.pipe(process.stderr)
    childProcess.on('close', () => {
      resolve()
    })
  })
}

// action 回调
const createAction = async function (project) {
  console.log('project', project)
  // 查询模板信息
  const repos = await addLoading(fetchInfo)('my-cli-template')
  // 准备问题
  const queList = [
    {
      type: 'list',
      name: 'tmpRepo',
      message: 'please select the template repo',
      choices: repos
    }
  ]
  const { tmpRepo } = await inquirer.prompt(queList)
  const tags = await addLoading(fetchInfo)('my-cli-template', tmpRepo)

  // 区别不同版本的下载逻辑 （先确认缓存路径）
  let destUrl = null
  if (tags.length) {
    const quesTag = [
      {
        type: 'list',
        name: 'tmpTag',
        message: 'please select the template tag',
        choices: tags
      }
    ]
    const { tmpTag } = await inquirer.prompt(quesTag)
    destUrl = await downLoadRepo(tmpRepo, tmpTag)

  } else {
    // 只有一个版本 直接下载
    destUrl = await downLoadRepo(tmpRepo)
  }
  //  下载完成后 判断是否需要执行数据的渲染操作，最终在本地目录中生成项目
  if (fs.existsSync(path.join(destUrl, 'que.js'))) {
    // 需要渲染
    await new Promise((resolve, reject) => {
      Metalsmith(__dirname)
        .source(destUrl)
        .destination(path.resolve(project))
        .use(async (files, metal, done) => {
          // console.log('files', files);
          const quesList = require(path.join(destUrl, 'que.js'))
          const answer = await inquirer.prompt(quesList)
          // console.log('answer', answer);
          // 当前answer是下一个use想要使用的数据源，所以需要传递
          // 使用metal.metadata()
          // 合并answer
          let meta = metal.metadata()
          Object.assign(meta, answer)
          // que.js可以删除了
          delete files['que.js']
          done()
        })
        .use((files, metal, done) => {
          //将answer补充package.json的字段空位, 也就是渲染到package.json
          let data = metal.metadata()
          Reflect.ownKeys(files).forEach(async (fileKey) => {
            if (fileKey.includes('js') || fileKey.includes('json')) {
              let content = files[fileKey].contents.toString()
              if (content.includes('<%')) {
                // console.log('content', content);
                // 渲染数据
                content = await render(content, data)
                // console.log('更改后content', content);

                files[fileKey].contents = Buffer.from(content) //将内容转回buffer
                // console.log('files[fileKey].contents', files[fileKey].contents.toString());
              }
            }
          })
          done()
        })
        .build((err) => {
          if (err) {
            reject()
          } else {
            resolve()
          }
        })
    })
  } else {
    // 对于无需渲染的项目直接拷贝ncp
    ncp(destUrl, project)
  }



  //? 06 执行 npm install
  const run_command = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  // 开启子进程执行命令
  await commandSpawn(run_command, ['install'], { cwd: `./${project}` })

  // 最后模板使用提示
  console.log(`\r\nSuccessfully created project ${chalk.cyan(project)}`)
  console.log(`\r\n  cd ${chalk.cyan(project)}`)
  console.log('  npm run dev\r\n')
}

module.exports = {
  createAction
}

