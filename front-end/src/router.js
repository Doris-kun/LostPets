import Vue from 'vue';
import Router from 'vue-router';

Vue.use(Router);

export default new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    { path: '/',             component: () => import('./views/Home.vue') },
    { path: '/new',          component: () => import('./views/NewPet.vue') },
    { path: '/pet/:id',      component: () => import('./views/PetDetail.vue') },
    { path: '/pet/:id/edit', component: () => import('./views/EditPet.vue') },
    { path: '*',             component: () => import('./views/NotFound.vue') },
  ]
});
