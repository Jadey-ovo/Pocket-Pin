import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from '@/modules/home/pages/HomePage.vue'
import StudioPage from '@/modules/studio/pages/StudioPage.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    { path: '/projects', redirect: '/' },
    { path: '/studio/:id', name: 'studio', component: StudioPage },
  ],
})

export default router
