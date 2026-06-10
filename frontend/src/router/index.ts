import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import PracticePage from '../pages/PracticePage.vue'
import ParentReportPage from '../pages/ParentReportPage.vue'
import DemoPage from '../pages/DemoPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomePage },
    { path: '/practice', component: PracticePage },
    { path: '/report', component: ParentReportPage },
    { path: '/demo', component: DemoPage },
  ],
})

export default router
