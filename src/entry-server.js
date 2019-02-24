import { createApp } from './main'

export default ctx => {
    console.log('entry-server has been call!', ctx)
    return new Promise((resolve, reject) => {
        const { app, router } = createApp()
        router.push(ctx.url)
        router.onReady(() => {
            const matchedComponents = router.getMatchedComponents()
            if (!matchedComponents || matchedComponents.length <= 0) {
                const error = new Error('not match any router!')
                error.code = 404
                return reject(error)
            }
            resolve(app)
        }, reject)
    })
}
