import {initAnalytics} from './shared/analytics'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Vant from 'vant'
import 'vant/lib/index.css'
import App from './App.vue'
import router from './app/router'
import './app/styles/index.css'

initAnalytics()

createApp(App).use(createPinia()).use(router).use(Vant).mount('#app')
