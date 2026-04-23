<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8">
    <router-link to="/" class="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
      </svg>
      {{ $t('detail.back') }}
    </router-link>

    <!-- Skeleton -->
    <div v-if="loading" class="mt-5 bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div class="aspect-video bg-gray-200"></div>
      <div class="p-6 space-y-4">
        <div class="h-6 bg-gray-200 rounded-full w-1/2"></div>
        <div class="h-4 bg-gray-200 rounded-full w-1/3"></div>
        <div class="grid grid-cols-2 gap-3 mt-4">
          <div class="h-20 bg-gray-100 rounded-xl"></div>
          <div class="h-20 bg-gray-100 rounded-xl"></div>
        </div>
      </div>
    </div>

    <!-- Not found -->
    <div v-else-if="!pet" class="mt-6 text-center py-20">
      <p class="text-gray-400">{{ $t('detail.notFound') }}</p>
    </div>

    <!-- Detail -->
    <div v-else class="mt-5 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <!-- Image -->
      <div class="relative aspect-video bg-gray-100">
        <img v-if="pet.image" :src="pet.image" :alt="pet.breed" class="w-full h-full object-cover"/>
        <div v-else class="w-full h-full flex items-center justify-center">
          <svg class="w-20 h-20 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>
        <span :class="pet.resolved ? 'bg-teal-500' : pet.type === 'lost' ? 'bg-rose-500' : 'bg-emerald-500'"
          class="absolute top-4 left-4 text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-md">
          {{ $t(pet.resolved ? 'badge.resolved' : pet.type === 'lost' ? 'badge.lost' : 'badge.found') }}
        </span>
        <span v-if="pet.postId"
          class="absolute top-4 right-4 bg-black/40 backdrop-blur-sm text-white text-xs font-mono px-2.5 py-1.5 rounded-full">
          {{ pet.postId }}
        </span>
      </div>

      <!-- Resolved banner -->
      <div v-if="pet.resolved" class="mx-6 mt-6 flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-xl px-4 py-3">
        <svg class="w-4 h-4 text-teal-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
        </svg>
        <p class="text-sm font-semibold text-teal-700">{{ $t('detail.resolvedBanner') }}</p>
      </div>

      <div class="p-6">
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">{{ pet.name || pet.breed }}</h1>
        <p class="text-gray-400 text-sm mt-1">{{ pet.species }} · {{ pet.breed }} · {{ formatDate(pet.date) }}</p>

        <div class="grid grid-cols-2 gap-3 mt-5">
          <div class="bg-gray-50 rounded-xl p-4">
            <p class="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">{{ $t('detail.color') }}</p>
            <p class="text-gray-800 font-semibold text-sm">{{ pet.color }}</p>
          </div>
          <div class="bg-gray-50 rounded-xl p-4">
            <p class="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">{{ $t('detail.area') }}</p>
            <p class="text-gray-800 font-semibold text-sm">{{ pet.area }}</p>
          </div>
        </div>

        <div v-if="pet.description" class="mt-5">
          <p class="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">{{ $t('detail.desc') }}</p>
          <p class="text-gray-600 text-sm leading-relaxed">{{ pet.description }}</p>
        </div>

        <div class="mt-5 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-xl p-4">
          <p class="text-xs text-orange-400 font-bold uppercase tracking-wide mb-1">{{ $t('detail.contact') }}</p>
          <a :href="contactHref" class="text-gray-900 font-bold text-base hover:text-orange-600 transition-colors">
            {{ pet.contact }}
          </a>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 mt-5 flex-wrap">
          <!-- Share -->
          <button @click="sharePet"
            class="flex items-center gap-1.5 border-2 border-gray-200 text-gray-500 px-4 py-2.5 rounded-xl text-sm font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
            </svg>
            {{ $t('detail.share') }}
          </button>

          <!-- Resolve (only if not yet resolved) -->
          <button v-if="!pet.resolved" @click="resolvePet" :disabled="resolving"
            class="flex items-center gap-1.5 border-2 border-teal-200 text-teal-600 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-50 disabled:opacity-50 transition-all">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {{ $t('detail.resolve') }}
          </button>

          <div class="flex-1"></div>

          <router-link :to="`/pet/${pet._id}/edit`"
            class="border-2 border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all">
            {{ $t('detail.edit') }}
          </router-link>
          <button @click="deletePet" :disabled="deleting"
            class="bg-rose-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-rose-600 disabled:opacity-50 transition-all">
            {{ deleting ? $t('detail.deleting') : $t('detail.delete') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import api from '../api';

export default {
  name: 'PetDetail',
  data() {
    return { pet: null, loading: false, deleting: false, resolving: false };
  },
  computed: {
    contactHref() {
      if (!this.pet) return '#';
      const c = this.pet.contact;
      return /^[\d\s\+\-\(\)]+$/.test(c) ? `tel:${c.replace(/\s/g, '')}` : `mailto:${c}`;
    },
  },
  created() { this.fetchPet(); },
  methods: {
    async fetchPet() {
      this.loading = true;
      try {
        const { data } = await api.getPet(this.$route.params.id);
        this.pet = data;
      } catch {
        this.pet = null;
      } finally {
        this.loading = false;
      }
    },
    async deletePet() {
      if (!confirm(this.$t('detail.confirm'))) return;
      this.deleting = true;
      try {
        await api.deletePet(this.pet._id);
        this.$toast(this.$t('delete.success'));
        this.$router.push('/');
      } catch {
        this.deleting = false;
        this.$toast(this.$t('form.saveError'), 'error');
      }
    },
    async resolvePet() {
      if (!confirm(this.$t('detail.resolveConfirm'))) return;
      this.resolving = true;
      try {
        const { data } = await api.updatePet(this.pet._id, { resolved: true });
        this.pet = data;
        this.$toast(this.$t('detail.resolvedBanner'));
      } catch {
        this.$toast(this.$t('form.saveError'), 'error');
      } finally {
        this.resolving = false;
      }
    },
    async sharePet() {
      const url = window.location.href;
      try {
        if (navigator.share) {
          await navigator.share({ title: this.pet.name || this.pet.breed, url });
        } else {
          await navigator.clipboard.writeText(url);
          this.$toast(this.$t('detail.linkCopied'));
        }
      } catch {
        // user cancelled share or clipboard failed
      }
    },
    formatDate(date) {
      const locale = this.$lang === 'en' ? 'en-GB' : 'vi-VN';
      return new Date(date).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    },
  },
};
</script>
