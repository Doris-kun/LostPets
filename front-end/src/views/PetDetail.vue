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
        <PetPhoto :src="pet.image" :alt="pet.breed" :type="pet.type" :resolved="pet.resolved"/>
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
      <div v-if="pet.resolved" class="mx-6 mt-6 bg-teal-50 border border-teal-100 rounded-xl px-4 py-3">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-teal-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
          </svg>
          <p class="text-sm font-semibold text-teal-700">{{ $t('detail.resolvedBanner') }}</p>
          <div class="flex-1"></div>
          <!-- Đường lùi lại. Đánh dấu đoàn tụ là hẹn giờ xoá tin, nên bấm nhầm
               mà không gỡ ra được thì người dùng mất tin vì một cú chạm. Ai không
               giữ mã xác nhận thì máy chủ chặn, y như nút Sửa và Xoá bên dưới. -->
          <button @click="unresolvePet" :disabled="resolving"
            class="text-xs font-semibold text-teal-600 underline underline-offset-2 hover:text-teal-800 disabled:opacity-50 flex-shrink-0">
            {{ $t('detail.unresolve') }}
          </button>
        </div>
        <p class="text-xs text-teal-600 mt-1.5 leading-relaxed">{{ $t('detail.resolvedExpiry') }}</p>
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

        <div v-if="hasCoords" class="mt-5">
          <div class="flex items-center justify-between gap-3 mb-2 flex-wrap">
            <p class="text-xs text-gray-400 font-semibold uppercase tracking-wide">{{ $t('map.where') }}</p>
            <a :href="directionsHref" target="_blank" rel="noopener"
              class="inline-flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:border-orange-300 hover:text-orange-600 transition-all">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
              </svg>
              {{ $t('map.directions') }}
            </a>
          </div>
          <PetMap :pets="[pet]" height="h-56"/>
          <p class="text-xs text-gray-400 mt-2 leading-relaxed">{{ $t('map.approxNote') }}</p>
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

        <!-- Cảnh báo đặt ngay dưới số liên hệ, đúng lúc người ta sắp gọi -->
        <div class="mx-6 mt-3 flex gap-2.5 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
          <svg class="w-4 h-4 text-rose-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.1c.765-1.36 2.72-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
          <p class="text-xs text-rose-700 leading-relaxed">{{ $t('scam.warning') }}</p>
        </div>

        <!-- Chỉ chủ tin mới nhận được secretDetail từ server, nên chỉ họ thấy ô này -->
        <div v-if="pet.secretDetail" class="mx-6 mt-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <div class="flex items-center gap-1.5 mb-1">
            <svg class="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
            <p class="text-xs font-bold text-amber-700 uppercase tracking-wide">{{ $t('secret.yours') }}</p>
          </div>
          <p class="text-sm text-amber-900 font-medium">{{ pet.secretDetail }}</p>
          <p class="text-xs text-amber-600 mt-1.5 leading-relaxed">{{ $t('secret.howToUse') }}</p>
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

        <!--
          Mã xác nhận chỉ hiện khi trình duyệt này có mã của tin, và phải bấm
          mới hiện. Người dùng bình thường không cần biết nó tồn tại — mã nằm
          sẵn trong localStorage và tự gắn vào mỗi lần sửa. Chỗ này dành cho
          đúng một việc: mang mã sang máy khác.
        -->
        <div v-if="claimCode" class="mt-4 pt-4 border-t border-gray-100">
          <button v-if="!showCode" type="button" @click="showCode = true"
            class="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors">
            {{ $t('claim.view') }}
          </button>

          <div v-else class="space-y-2">
            <p class="text-xs font-semibold text-gray-500">{{ $t('claim.viewTitle') }}</p>
            <div class="flex items-center gap-3 flex-wrap">
              <!-- select-all: bôi đen cả mã chỉ bằng một cú nhấp, phòng khi
                   trình duyệt không cho dùng clipboard. -->
              <code class="font-mono text-base font-bold tracking-[0.2em] text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 select-all">{{ claimCode }}</code>
              <button type="button" @click="copyCode"
                class="text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors">
                {{ copied ? $t('claim.copied') : $t('claim.copy') }}
              </button>
            </div>
            <p class="text-xs text-gray-400 leading-relaxed">{{ $t('claim.viewHint') }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- AI đối chiếu với các tin ngược loại để tìm tin có thể là cùng một con vật -->
    <div v-if="pet && !pet.resolved" class="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p class="text-sm font-bold text-gray-900">{{ $t('match.title') }}</p>
          <p class="text-xs text-gray-400 mt-0.5">{{ $t('match.subtitle') }}</p>
        </div>
        <button @click="findMatches" :disabled="matchLoading"
          class="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:from-violet-600 hover:to-indigo-600 disabled:opacity-50 transition-all shadow-sm">
          <svg v-if="matchLoading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
          </svg>
          {{ matchLoading ? $t('match.searching') : $t('match.action') }}
        </button>
      </div>

      <div v-if="matches.length" class="mt-4 space-y-3">
        <router-link v-for="m in matches" :key="m.pet._id" :to="`/pet/${m.pet._id}`"
          class="flex gap-3 items-start border border-gray-100 rounded-xl p-3 hover:border-violet-200 hover:bg-violet-50/40 transition-all">
          <img v-if="m.pet.image" :src="m.pet.image" :alt="m.pet.breed"
            class="w-20 h-20 rounded-lg object-cover flex-shrink-0"/>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-semibold text-gray-900">{{ m.pet.breed }}</span>
              <span class="text-xs text-gray-400">{{ m.pet.area }}</span>
              <span class="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                :class="m.score >= 70 ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'">
                {{ m.score }}%
              </span>
            </div>
            <p class="text-xs text-gray-500 mt-1 leading-relaxed">{{ m.reason }}</p>
          </div>
        </router-link>
      </div>

      <p v-else-if="matchDone && !matchError" class="text-sm text-gray-400 mt-4 text-center py-3">
        {{ $t('match.none') }}
      </p>
      <p v-if="matchError" class="text-sm text-rose-500 mt-4 text-center">{{ matchError }}</p>
    </div>

    <!-- Báo cáo tin xấu. Để cuối trang và cố ý nhạt màu: đây là lối thoát hiểm,
         không phải việc người xem bình thường cần làm. -->
    <div v-if="pet" class="text-center mt-6">
      <span v-if="reported" class="inline-flex items-center gap-1.5 text-xs text-gray-400">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        {{ $t('report.already') }}
      </span>
      <button v-else @click="showReport = true"
        class="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-rose-600 transition-colors">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z"/>
        </svg>
        {{ $t('report.action') }}
      </button>
    </div>

    <ReportDialog v-if="showReport" :pet-id="pet._id" @close="onReportClosed"/>
  </div>
</template>

<script>
import api from '../api';
import PetMap from '../components/PetMap.vue';
import { directionsUrl } from '../map';
import claim from '../claim';
import report from '../report';
import ReportDialog from '../components/ReportDialog.vue';
import PetPhoto from '../components/PetPhoto.vue';

export default {
  name: 'PetDetail',
  components: { PetMap, ReportDialog, PetPhoto },
  data() {
    return {
      pet: null, loading: false, deleting: false, resolving: false,
      matches: [], matchLoading: false, matchError: '', matchDone: false,
      claimCode: '', showCode: false, copied: false,
      showReport: false, reported: false,
    };
  },
  computed: {
    hasCoords() {
      return this.pet && Number.isFinite(this.pet.lat) && Number.isFinite(this.pet.lng);
    },
    directionsHref() {
      return this.hasCoords ? directionsUrl(this.pet.lat, this.pet.lng) : '#';
    },
    contactHref() {
      if (!this.pet) return '#';
      const c = this.pet.contact;
      return /^[\d\s\+\-\(\)]+$/.test(c) ? `tel:${c.replace(/\s/g, '')}` : `mailto:${c}`;
    },
  },
  created() { this.fetchPet(); },
  // Bấm vào một tin trong danh sách gợi ý sẽ đổi :id nhưng vẫn dùng lại
  // component này, created() không chạy lại. Không theo dõi thì trang vẫn
  // hiện tin cũ kèm kết quả đối chiếu cũ.
  watch: {
    '$route.params.id'() {
      this.matches = [];
      this.matchError = '';
      this.matchDone = false;
      // Mã của tin cũ mà còn nằm đây thì người dùng chép nhầm mã sang tin khác.
      this.showCode = false;
      this.copied = false;
      this.fetchPet();
    },
  },
  beforeDestroy() {
    if (this.copyTimer) clearTimeout(this.copyTimer);
  },
  methods: {
    async fetchPet() {
      this.loading = true;
      this.claimCode = claim.get(this.$route.params.id);
      this.reported = report.has(this.$route.params.id);
      try {
        const { data } = await api.getPet(this.$route.params.id);
        this.pet = data;
      } catch {
        this.pet = null;
      } finally {
        this.loading = false;
      }
    },
    onReportClosed(sent) {
      this.showReport = false;
      if (sent) this.reported = true;
    },
    async copyCode() {
      try {
        await navigator.clipboard.writeText(this.claimCode);
        this.copied = true;
        if (this.copyTimer) clearTimeout(this.copyTimer);
        this.copyTimer = setTimeout(() => { this.copied = false; }, 2000);
      } catch {
        // Trình duyệt cũ, hoặc trang không chạy HTTPS, thì không có clipboard.
        // Mã đã để select-all nên vẫn bôi đen một nhấp rồi Ctrl+C được.
      }
    },
    async findMatches() {
      this.matchLoading = true;
      this.matchError = '';
      this.matches = [];
      try {
        const { data } = await api.findMatches(this.pet._id);
        this.matches = data.matches || [];
        this.matchDone = true;
      } catch (err) {
        const status = err.response && err.response.status;
        if (status === 429) this.matchError = this.$t('match.limit');
        else if (status === 504) this.matchError = this.$t('match.busy');
        else this.matchError = this.$t('match.error');
      } finally {
        this.matchLoading = false;
      }
    },
    // 403 nghĩa là trình duyệt này không giữ mã xác nhận của tin.
    claimMessage(err) {
      const status = err.response && err.response.status;
      return status === 403 ? this.$t('claim.denied') : this.$t('form.saveError');
    },
    async deletePet() {
      if (!confirm(this.$t('detail.confirm'))) return;
      this.deleting = true;
      try {
        await api.deletePet(this.pet._id);
        this.$toast(this.$t('delete.success'));
        this.$router.push('/');
      } catch (err) {
        this.deleting = false;
        this.$toast(this.claimMessage(err), 'error');
      }
    },
    async resolvePet() {
      if (!confirm(this.$t('detail.resolveConfirm'))) return;
      this.resolving = true;
      try {
        const { data } = await api.updatePet(this.pet._id, { resolved: true });
        this.pet = data;
        this.$toast(this.$t('detail.resolvedBanner'));
      } catch (err) {
        this.$toast(this.claimMessage(err), 'error');
      } finally {
        this.resolving = false;
      }
    },
    // Gỡ đánh dấu đoàn tụ. Máy chủ xoá luôn resolvedAt nên đồng hồ đếm ngược
    // tới đợt dọn dừng hẳn, không phải tạm hoãn.
    async unresolvePet() {
      if (!confirm(this.$t('detail.unresolveConfirm'))) return;
      this.resolving = true;
      try {
        const { data } = await api.updatePet(this.pet._id, { resolved: false });
        this.pet = data;
        this.$toast(this.$t('detail.unresolved'));
      } catch (err) {
        this.$toast(this.claimMessage(err), 'error');
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
      } catch { /* user cancelled */ }
    },
    formatDate(date) {
      const locale = this.$lang === 'en' ? 'en-GB' : 'vi-VN';
      return new Date(date).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    },
  },
};
</script>
