const path = require('path')
const MFS = require('memory-fs')
const fs = require('fs')
const webpack = require('webpack')
const Http = require('http')
process.env.WEBPACK_TARGET = 'node'

const VueSSRClientPlugin = require('vue-server-renderer/client-plugin')

const webpackConfig = require('@vue/cli-service/webpack.config')
/**
 * 读取文件配置
 * @param {Object} fs
 * @param {string} file
 */
const readFile = (fs, file) => {
    try {
        return fs.readFileSync(path.join(webpackConfig.output.path, file), 'utf-8')
    } catch (e) {
        console.log('读取文件错误：', e.stack)
    }
}

/// 是否是生产环境
const isProd = process.env.NODE_ENV === 'production'

console.log('生产环境', isProd)

const mfs = new MFS()
// 监听
module.exports = (server, templatePath, cb) => {
    let ready = null
    let template = null
    let bundle
    let clientManifest
    const readyPromise = new Promise((resolve, reject) => { ready = resolve })
  
    const getClientManifest = () => {
        let _resolve = null
        const p = new Promise((resolve) => { _resolve = resolve })
        Http.get('http://127.0.0.1:8081/vue-ssr-client-manifest.json', (res) => {
            let body = ''
            res.setEncoding('utf8')
            res.on('data', (chunk) => {
                body += chunk
            })
            res.on('end', () => {
                try {
                    clientManifest = JSON.parse(body)
                    _resolve()
                } catch (e) {
                    console.error(e)
                }
            })
        })
        return p
    }

    const serverHotReload = () => {
        const serverCompiler = webpack(webpackConfig)
        serverCompiler.outputFileSystem = mfs
        serverCompiler.watch({}, (error, stats) => {
            if (error) return
            try {
                bundle = JSON.parse(readFile(
                    mfs,
                    'vue-ssr-server-bundle.json'
                ))
                update()
            } catch (e) { }
        })
    }
    const update = () => {
        if (bundle && clientManifest) {
            ready()
            cb(bundle, clientManifest, template, mfs)
        }
    }
    template = fs.readFileSync(templatePath, 'utf-8')

    getClientManifest().then(serverHotReload)
    return readyPromise
}
