const express = require('express')
const fs = require('fs')
const path = require('path')
const createError = require('http-errors')
const { createBundleRenderer } = require('vue-server-renderer')

let _fs = fs
/// 创建 node server 实例
const app = express()
/// 拼接路径
const resolve = file => path.resolve(__dirname, file)

/// 开放静态资源目录
app.use(express.static(resolve('./dist')))
/// 渲染器
let renderer = null


/// 是否是生产环境
const isProd = process.env.NODE_ENV === 'production'

/// 渲染成html字符串
const renderToString = ctx => new Promise((resolve, reject) => {
    if (!renderer) reject(new Error('renderer is no ready!'))
    renderer.renderToString(ctx, (error, html) => {
        if (error) return reject(error)
        resolve(html)
    })
})

/// 创建渲染器
if (isProd) {
    /// 生产环境
    renderer = createBundleRenderer(require('./dist/vue-ssr-server-bundle.json'), {
        runInNewContext: false,
        template: _fs.readFileSync(resolve('./public/index.html'), 'utf-8'),
        clientManifest: require('./dist/vue-ssr-client-manifest.json')
    })
} else {
    require('./setup-dev-server')(
        app,
        resolve('./public/index.html'),
        (boundle, clientManifest, tpl, fileSys) => {
            console.log('update')
            _fs = fileSys
            renderer = createBundleRenderer(boundle, {
                runInNewContext: false,
                template: tpl,
                clientManifest
            })
        })
        .then(() => {
            console.log('ready')
        })
}

/// 主要的路由逻辑
app.get('*', (request, response, next) => {
    const ctx = {
        url: request.url,
        title: 'vue-ssr-render'
    }
    renderToString(ctx)
        .then(html => {
            response.send(html)
        })
        .catch(next)
})

/// error handler
app.use((err, req, res, next) => {
    next(createError(err))
})
app.listen(1234, () =>
    console.log('running at 3000')
)
