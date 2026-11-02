import {initAnalytics} from './shared/analytics'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Vant from 'vant'
import 'vant/lib/style/base.css'
import 'vant/lib/button/index.css'

import 'vant/lib/dialog/index.css'
import 'vant/lib/field/index.css'
import 'vant/lib/cell/index.css'
import 'vant/lib/cell-group/index.css'
import 'vant/lib/list/index.css'
import 'vant/lib/loading/index.css'
import 'vant/lib/overlay/index.css'
import 'vant/lib/popup/index.css'
import 'vant/lib/slider/index.css'
import 'vant/lib/switch/index.css'
import 'vant/lib/toast/index.css'
import App from './App.vue'
import router from './app/router'
import './app/styles/index.css'

initAnalytics()

createApp(App).use(createPinia()).use(router).use(Vant).mount('#app')
