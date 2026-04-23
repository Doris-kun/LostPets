<template>
  <div id="app" class="min-h-screen bg-white">
    <nav class="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <!-- Logo -->
        <router-link to="/" class="flex items-center gap-2.5">
          <div class="w-8 h-8 bg-gradient-to-br from-orange-400 to-rose-500 rounded-lg flex items-center justify-center shadow-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M4.5 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm15 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM7 6.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm10 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM12 22c4 0 7-2.686 7-6 0-1.56-.87-2.985-2.315-4.073C15.692 10.925 13.916 10.5 12 10.5s-3.692.425-4.685 1.427C5.87 13.015 5 14.44 5 16c0 3.314 3 6 7 6z"/>
            </svg>
          </div>
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
  </div>
</template>

<script>
import Toast from './components/Toast.vue';
export default {
  name: 'App',
  components: { Toast },
};
</script>
