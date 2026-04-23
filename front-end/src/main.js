import Vue from 'vue';
import App from './App.vue';
import router from './router';
import './assets/tailwind.css';
import { i18nMixin } from './i18n';

Vue.mixin(i18nMixin);
Vue.config.productionTip = false;

new Vue({
  router,
  render: h => h(App)
}).$mount('#app');
