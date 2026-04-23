<template>
  <div class="max-w-2xl mx-auto px-4 sm:px-6 py-10">
    <div class="mb-8">
      <router-link to="/" class="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
        {{ $t('new.back') }}
      </router-link>
      <h1 class="text-2xl font-bold text-gray-900 mt-3 tracking-tight">{{ $t('new.title') }}</h1>
      <p class="text-sm text-gray-400 mt-1">{{ $t('new.subtitle') }}</p>
    </div>

    <form @submit.prevent="submit" class="space-y-4">

      <!-- General -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">{{ $t('form.general') }}</p>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">{{ $t('form.status') }}</label>
          <div class="flex gap-3">
            <button type="button" @click="form.type = 'lost'"
              :class="form.type === 'lost' ? 'bg-rose-500 text-white border-rose-500 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-rose-300'"
              class="flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all">
              {{ $t('form.lostBtn') }}
            </button>
            <button type="button" @click="form.type = 'found'"
              :class="form.type === 'found' ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-300'"
              class="flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all">
              {{ $t('form.foundBtn') }}
            </button>
          </div>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">{{ $t('form.species') }}</label>
          <div class="flex gap-3">
            <button type="button" @click="form.species = 'Chó'"
              :class="form.species === 'Chó' ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-amber-300'"
              class="flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all">
              {{ $t('form.dog') }}
            </button>
            <button type="button" @click="form.species = 'Mèo'"
              :class="form.species === 'Mèo' ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-amber-300'"
              class="flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all">
              {{ $t('form.cat') }}
            </button>
          </div>
          <p v-if="showSpeciesError" class="text-xs text-rose-500 mt-1.5">{{ $t('form.speciesError') }}</p>
        </div>
      </div>

      <!-- Pet Info -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">{{ $t('form.petInfo') }}</p>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1.5">
            {{ $t('form.name') }} <span class="text-gray-400 font-normal text-xs">{{ $t('form.optional') }}</span>
          </label>
          <input v-model="form.name" type="text" :placeholder="$t('form.namePh')"
            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition"/>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1.5">{{ $t('form.breed') }}</label>
          <input v-model="form.breed" type="text" :placeholder="$t('form.breedPh')" required
            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition"/>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1.5">{{ $t('form.color') }}</label>
          <input v-model="form.color" type="text" :placeholder="$t('form.colorPh')" required
            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition"/>
        </div>
      </div>

      <!-- Location & Contact -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">{{ $t('form.locationContact') }}</p>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1.5">{{ $t('form.area') }}</label>
          <input v-model="form.area" type="text" :placeholder="$t('form.areaPh')" required
            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition"/>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1.5">{{ $t('form.contact') }}</label>
          <input v-model="form.contact" type="text" :placeholder="$t('form.contactPh')" required
            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition"/>
        </div>
      </div>

      <!-- Details -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">{{ $t('form.details') }}</p>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1.5">{{ $t('form.desc') }}</label>
          <textarea v-model="form.description" rows="3" :placeholder="$t('form.descPh')"
            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent resize-none transition"></textarea>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1.5">
            {{ $t('form.photo') }} <span class="text-gray-400 font-normal text-xs">{{ $t('form.optional') }}</span>
          </label>
          <div @click="$refs.fileInput.click()"
            class="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-orange-300 hover:bg-orange-50/50 transition-all">
            <img v-if="preview" :src="preview" class="mx-auto max-h-52 rounded-xl object-cover mb-3"/>
            <div v-else class="py-4">
              <svg class="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <p class="text-sm text-gray-400">{{ $t('form.photoUpload') }}</p>
            </div>
            <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleImage"/>
          </div>
        </div>
      </div>

      <div v-if="error" class="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
        <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        {{ error }}
      </div>

      <button type="submit" :disabled="loading"
        class="w-full bg-orange-500 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-orange-600 disabled:opacity-50 transition-all shadow-sm hover:shadow-orange-200 hover:shadow-lg">
        {{ loading ? $t('form.submitting') : $t('form.submit') }}
      </button>
    </form>
  </div>
</template>

<script>
import api from '../api';

export default {
  name: 'NewPet',
  data() {
    return {
      form: { type: 'lost', name: '', species: '', breed: '', color: '', area: '', contact: '', description: '' },
      image: null, preview: null, loading: false, error: '', showSpeciesError: false,
    };
  },
  methods: {
    handleImage(e) {
      const file = e.target.files[0];
      if (!file) return;
      this.image = file;
      this.preview = URL.createObjectURL(file);
    },
    async submit() {
      if (!this.form.species) { this.showSpeciesError = true; return; }
      this.showSpeciesError = false;
      this.error = '';
      this.loading = true;
      try {
        const formData = new FormData();
        Object.entries(this.form).forEach(([k, v]) => formData.append(k, v));
        if (this.image) formData.append('image', this.image);
        await api.createPet(formData);
        this.$toast(this.$t('new.success'));
        this.$router.push('/');
      } catch {
        this.error = this.$t('form.error');
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>
