import Vue from 'vue';
import Router from 'vue-router';
import auth from './auth';

Vue.use(Router);

const router = new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    { path: '/',             component: () => import('./views/Home.vue') },
    { path: '/new',          component: () => import('./views/NewPet.vue') },
    { path: '/pet/:id',      component: () => import('./views/PetDetail.vue') },
    { path: '/pet/:id/edit', component: () => import('./views/EditPet.vue') },
    { path: '/me',           component: () => import('./views/MyPets.vue'), meta: { requiresAuth: true } },
    { path: '/login',        component: () => import('./views/Login.vue') },
    { path: '/register',     component: () => import('./views/Register.vue') },
    { path: '*',             component: () => import('./views/NotFound.vue') },
  ]
});

// Vào trang cần đăng nhập mà chưa đăng nhập thì đẩy sang /login,
// nhớ đường cũ để đăng nhập xong quay lại đúng chỗ.
router.beforeEach((to, from, next) => {
  if (to.meta && to.meta.requiresAuth && !auth.isLoggedIn()) {
    next({ path: '/login', query: { next: to.fullPath } });
  } else {
    next();
  }
});

export default router;
