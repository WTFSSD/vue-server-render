const path = require('path')
const MFS = require('memory-fs')
const webpack = require('webpack')
process.env.WEBPACK_TARGET = 'node'
const webpackConfig = require('@vue/cli-service/webpack.config')
const Http = require('http')
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
    const readyPromise = new Promise((resolve, reject) =>  { ready = resolve })
  
    const clientHotReload = () => {
        webpackConfig.entry.app = ['webpack-hot-middleware/client', webpackConfig.entry.app]
        webpackConfig.plugins.push(
            new webpack.HotModuleReplacementPlugin(),
            new webpack.NoEmitOnErrorsPlugin()
        )
        const clientCompiler = webpack(webpackConfig)
        const devMiddleware = require('webpack-dev-middleware')(clientCompiler, {
            publicPath: webpackConfig.output.publicPath,
            noInfo: true
        })
        server.use(devMiddleware)
        server.use(require('webpack-hot-middleware')(clientCompiler, { heartbeat: 5000 }))
        clientCompiler.plugin('done', stats => {
            stats = stats.toJson()
            stats.errors.forEach(err => console.error(err))
            stats.warnings.forEach(err => console.warn(err))
            if (stats.errors.length) return
            clientManifest = JSON.parse(readFile(
                devMiddleware.fileSystem,
                'vue-ssr-client-manifest.json'
            ))
            update()
        })
    }

    const serverHotReload = () => {
        const serverCompiler = webpack(webpackConfig)
        serverCompiler.outputFileSystem = mfs
        serverCompiler.watch({}, (error, stats) => {
            if (error) return
            stats = stats.toJson()
            try {
                bundle = JSON.parse(readFile(
                    mfs,
                    'vue-ssr-server-bundle.json'
                ))
                Http.get('http://127.0.0.1:8082/vue-ssr-client-manifest.json', (res) => {
                    res.setEncoding('utf8')
                    let rawData = ''
                    res.on('data', (chunk) => { rawData += chunk })
                    res.on('end', () => {
                        try {
                            const parsedData = JSON.parse(rawData)
                            clientManifest = parsedData
                            update()
                        } catch (e) {
                          
                        }
                    })
                })
            } catch (e) { }
        })
    }
    const update = () => {
        if (bundle && clientManifest) {
            ready()
            cb(bundle, clientManifest, template)
        }
    }
    // template = fs.readFileSync(templatePath, 'utf-8')

    // clientHotReload()

    serverHotReload()
    return readyPromise
}
