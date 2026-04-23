<template>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">

    <!-- Page header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900 tracking-tight">{{ pageTitle }}</h1>
      <p class="text-sm text-gray-400 mt-1">
        {{ loading ? $t('home.loading') : `${total} ${$t('home.results')}` }}
      </p>
    </div>

    <!-- Filter bar -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 mb-10 space-y-3">
      <!-- Type tabs -->
      <div class="flex items-center gap-2 flex-wrap">
        <button v-for="tab in typeTabs" :key="tab.value"
          @click="setType(tab.value)"
          :class="filters.type === tab.value ? tab.activeClass : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'"
          class="px-4 py-2 rounded-full text-sm font-medium transition-all">
          {{ $t(tab.labelKey) }}
        </button>
      </div>
      <!-- Species + search -->
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="flex items-center gap-2">
          <button v-for="s in speciesTabs" :key="s.value"
            @click="setSpecies(s.value)"
            :class="filters.species === s.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
            class="px-4 py-2 rounded-full text-sm font-medium transition-all">
            {{ $t(s.labelKey) }}
          </button>
        </div>
        <input v-model="filters.area" @input="debounceFetch" type="text"
          :placeholder="$t('filter.area')"
          class="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent placeholder-gray-400"/>
      </div>
      <!-- Days + sort -->
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-1.5">
          <button v-for="d in daysTabs" :key="d.value"
            @click="setDays(d.value)"
            :class="filters.days === d.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
            class="px-3 py-1.5 rounded-full text-xs font-medium transition-all">
            {{ $t(d.labelKey) }}
          </button>
        </div>
        <select v-model="filters.sort" @change="fetchPets"
          class="border border-gray-200 rounded-full px-3 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white cursor-pointer">
          <option value="newest">{{ $t('sort.newest') }}</option>
          <option value="oldest">{{ $t('sort.oldest') }}</option>
        </select>
      </div>
    </div>

    <!-- Skeleton loaders -->
    <div v-if="loading">
      <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse mb-5">
        <div class="flex flex-col sm:flex-row">
          <div class="sm:w-3/5 aspect-video sm:aspect-[16/9] bg-gray-200"></div>
          <div class="sm:w-2/5 p-6 space-y-4">
            <div class="h-3 bg-gray-200 rounded-full w-1/3"></div>
            <div class="h-6 bg-gray-200 rounded-full w-3/4"></div>
            <div class="h-4 bg-gray-200 rounded-full w-1/2"></div>
            <div class="h-4 bg-gray-200 rounded-full w-2/3"></div>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div v-for="i in 3" :key="i" class="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
          <div class="aspect-[4/3] bg-gray-200"></div>
          <div class="p-4 space-y-2.5">
            <div class="h-4 bg-gray-200 rounded-full w-3/4"></div>
            <div class="h-3 bg-gray-200 rounded-full w-1/2"></div>
            <div class="h-3 bg-gray-200 rounded-full w-2/3"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="pets.length === 0" class="text-center py-28">
      <div class="w-16 h-16 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <p class="text-gray-700 font-semibold text-base">{{ $t('home.empty') }}</p>
      <p class="text-gray-400 text-sm mt-1">{{ $t('home.emptySub') }}</p>
      <router-link to="/new" class="mt-5 inline-flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-orange-600 transition-colors">
        {{ $t('home.postNow') }}
      </router-link>
    </div>

    <!-- Content -->
    <div v-else>
      <!-- Featured card -->
      <router-link :to="`/pet/${featured._id}`"
        class="group block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 mb-5">
        <div class="flex flex-col sm:flex-row">
          <div class="relative sm:w-3/5 aspect-video overflow-hidden bg-gray-100">
            <img v-if="featured.image" :src="featured.image" :alt="featured.breed"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
            <div v-else class="w-full h-full flex items-center justify-center">
              <svg class="w-16 h-16 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <span :class="featured.resolved ? 'bg-teal-500' : featured.type === 'lost' ? 'bg-rose-500' : 'bg-emerald-500'"
              class="absolute top-4 left-4 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
              {{ $t(featured.resolved ? 'badge.resolved' : featured.type === 'lost' ? 'badge.lost' : 'badge.found') }}
            </span>
          </div>
          <div class="sm:w-2/5 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <p class="text-xs font-bold text-orange-500 uppercase tracking-widest mb-3">{{ $t('home.featured') }}</p>
              <h2 class="text-2xl font-bold text-gray-900 leading-tight mb-1">{{ featured.name || featured.breed }}</h2>
              <p class="text-sm text-gray-400 mb-3">{{ featured.species }} · {{ featured.breed }}</p>
              <div class="flex items-center gap-1.5 mb-4">
                <svg class="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <p class="text-sm text-gray-500">{{ featured.area }}</p>
              </div>
              <p v-if="featured.description" class="text-sm text-gray-400 leading-relaxed line-clamp-3">{{ featured.description }}</p>
            </div>
            <div class="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
              <p class="text-xs text-gray-400">{{ relativeTime(featured.date) }}</p>
              <span class="text-sm font-semibold text-orange-500 group-hover:text-orange-600 transition-colors">{{ $t('home.view') }}</span>
            </div>
          </div>
        </div>
      </router-link>

      <!-- More reports grid -->
      <div v-if="rest.length > 0">
        <h2 class="text-lg font-bold text-gray-900 mb-4">{{ $t('home.more') }}</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <router-link v-for="pet in rest" :key="pet._id" :to="`/pet/${pet._id}`"
            class="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div class="relative aspect-[4/3] overflow-hidden bg-gray-100">
              <img v-if="pet.image" :src="pet.image" :alt="pet.breed"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
              <div v-else class="w-full h-full flex items-center justify-center">
                <svg class="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
              <span :class="pet.resolved ? 'bg-teal-500' : pet.type === 'lost' ? 'bg-rose-500' : 'bg-emerald-500'"
                class="absolute top-3 left-3 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                {{ $t(pet.resolved ? 'badge.resolved' : pet.type === 'lost' ? 'badge.lost' : 'badge.found') }}
              </span>
            </div>
            <div class="p-4">
              <h3 class="font-bold text-gray-900 text-base leading-tight">{{ pet.name || pet.breed }}</h3>
              <p class="text-sm text-gray-400 mt-0.5">{{ pet.species }} · {{ pet.breed }}</p>
              <div class="flex items-center gap-1 mt-1.5">
                <svg class="w-3.5 h-3.5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <p class="text-sm text-gray-400 truncate">{{ pet.area }}</p>
              </div>
              <div class="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                <p class="text-xs text-gray-400">{{ relativeTime(pet.date) }}</p>
                <p v-if="pet.postId" class="text-xs text-gray-300 font-mono">{{ pet.postId }}</p>
              </div>
            </div>
          </router-link>
        </div>
      </div>

      <!-- Load more / end -->
      <div class="mt-8 text-center">
        <button v-if="total > pets.length" @click="loadMore" :disabled="loadingMore"
          class="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-6 py-2.5 rounded-full text-sm font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50">
          <svg v-if="loadingMore" class="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          {{ loadingMore ? $t('home.loadingMore') : $t('home.loadMore') }}
        </button>
        <p v-else-if="pets.length > 0" class="text-sm text-gray-400">{{ $t('home.noMore') }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import api from '../api';

export default {
  name: 'Home',
  data() {
    return {
      pets: [],
      total: 0,
      skip: 0,
      limit: 9,
      loading: false,
      loadingMore: false,
      areaTimer: null,
      filters: { type: '', species: '', area: '', sort: 'newest', days: '' },
      typeTabs: [
        { value: '',      labelKey: 'filter.all',   activeClass: 'bg-gray-900 text-white' },
        { value: 'lost',  labelKey: 'filter.lost',  activeClass: 'bg-rose-500 text-white' },
        { value: 'found', labelKey: 'filter.found', activeClass: 'bg-emerald-500 text-white' },
      ],
      speciesTabs: [
        { value: '',    labelKey: 'filter.allSpecies' },
        { value: 'Chó', labelKey: 'filter.dog' },
        { value: 'Mèo', labelKey: 'filter.cat' },
      ],
      daysTabs: [
        { value: '',   labelKey: 'filter.days.all' },
        { value: '7',  labelKey: 'filter.days.7' },
        { value: '30', labelKey: 'filter.days.30' },
      ],
    };
  },
  computed: {
    pageTitle() {
      if (this.filters.type === 'lost')  return this.$t('home.lost');
      if (this.filters.type === 'found') return this.$t('home.found');
      return this.$t('home.all');
    },
    featured() { return this.pets[0] || null; },
    rest()     { return this.pets.slice(1); },
  },
  watch: {
    '$route.query'(q) {
      this.filters.type = q.type || '';
      this.fetchPets();
    },
  },
  created() {
    this.filters.type = this.$route.query.type || '';
    this.fetchPets();
  },
  methods: {
    setType(type) {
      this.filters.type = type;
      this.$router.replace({ path: '/', query: type ? { type } : {} }).catch(() => {});
    },
    setSpecies(species) { this.filters.species = species; this.fetchPets(); },
    setDays(days)       { this.filters.days = days;       this.fetchPets(); },
    debounceFetch() {
      clearTimeout(this.areaTimer);
      this.areaTimer = setTimeout(() => this.fetchPets(), 400);
    },
    buildParams(skip = 0) {
      const p = { skip, limit: this.limit, sort: this.filters.sort };
      if (this.filters.type)    p.type    = this.filters.type;
      if (this.filters.species) p.species = this.filters.species;
      if (this.filters.area)    p.area    = this.filters.area;
      if (this.filters.days)    p.days    = this.filters.days;
      return p;
    },
    async fetchPets() {
      this.loading = true;
      this.skip = 0;
      try {
        const { data } = await api.getPets(this.buildParams(0));
        this.pets  = data.pets;
        this.total = data.total;
      } catch {
        this.pets  = [];
        this.total = 0;
      } finally {
        this.loading = false;
      }
    },
    async loadMore() {
      this.loadingMore = true;
      this.skip += this.limit;
      try {
        const { data } = await api.getPets(this.buildParams(this.skip));
        this.pets.push(...data.pets);
        this.total = data.total;
      } catch {
        this.skip -= this.limit;
      } finally {
        this.loadingMore = false;
      }
    },
    relativeTime(date) {
      const diff = Date.now() - new Date(date).getTime();
      const m = Math.floor(diff / 60000);
      const h = Math.floor(diff / 3600000);
      const d = Math.floor(diff / 86400000);
      if (this.$lang === 'vi') {
        if (m < 1)  return 'Vừa xong';
        if (m < 60) return `${m} phút trước`;
        if (h < 24) return `${h} giờ trước`;
        if (d < 30) return `${d} ngày trước`;
      } else {
        if (m < 1)  return 'Just now';
        if (m < 60) return `${m}m ago`;
        if (h < 24) return `${h}h ago`;
        if (d < 30) return `${d}d ago`;
      }
      return new Date(date).toLocaleDateString(this.$lang === 'en' ? 'en-GB' : 'vi-VN', { day: 'numeric', month: 'short', year: 'numeric' });
    },
  },
};
</script>
