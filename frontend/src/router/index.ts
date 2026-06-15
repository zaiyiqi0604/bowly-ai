import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomePage },
    { path: '/practice', component: () => import('../pages/PracticePage.vue') },
    { path: '/report', component: () => import('../pages/ParentReportPage.vue') },
    { path: '/demo', component: () => import('../pages/DemoPage.vue') },
  ],
})

export default router
