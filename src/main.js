import Vue from 'vue'
import App from './App.vue'
import { createRouter } from './router'

Vue.config.productionTip = false

/**
 * SSR 模式下 需要渲染一个新的vue实例
 * @param {object} ctx
 */
export const createApp = (ctx) => {
    const router = createRouter()
    const app = new Vue({
        router,
        render: h => h(App)
    })
    return { app, router }
}
