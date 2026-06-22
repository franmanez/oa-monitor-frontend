import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'institutions',
      component: () => import('@/views/InstitutionsView.vue')
    },
    {
      path: '/institution/:id',
      name: 'institution-detail',
      component: () => import('@/views/InstitutionDetailView.vue')
    },
    {
      path: '/ranking',
      name: 'ranking',
      component: () => import('@/views/RankingView.vue')
    }
  ]
})

export default router
