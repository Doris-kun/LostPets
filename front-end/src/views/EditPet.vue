<template>
  <div class="max-w-2xl mx-auto px-4 sm:px-6 py-10">
    <div class="mb-8">
      <router-link :to="`/pet/${$route.params.id}`" class="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
        {{ $t('edit.back') }}
      </router-link>
      <h1 class="text-2xl font-bold text-gray-900 mt-3 tracking-tight">{{ $t('edit.title') }}</h1>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <form v-else @submit.prevent="submit" class="space-y-4">

      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">{{ $t('form.general') }}</p>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">{{ $t('form.status') }}</label>
          <div class="flex gap-3">
            <button type="button" @click="form.type = 'lost'"
              :class="form.type === 'lost' ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-gray-500 border-gray-200 hover:border-rose-300'"
              class="flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all">
              {{ $t('form.lostBtn') }}
            </button>
            <button type="button" @click="form.type = 'found'"
              :class="form.type === 'found' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-300'"
              class="flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all">
              {{ $t('form.foundBtn') }}
            </button>
          </div>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">{{ $t('form.species') }}</label>
          <div class="flex gap-3">
            <button type="button" @click="form.species = 'Chó'"
              :class="form.species === 'Chó' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-500 border-gray-200 hover:border-amber-300'"
              class="flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all">
              {{ $t('form.dog') }}
            </button>
            <button type="button" @click="form.species = 'Mèo'"
              :class="form.species === 'Mèo' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-500 border-gray-200 hover:border-amber-300'"
              class="flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all">
              {{ $t('form.cat') }}
            </button>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">{{ $t('form.petInfo') }}</p>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1.5">
            {{ $t('form.name') }} <span class="text-gray-400 font-normal text-xs">{{ $t('form.optional') }}</span>
          </label>
          <input v-model="form.name" type="text"
            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition"/>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1.5">{{ $t('form.breed') }}</label>
          <input v-model="form.breed" type="text" required
            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition"/>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1.5">{{ $t('form.color') }}</label>
          <input v-model="form.color" type="text" required
            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition"/>
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">{{ $t('form.locationContact') }}</p>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1.5">{{ $t('form.area') }}</label>
          <input v-model="form.area" type="text" required
            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition"/>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1.5">{{ $t('form.contact') }}</label>
          <input v-model="form.contact" type="text" required
            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition"/>
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{{ $t('form.details') }}</p>
        <label class="block text-sm font-semibold text-gray-700 mb-1.5">{{ $t('form.desc') }}</label>
        <textarea v-model="form.description" rows="3"
          class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent resize-none transition"></textarea>
      </div>

      <div v-if="error" class="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
        <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        {{ error }}
      </div>

      <button type="submit" :disabled="saving"
        class="w-full bg-orange-500 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-orange-600 disabled:opacity-50 transition-all shadow-sm hover:shadow-orange-200 hover:shadow-lg">
        {{ saving ? $t('form.saving') : $t('form.save') }}
      </button>
    </form>
  </div>
</template>

<script>
import api from '../api';

export default {
  name: 'EditPet',
  data() {
    return {
      form: { type: 'lost', name: '', species: '', breed: '', color: '', area: '', contact: '', description: '' },
      loading: false, saving: false, error: '',
    };
  },
  created() { this.fetchPet(); },
  methods: {
    async fetchPet() {
      this.loading = true;
      try {
        const { data } = await api.getPet(this.$route.params.id);
        this.form = {
          type: data.type, name: data.name || '', species: data.species || '',
          breed: data.breed, color: data.color, area: data.area,
          contact: data.contact, description: data.description || '',
        };
      } catch {
        this.error = this.$t('form.saveError');
      } finally {
        this.loading = false;
      }
    },
    async submit() {
      this.error = '';
      this.saving = true;
      try {
        await api.updatePet(this.$route.params.id, this.form);
        this.$toast(this.$t('edit.success'));
        this.$router.push(`/pet/${this.$route.params.id}`);
      } catch {
        this.error = this.$t('form.saveError');
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>
