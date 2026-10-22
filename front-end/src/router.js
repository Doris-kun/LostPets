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
    { path: '/admin',        component: () => import('./views/Admin.vue'), meta: { requiresAdmin: true } },
    { path: '/login',        component: () => import('./views/Login.vue') },
    { path: '/register',     component: () => import('./views/Register.vue') },
    { path: '*',             component: () => import('./views/NotFound.vue') },
  ]
});

// Vào trang cần đăng nhập mà chưa đăng nhập thì đẩy sang /login,
// nhớ đường cũ để đăng nhập xong quay lại đúng chỗ.
router.beforeEach((to, from, next) => {
  const meta = to.meta || {};
  if ((meta.requiresAuth || meta.requiresAdmin) && !auth.isLoggedIn()) {
    next({ path: '/login', query: { next: to.fullPath } });
  } else if (meta.requiresAdmin && !auth.isAdmin()) {
    // Đã đăng nhập nhưng không phải quản trị viên: không lộ trang, đẩy về trang chủ.
    next('/');
  } else {
    next();
  }
});

export default router;
