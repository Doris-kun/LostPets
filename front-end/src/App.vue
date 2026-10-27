<template>
  <div id="app" class="min-h-screen bg-white">
    <nav class="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <!-- Logo -->
        <router-link to="/" class="flex items-center gap-2.5">
          <img src="/logo.png" alt="Lost Pets" class="w-9 h-9"/>
          <span class="text-lg font-bold text-gray-900 tracking-tight">Lost Pets</span>
        </router-link>

        <!-- Right side -->
        <div class="flex items-center gap-1 sm:gap-2">
          <!-- Nav links (hidden on mobile) -->
          <router-link
            :to="{ path: '/', query: { type: 'lost' } }"
            class="hidden sm:inline-flex px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            :class="$route.path === '/' && $route.query.type === 'lost'
              ? 'bg-rose-50 text-rose-600'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'"
          >
            {{ $t('nav.lost') }}
          </router-link>
          <router-link
            :to="{ path: '/', query: { type: 'found' } }"
            class="hidden sm:inline-flex px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            :class="$route.path === '/' && $route.query.type === 'found'
              ? 'bg-emerald-50 text-emerald-600'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'"
          >
            {{ $t('nav.found') }}
          </router-link>

          <!-- Language switcher -->
          <div class="flex items-center bg-gray-100 rounded-full p-0.5 ml-1">
            <button
              @click="$setLang('vi')"
              :class="$lang === 'vi' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'"
              class="px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
            >
              VI
            </button>
            <button
              @click="$setLang('en')"
              :class="$lang === 'en' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'"
              class="px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
            >
              EN
            </button>
          </div>

          <!-- Tài khoản: gom vào một nút avatar, thanh menu đỡ chật -->
          <router-link v-if="!auth.isLoggedIn()" to="/login"
            class="px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors">
            {{ $t('auth.loginBtn') }}
          </router-link>

          <div v-else class="relative ml-1" ref="account">
            <button @click="menuOpen = !menuOpen"
              class="flex items-center gap-1.5 p-0.5 pr-1.5 rounded-full border-2 transition-all"
              :class="menuOpen ? 'border-orange-300 bg-orange-50' : 'border-transparent hover:bg-gray-50'"
              :aria-expanded="String(menuOpen)" aria-haspopup="true">
              <span
                class="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 text-white text-sm font-bold flex items-center justify-center shrink-0">
                {{ initials }}
              </span>
              <svg class="w-3.5 h-3.5 text-gray-400 transition-transform" :class="menuOpen ? 'rotate-180' : ''"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            <div v-if="menuOpen"
              class="absolute right-0 mt-2 w-60 bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden z-50">
              <div class="px-4 py-3 border-b border-gray-50">
                <p class="text-sm font-bold text-gray-900 truncate">{{ auth.user.name }}</p>
                <p class="text-xs text-gray-400 truncate">{{ auth.user.email }}</p>
              </div>

              <router-link to="/me" @click.native="menuOpen = false"
                class="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                :class="$route.path === '/me' ? 'text-orange-600 bg-orange-50/60 font-semibold' : 'text-gray-600 hover:bg-gray-50'">
                <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                </svg>
                {{ $t('mine.link') }}
              </router-link>

              <router-link v-if="auth.isAdmin()" to="/admin" @click.native="menuOpen = false"
                class="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                :class="$route.path === '/admin' ? 'text-violet-600 bg-violet-50/60 font-semibold' : 'text-gray-600 hover:bg-gray-50'">
                <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
                {{ $t('admin.link') }}
              </router-link>

              <div class="border-t border-gray-50">
                <button @click="logout"
                  class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                  <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                  </svg>
                  {{ $t('auth.logout') }}
                </button>
              </div>
            </div>
          </div>

          <!-- CTA -->
          <router-link
            to="/new"
            class="ml-1 inline-flex items-center gap-1.5 bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-orange-600 transition-all shadow-sm hover:shadow-orange-200 hover:shadow-md"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
            </svg>
            <span class="hidden sm:inline">{{ $t('nav.post') }}</span>
          </router-link>
        </div>
      </div>
    </nav>
    <main>
      <router-view />
    </main>
    <Toast />
    <ChatWidget />
  </div>
</template>

<script>
import Toast from './components/Toast.vue';
import ChatWidget from './components/ChatWidget.vue';
import auth from './auth';
export default {
  name: 'App',
  components: { Toast, ChatWidget },
  data() {
    return { auth, menuOpen: false };
  },
  computed: {
    // Chữ cái đầu của tên, tối đa hai chữ: "Phạm Thái Nam" -> "PN".
    initials() {
      const name = (auth.user && auth.user.name) || '';
      const parts = name.trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) return '?';
      if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    },
  },
  watch: {
    // Chuyển trang thì đóng menu, tránh nó còn mở lơ lửng trên trang mới.
    $route() { this.menuOpen = false; },
  },
  mounted() {
    document.addEventListener('click', this.closeOnOutside);
    document.addEventListener('keydown', this.closeOnEscape);
  },
  beforeDestroy() {
    document.removeEventListener('click', this.closeOnOutside);
    document.removeEventListener('keydown', this.closeOnEscape);
  },
  methods: {
    closeOnOutside(e) {
      const el = this.$refs.account;
      if (this.menuOpen && el && !el.contains(e.target)) this.menuOpen = false;
    },
    closeOnEscape(e) {
      if (e.key === 'Escape') this.menuOpen = false;
    },
    logout() {
      this.menuOpen = false;
      auth.logout();
      this.$toast(this.$t('auth.loggedOut'));
      if (this.$route.path.startsWith('/me') || this.$route.path.startsWith('/admin')) this.$router.push('/');
    },
  },
};
</script>
