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
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            {{ $t('map.label') }} <span class="text-gray-400 font-normal text-xs">{{ $t('form.optional') }}</span>
          </label>
          <MapPicker :lat="form.lat" :lng="form.lng" @change="setPoint"/>
          <p class="text-xs text-gray-400 mt-1.5 leading-relaxed">{{ $t('map.hint') }}</p>
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
            {{ $t('secret.label') }} <span class="text-gray-400 font-normal text-xs">{{ $t('form.optional') }}</span>
          </label>
          <input v-model="form.secretDetail" type="text" :placeholder="$t('secret.placeholder')" maxlength="200"
            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent transition"/>
          <p class="text-xs text-amber-600 mt-1.5 leading-relaxed">{{ $t('secret.hint') }}</p>
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

          <!-- AI chạy ngầm ngay khi chọn ảnh, không chặn người dùng gõ tiếp -->
          <div v-if="image" class="mt-2.5 min-h-[1.5rem]">
            <p v-if="aiLoading" class="flex items-center gap-1.5 text-xs text-violet-500">
              <svg class="w-3.5 h-3.5 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
              </svg>
              {{ $t('ai.working') }}
            </p>

            <p v-else-if="aiResult" class="flex items-center gap-1.5 text-xs text-violet-700">
              <svg class="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clip-rule="evenodd"/>
              </svg>
              {{ $t('ai.filled') }}
              <span class="font-semibold">{{ aiResult.confidence }}%</span>
            </p>

            <p v-else-if="aiError" class="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
              <span>{{ aiError }}</span>
              <button type="button" @click="analyzeImage"
                class="font-semibold text-violet-600 hover:underline">{{ $t('ai.retry') }}</button>
            </p>
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
import MapPicker from '../components/MapPicker.vue';
import claim from '../claim';

export default {
  name: 'NewPet',
  components: { MapPicker },
  data() {
    return {
      form: { type: 'lost', name: '', species: '', breed: '', color: '', area: '', contact: '', description: '', secretDetail: '', lat: null, lng: null },
      image: null, preview: null, loading: false, error: '', showSpeciesError: false,
      aiLoading: false, aiError: '', aiResult: null, aiRun: 0, gone: false,
    };
  },
  beforeDestroy() {
    this.gone = true;
  },
  methods: {
    setPoint({ lat, lng }) {
      this.form.lat = lat;
      this.form.lng = lng;
    },
    handleImage(e) {
      const file = e.target.files[0];
      if (!file) return;
      this.image = file;
      this.preview = URL.createObjectURL(file);
      this.aiResult = null;
      this.aiError = '';
      // Chạy ngay, không chờ người dùng bấm gì. Họ cứ gõ tiếp các ô khác,
      // kết quả về lúc nào thì điền vào chỗ còn trống lúc đó.
      this.analyzeImage();
    },
    async analyzeImage() {
      if (!this.image) return;
      // Người dùng có thể đổi ảnh khi lượt trước chưa xong. Đánh số từng lượt
      // để kết quả cũ về muộn không ghi đè kết quả của ảnh mới.
      const runId = (this.aiRun += 1);
      const file = this.image;

      this.aiLoading = true;
      this.aiError = '';
      this.aiResult = null;
      try {
        const formData = new FormData();
        formData.append('image', file);
        const { data } = await api.analyzeImage(formData);
        if (runId !== this.aiRun || this.gone) return;

        // Chỉ điền vào ô còn trống. Người dùng gõ trong lúc chờ thì giữ nguyên
        // thứ họ gõ — AI là phần thêm vào, không phải thứ ghi đè.
        if (!this.form.species && data.species !== 'Khác') this.form.species = data.species;
        if (!this.form.breed) this.form.breed = data.breed;
        if (!this.form.color) this.form.color = data.color;
        if (!this.form.description) this.form.description = data.description;
        this.aiResult = data;
        this.showSpeciesError = false;
      } catch (err) {
        if (runId !== this.aiRun || this.gone) return;
        const status = err.response && err.response.status;
        if (status === 422) this.aiError = this.$t('ai.notPet');
        else if (status === 504 || status === 429) this.aiError = this.$t('ai.busy');
        else this.aiError = this.$t('ai.error');
      } finally {
        if (runId === this.aiRun) this.aiLoading = false;
      }
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
        const { data } = await api.createPet(formData);
        // Mã chỉ trả về đúng lần này, lưu ngay để người đăng sửa/xoá được sau.
        claim.save(data._id, data.claimCode);
        this.$toast(`${this.$t('claim.saved')} ${data.claimCode}`);
        this.$router.push('/');
      } catch (err) {
        const status = err.response && err.response.status;
        const message = err.response && err.response.data && err.response.data.message;
        // 413 là ảnh vượt giới hạn dung lượng — nói thẳng để người dùng biết
        // phải đổi ảnh, chứ không phải lỗi chung chung của máy chủ.
        if (status === 413) this.error = message || this.$t('form.tooLarge');
        else this.error = this.$t('form.error');
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>
