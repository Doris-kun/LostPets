<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 py-10">
    <div class="mb-6 flex items-end justify-between gap-3 flex-wrap">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">{{ $t('mine.title') }}</h1>
        <p class="text-sm text-gray-400 mt-1">{{ $t('mine.subtitle') }}</p>
      </div>
      <router-link to="/new"
        class="inline-flex items-center gap-1.5 bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-orange-600 transition-all shadow-sm">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
        </svg>
        {{ $t('nav.post') }}
      </router-link>
    </div>

    <!-- Thẻ tóm tắt -->
    <div v-if="pets.length" class="grid grid-cols-3 gap-3 mb-6">
      <div v-for="card in summary" :key="card.label"
        class="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
        <p class="text-2xl font-bold" :class="card.color">{{ card.value }}</p>
        <p class="text-xs text-gray-400 mt-0.5">{{ card.label }}</p>
      </div>
    </div>

    <p v-if="loading" class="text-sm text-gray-400 text-center py-12">{{ $t('mine.loading') }}</p>

    <div v-else-if="!pets.length" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
      <p class="text-sm text-gray-500">{{ $t('mine.empty') }}</p>
      <router-link to="/new" class="inline-block mt-3 text-sm font-semibold text-orange-600 hover:underline">
        {{ $t('mine.emptyAction') }}
      </router-link>
    </div>

    <div v-else class="space-y-3">
      <div v-for="pet in pets" :key="pet._id"
        class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-4 items-start">
        <router-link :to="`/pet/${pet._id}`" class="shrink-0">
          <img v-if="pet.image" :src="pet.image" :alt="pet.breed" class="w-24 h-24 rounded-xl object-cover"/>
          <!-- Ô 96px, chữ "Chưa có ảnh" không vừa nên chỉ để dấu chân. -->
          <div class="w-24 h-24 rounded-xl overflow-hidden" v-else>
            <NoPhoto :type="pet.type" :resolved="pet.resolved" :label="false"/>
          </div>
        </router-link>

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-white text-[11px] font-bold px-2 py-0.5 rounded-full"
              :class="pet.resolved ? 'bg-teal-500' : pet.type === 'lost' ? 'bg-rose-500' : 'bg-emerald-500'">
              {{ $t(pet.resolved ? 'badge.resolved' : pet.type === 'lost' ? 'badge.lost' : 'badge.found') }}
            </span>
            <span class="text-xs text-gray-300 font-mono">{{ pet.postId }}</span>
          </div>
          <router-link :to="`/pet/${pet._id}`"
            class="block text-base font-bold text-gray-900 mt-1 hover:text-orange-600 transition-colors">
            {{ pet.name || pet.breed }}
          </router-link>
          <p class="text-xs text-gray-400 mt-0.5">{{ pet.color }} · {{ pet.area }} · {{ formatDate(pet.date) }}</p>

          <div class="flex items-center gap-2 mt-3">
            <button v-if="!pet.resolved" @click="resolve(pet)" :disabled="busyId === pet._id"
              class="border-2 border-teal-200 text-teal-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-teal-50 disabled:opacity-50 transition-all">
              {{ $t('detail.resolve') }}
            </button>
            <router-link :to="`/pet/${pet._id}/edit`"
              class="border-2 border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all">
              {{ $t('detail.edit') }}
            </router-link>
            <button @click="remove(pet)" :disabled="busyId === pet._id"
              class="text-rose-500 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-rose-50 disabled:opacity-50 transition-all">
              {{ $t('detail.delete') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import api from '../api';
import NoPhoto from '../components/NoPhoto.vue';

export default {
  name: 'MyPets',
  components: { NoPhoto },
  data() {
    return { pets: [], loading: false, busyId: null };
  },
  computed: {
    summary() {
      const resolved = this.pets.filter((p) => p.resolved).length;
      return [
        { label: this.$t('mine.total'), value: this.pets.length, color: 'text-gray-900' },
        { label: this.$t('mine.open'), value: this.pets.length - resolved, color: 'text-orange-500' },
        { label: this.$t('mine.resolved'), value: resolved, color: 'text-teal-500' },
      ];
    },
  },
  created() { this.fetch(); },
  methods: {
    async fetch() {
      this.loading = true;
      try {
        const { data } = await api.myPets();
        this.pets = data.pets;
      } catch {
        this.pets = [];
      } finally {
        this.loading = false;
      }
    },
    async resolve(pet) {
      if (!confirm(this.$t('detail.resolveConfirm'))) return;
      this.busyId = pet._id;
      try {
        const { data } = await api.updatePet(pet._id, { resolved: true });
        Object.assign(pet, data);
        this.$toast(this.$t('detail.resolvedBanner'));
      } catch {
        this.$toast(this.$t('form.saveError'), 'error');
      } finally {
        this.busyId = null;
      }
    },
    async remove(pet) {
      if (!confirm(this.$t('detail.confirm'))) return;
      this.busyId = pet._id;
      try {
        await api.deletePet(pet._id);
        this.pets = this.pets.filter((p) => p._id !== pet._id);
        this.$toast(this.$t('delete.success'));
      } catch {
        this.$toast(this.$t('form.saveError'), 'error');
      } finally {
        this.busyId = null;
      }
    },
    formatDate(date) {
      const locale = this.$lang === 'en' ? 'en-GB' : 'vi-VN';
      return new Date(date).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    },
  },
};
</script>
