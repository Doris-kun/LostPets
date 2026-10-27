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
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            {{ $t('map.label') }} <span class="text-gray-400 font-normal text-xs">{{ $t('form.optional') }}</span>
          </label>
          <MapPicker :lat="form.lat" :lng="form.lng" @change="setPoint"/>
          <p class="text-xs text-gray-400 mt-1.5 leading-relaxed">{{ $t('map.hint') }}</p>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1.5">{{ $t('form.contact') }}</label>
          <input v-model="form.contact" type="text" required
            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition"/>
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">{{ $t('form.details') }}</p>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1.5">{{ $t('form.desc') }}</label>
          <textarea v-model="form.description" rows="3"
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
            <template v-if="shownPhoto">
              <img :src="shownPhoto" class="mx-auto max-h-52 rounded-xl object-cover mb-3"/>
              <p class="text-sm text-gray-400">{{ $t('form.photoChange') }}</p>
            </template>
            <div v-else class="py-4">
              <svg class="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <p class="text-sm text-gray-400">{{ $t('form.photoUpload') }}</p>
            </div>
            <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleImage"/>
          </div>

          <button v-if="shownPhoto" type="button" @click="dropPhoto"
            class="mt-2 text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors">
            {{ $t('form.photoRemove') }}
          </button>
          <!-- Ảnh chỉ thật sự mất khi bấm Lưu, nên nói rõ và cho đường quay lại. -->
          <p v-else-if="removeImage && currentImage" class="mt-2 text-xs text-gray-400">
            {{ $t('form.photoRemoved') }}
            <button type="button" @click="removeImage = false"
              class="font-semibold text-orange-500 hover:text-orange-600 transition-colors">
              {{ $t('form.undo') }}
            </button>
          </p>
        </div>
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
import MapPicker from '../components/MapPicker.vue';

export default {
  name: 'EditPet',
  components: { MapPicker },
  data() {
    return {
      form: { type: 'lost', name: '', species: '', breed: '', color: '', area: '', contact: '', description: '', secretDetail: '', lat: null, lng: null },
      // currentImage là ảnh đang lưu trên server, image là file mới vừa chọn,
      // removeImage là ý muốn gỡ hẳn ảnh. Tách ba thứ ra vì cả ba trạng thái
      // cùng tồn tại được, và chỉ lúc bấm Lưu mới quyết định gửi gì.
      currentImage: '', image: null, preview: null, removeImage: false,
      loading: false, saving: false, error: '',
    };
  },
  created() { this.fetchPet(); },
  computed: {
    // Ảnh đang hiển thị: ảnh mới chọn đè lên ảnh cũ, còn khi đã bấm xoá thì trống.
    shownPhoto() {
      if (this.preview) return this.preview;
      return this.removeImage ? '' : this.currentImage;
    },
  },
  beforeDestroy() {
    this.releasePreview();
  },
  methods: {
    setPoint({ lat, lng }) {
      this.form.lat = lat;
      this.form.lng = lng;
    },
    // URL.createObjectURL giữ file trong bộ nhớ tới khi được thu hồi. Đổi ảnh
    // vài lần rồi rời trang mà không thu hồi là bỏ lại từng đó file trong RAM.
    releasePreview() {
      if (this.preview) URL.revokeObjectURL(this.preview);
      this.preview = null;
      this.image = null;
    },
    handleImage(e) {
      const file = e.target.files[0];
      if (!file) return;
      this.releasePreview();
      this.image = file;
      this.preview = URL.createObjectURL(file);
      // Chọn ảnh mới thì ý "xoá ảnh" trước đó không còn nghĩa gì.
      this.removeImage = false;
    },
    dropPhoto() {
      // Bấm xoá lúc đang xem ảnh vừa chọn thì chỉ là bỏ lựa chọn đó, quay về
      // ảnh cũ — chứ không phải muốn gỡ ảnh khỏi tin.
      if (this.image) {
        this.releasePreview();
        this.$refs.fileInput.value = '';
        return;
      }
      this.removeImage = true;
    },
    async fetchPet() {
      this.loading = true;
      try {
        const { data } = await api.getPet(this.$route.params.id);
        this.form = {
          type: data.type, name: data.name || '', species: data.species || '',
          breed: data.breed, color: data.color, area: data.area,
          contact: data.contact, description: data.description || '',
          secretDetail: data.secretDetail || '',
          lat: data.lat, lng: data.lng,
        };
        this.currentImage = data.image || '';
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
        // Gửi dạng form thay vì JSON vì có thể kèm file ảnh. Server bỏ qua
        // những trường không cho sửa, nên cứ gửi cả form như lúc đăng tin.
        const formData = new FormData();
        Object.entries(this.form).forEach(([key, value]) => formData.append(key, value));
        if (this.image) formData.append('image', this.image);
        else if (this.removeImage) formData.append('removeImage', 'true');

        await api.updatePet(this.$route.params.id, formData);
        this.$toast(this.$t('edit.success'));
        this.$router.push(`/pet/${this.$route.params.id}`);
      } catch (err) {
        // 403 nghĩa là trình duyệt này không giữ mã xác nhận của tin.
        const status = err.response && err.response.status;
        if (status === 403) this.error = this.$t('claim.denied');
        else if (status === 413) this.error = this.$t('form.tooLarge');
        // 502 là Cloudinary lỗi, không phải tin sai — thử lại là được.
        else if (status === 502) this.error = this.$t('form.imageFailed');
        else this.error = this.$t('form.saveError');
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>
