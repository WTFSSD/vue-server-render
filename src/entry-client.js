import { createApp } from './main'
const { app, router } = createApp()

console.log('entry-client has been call!')
router.onReady(() => {
    app.$mount('#app')
})
