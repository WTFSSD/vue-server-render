const express = require('express')
const fs = require('fs')
const path = require('path')
const createError = require('http-errors');
const { createBundleRenderer } = require('vue-server-renderer')

/// 创建 node server 实例
const app = express()

/// 开放静态资源目录
app.use('/public/', express.static(path.join(__dirname, './dist/')))

/// 拼接路径
const resolve = file => path.resolve(__dirname, file)

/// 渲染器
let renderer = null

/// 是否是生产环境
const isProd = process.env.NODE_ENV === 'production'

/// 创建渲染器
if (isProd) {
    /// 生产环境
    renderer = createBundleRenderer(require('./dist/vue-ssr-server-bundle.json'), {
        runInNewContext: false,
        template: fs.readFileSync(resolve('./public/index.html'), 'utf-8'),
        clientManifest: require('./dist/vue-ssr-client-manifest.json')
    })
}

/// 渲染成html字符串
const renderToString = ctx => new Promise((resolve, reject) => {
    if (!renderer) reject(new Error('renderer is no ready!'))
    renderer.renderToString(ctx, (error, html) => {
        if (error) return reject(error)
        resolve(html)
    })
})

/// 服务器中间件 主要为了区分静态资源
app.use((request, response, next) => {
    if (/\w+.[js|css|jpg|jpeg|png|gif|map]/.test(request.url)) {
        console.log(`proxy ${request.url}`)
        return response.redirect('/public' + request.url)
    }
    next()
})

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
    // res.status(err.status || 500).send(err.stack)
    next(createError(err))
})
require('./setup-dev-server')(
    app,
    resolve('./public/index.html'),
    (boundle, clientManifest) => {
        console.log('update')
        renderer = createBundleRenderer(boundle, {
            runInNewContext: false,
            template: fs.readFileSync(resolve('./public/index.html'), 'utf-8'),
            clientManifest
        })
    })
    .then(() => {
        console.log('ready')
    })
app.listen(3000, () =>
    console.log('running at 3000')
)
