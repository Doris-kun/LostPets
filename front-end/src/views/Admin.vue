<template>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 py-10">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 tracking-tight">{{ $t('admin.title') }}</h1>
      <p class="text-sm text-gray-400 mt-1">{{ $t('admin.subtitle') }}</p>
    </div>

    <!-- Số liệu tổng quan: con số đứng một mình thì dùng thẻ số, không vẽ biểu đồ -->
    <div v-if="stats" class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      <div v-for="tile in tiles" :key="tile.label"
        class="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5">
        <p class="text-2xl font-bold text-gray-900 tabular-nums">{{ tile.value }}</p>
        <div class="flex items-center gap-1.5 mt-1">
          <span v-if="tile.dot" class="w-2 h-2 rounded-full shrink-0" :class="tile.dot"></span>
          <p class="text-xs text-gray-400">{{ tile.label }}</p>
        </div>
      </div>
    </div>

    <!-- Tỉ lệ đoàn tụ: một con số nổi bật kèm thanh tiến độ -->
    <div v-if="stats" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
      <div class="flex items-baseline gap-2">
        <p class="text-3xl font-bold text-gray-900 tabular-nums">{{ stats.resolvedRate }}%</p>
        <p class="text-sm text-gray-400">{{ $t('admin.resolvedRate') }}</p>
      </div>
      <div class="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div class="h-full rounded-full bg-teal-500 transition-all" :style="{ width: stats.resolvedRate + '%' }"></div>
      </div>
      <p class="text-xs text-gray-400 mt-2">
        {{ stats.resolved }} / {{ stats.total }} {{ $t('admin.resolvedOf') }}
      </p>

      <!-- Chỉ hiện khi thật sự có tin quá hạn. Một dòng "0 tin sắp bị xoá" nằm
           đó mỗi ngày thì chẳng mấy chốc không ai đọc nữa. -->
      <div v-if="stats.pendingCleanup > 0"
           class="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-3">
        <p class="text-xs text-gray-500 flex-1 min-w-[14rem]">
          {{ $t('admin.cleanupDue', { count: stats.pendingCleanup, days: stats.cleanupDays }) }}
        </p>
        <button @click="runCleanup" :disabled="cleaning"
                class="text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
          {{ cleaning ? $t('admin.cleanupRunning') : $t('admin.cleanupNow') }}
        </button>
      </div>
    </div>

    <!-- Hàng chờ báo cáo. Đặt trên bảng tin vì đây là thứ cần người xử lý,
         còn bảng tin chỉ để tra cứu. Ẩn hẳn khi hàng chờ trống. -->
    <div v-if="reports.length" class="bg-white rounded-2xl border border-rose-100 shadow-sm p-5 mb-6">
      <div class="flex items-center gap-2 mb-4">
        <span class="w-2 h-2 rounded-full bg-rose-500"></span>
        <p class="text-sm font-bold text-gray-900">{{ $t('admin.reports') }}</p>
        <span class="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{{ reportTotal }}</span>
      </div>

      <div v-for="r in reports" :key="r._id"
        class="flex gap-3 items-start border border-gray-100 rounded-xl p-3 mb-2">
        <img v-if="r.pet && r.pet.image" :src="r.pet.image" alt=""
          class="w-14 h-14 rounded-lg object-cover flex-shrink-0"/>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">
              {{ $t('report.reason.' + r.reason) }}
            </span>
            <router-link v-if="r.pet" :to="`/pet/${r.pet._id}`"
              class="text-sm font-semibold text-gray-900 hover:text-orange-600 truncate">
              {{ r.pet.breed }} · {{ r.pet.area }}
            </router-link>
            <!-- Tin có thể đã bị xoá bởi chính chủ tin trong lúc báo cáo nằm chờ. -->
            <span v-else class="text-sm text-gray-400 italic">{{ $t('admin.reportPetGone') }}</span>
          </div>
          <p v-if="r.note" class="text-xs text-gray-500 mt-1.5 leading-relaxed break-words">{{ r.note }}</p>
          <p class="text-xs text-gray-300 mt-1 font-mono">{{ r.pet ? r.pet.postId : '' }}</p>
        </div>
        <div class="flex flex-col gap-1.5 flex-shrink-0">
          <button v-if="r.pet" @click="removeReported(r)" :disabled="busyReport === r._id"
            class="text-xs font-medium px-3 py-1.5 rounded-full bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50">
            {{ $t('admin.reportDeletePost') }}
          </button>
          <button @click="dismissReport(r)" :disabled="busyReport === r._id"
            class="text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            {{ $t('admin.reportDismiss') }}
          </button>
        </div>
      </div>

      <button v-if="reports.length < reportTotal" @click="fetchReports(reportPage + 1)"
        class="w-full text-xs font-medium text-gray-500 hover:text-gray-900 py-2">
        {{ $t('home.more') }}
      </button>
    </div>

    <!-- Xếp hạng: thanh ngang một màu, độ dài mang nghĩa, số ghi thẳng ở cuối thanh -->
    <div v-if="stats" class="grid md:grid-cols-2 gap-4 mb-6">
      <div v-for="rank in rankings" :key="rank.title"
        class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p class="text-sm font-bold text-gray-900 mb-3">{{ rank.title }}</p>
        <p v-if="!rank.rows.length" class="text-xs text-gray-400">{{ $t('admin.noData') }}</p>
        <div v-else class="space-y-2.5">
          <div v-for="row in rank.rows" :key="row.label" :title="`${row.label}: ${row.count}`">
            <div class="flex items-baseline justify-between gap-3 mb-1">
              <span class="text-xs text-gray-600 truncate">{{ row.label }}</span>
              <span class="text-xs font-semibold text-gray-900 tabular-nums shrink-0">{{ row.count }}</span>
            </div>
            <div class="h-2 bg-gray-50 rounded-full overflow-hidden">
              <div class="h-full bg-orange-400 rounded-r-full"
                :style="{ width: barWidth(row.count, rank.rows) }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bộ lọc nằm trên bảng, gom một hàng -->
    <div class="flex flex-wrap items-center gap-2 mb-3">
      <select v-model="filters.type" @change="reload"
        class="border border-gray-200 rounded-full px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300">
        <option value="">{{ $t('admin.allTypes') }}</option>
        <option value="lost">{{ $t('filter.lost') }}</option>
        <option value="found">{{ $t('filter.found') }}</option>
      </select>
      <select v-model="filters.resolved" @change="reload"
        class="border border-gray-200 rounded-full px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300">
        <option value="">{{ $t('admin.allStatus') }}</option>
        <option value="false">{{ $t('mine.open') }}</option>
        <option value="true">{{ $t('mine.resolved') }}</option>
      </select>
      <input v-model="filters.q" @input="debounceReload" type="text" :placeholder="$t('admin.search')"
        class="flex-1 min-w-[10rem] border border-gray-200 rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"/>
      <span class="text-xs text-gray-400">{{ total }} {{ $t('admin.posts') }}</span>
    </div>

    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <p v-if="loading" class="text-sm text-gray-400 text-center py-10">{{ $t('mine.loading') }}</p>
      <p v-else-if="!pets.length" class="text-sm text-gray-400 text-center py-10">{{ $t('admin.noPosts') }}</p>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-gray-400 text-xs uppercase tracking-wider">
            <tr>
              <th class="text-left font-semibold px-4 py-2.5">{{ $t('admin.colPost') }}</th>
              <th class="text-left font-semibold px-4 py-2.5 hidden sm:table-cell">{{ $t('admin.colArea') }}</th>
              <th class="text-left font-semibold px-4 py-2.5 hidden md:table-cell">{{ $t('admin.colOwner') }}</th>
              <th class="text-left font-semibold px-4 py-2.5 hidden sm:table-cell">{{ $t('admin.colDate') }}</th>
              <th class="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="pet in pets" :key="pet._id" class="hover:bg-gray-50/60 transition-colors">
              <td class="px-4 py-3">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="w-2 h-2 rounded-full shrink-0"
                    :class="pet.resolved ? 'bg-teal-500' : pet.type === 'lost' ? 'bg-rose-500' : 'bg-emerald-500'"></span>
                  <router-link :to="`/pet/${pet._id}`" class="font-semibold text-gray-900 hover:text-orange-600">
                    {{ pet.name || pet.breed }}
                  </router-link>
                  <span class="text-xs text-gray-300 font-mono">{{ pet.postId }}</span>
                </div>
                <p class="text-xs text-gray-400 mt-0.5">{{ pet.species }} · {{ pet.color }}</p>
              </td>
              <td class="px-4 py-3 text-gray-500 hidden sm:table-cell">{{ pet.area }}</td>
              <td class="px-4 py-3 text-gray-500 hidden md:table-cell">
                <span v-if="pet.owner">{{ pet.owner.name }}</span>
                <span v-else class="text-gray-300">{{ $t('admin.guest') }}</span>
              </td>
              <td class="px-4 py-3 text-gray-400 hidden sm:table-cell whitespace-nowrap">{{ formatDate(pet.date) }}</td>
              <td class="px-4 py-3 text-right">
                <button @click="remove(pet)" :disabled="busyId === pet._id"
                  class="text-rose-500 px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-rose-50 disabled:opacity-50 transition-all">
                  {{ $t('detail.delete') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="pets.length < total" class="text-center mt-4">
      <button @click="loadMore" :disabled="loadingMore"
        class="border-2 border-gray-200 text-gray-600 px-5 py-2 rounded-full text-sm font-semibold hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-all">
        {{ loadingMore ? $t('mine.loading') : $t('home.loadMore') }}
      </button>
    </div>
  </div>
</template>

<script>
import api from '../api';

const PAGE = 20;

export default {
  name: 'Admin',
  data() {
    return {
      stats: null,
      pets: [],
      total: 0,
      loading: false,
      loadingMore: false,
      busyId: null,
      cleaning: false,
      reports: [],
      reportTotal: 0,
      reportPage: 1,
      busyReport: null,
      filters: { type: '', resolved: '', q: '' },
      timer: null,
    };
  },
  computed: {
    tiles() {
      const s = this.stats;
      return [
        { label: this.$t('admin.totalPosts'), value: s.total },
        { label: this.$t('badge.lost'), value: s.lost, dot: 'bg-rose-500' },
        { label: this.$t('badge.found'), value: s.found, dot: 'bg-emerald-500' },
        { label: this.$t('admin.users'), value: s.users },
      ];
    },
    rankings() {
      return [
        { title: this.$t('admin.topAreas'), rows: this.stats.topAreas },
        { title: this.$t('admin.topBreeds'), rows: this.stats.topBreeds },
      ];
    },
  },
  created() {
    this.fetchStats();
    this.fetchReports();
    this.reload();
  },
  methods: {
    // Thanh dài nhất chiếm trọn chiều ngang, các thanh còn lại so theo nó.
    barWidth(count, rows) {
      const max = Math.max(...rows.map((r) => r.count), 1);
      return `${Math.max((count / max) * 100, 4)}%`;
    },
    params(skip = 0) {
      const p = { skip, limit: PAGE };
      if (this.filters.type) p.type = this.filters.type;
      if (this.filters.resolved) p.resolved = this.filters.resolved;
      if (this.filters.q.trim()) p.q = this.filters.q.trim();
      return p;
    },
    async fetchStats() {
      try {
        const { data } = await api.adminStats();
        this.stats = data;
      } catch {
        this.stats = null;
      }
    },
    async reload() {
      this.loading = true;
      try {
        const { data } = await api.adminPets(this.params(0));
        this.pets = data.pets;
        this.total = data.total;
      } catch {
        this.pets = [];
        this.total = 0;
      } finally {
        this.loading = false;
      }
    },
    debounceReload() {
      clearTimeout(this.timer);
      this.timer = setTimeout(this.reload, 350);
    },
    async loadMore() {
      this.loadingMore = true;
      try {
        const { data } = await api.adminPets(this.params(this.pets.length));
        this.pets = this.pets.concat(data.pets);
        this.total = data.total;
      } finally {
        this.loadingMore = false;
      }
    },
    // page = 1 nạp lại từ đầu, page > 1 nối thêm vào cuối.
    async fetchReports(page = 1) {
      try {
        const { data } = await api.adminReports({ page });
        this.reports = page === 1 ? data.reports : [...this.reports, ...data.reports];
        this.reportTotal = data.total;
        this.reportPage = data.page;
      } catch {
        if (page === 1) this.reports = [];
      }
    },
    // Xoá hẳn tin bị báo cáo. Server xoá kèm mọi báo cáo về tin đó, nên không
    // phải dọn tay từng dòng trong hàng chờ.
    async removeReported(r) {
      if (!confirm(this.$t('admin.confirmDelete'))) return;
      this.busyReport = r._id;
      try {
        await api.adminDeletePet(r.pet._id);
        this.$toast(this.$t('delete.success'));
        this.pets = this.pets.filter((p) => p._id !== r.pet._id);
        this.fetchReports();
        this.fetchStats();
      } catch {
        this.$toast(this.$t('form.saveError'), 'error');
      } finally {
        this.busyReport = null;
      }
    },
    // Bỏ qua: xem rồi, tin không sao. Chỉ gỡ dòng báo cáo, tin giữ nguyên.
    async dismissReport(r) {
      this.busyReport = r._id;
      try {
        await api.adminDismissReport(r._id);
        this.reports = this.reports.filter((x) => x._id !== r._id);
        this.reportTotal -= 1;
        this.fetchStats();
      } catch {
        this.$toast(this.$t('form.saveError'), 'error');
      } finally {
        this.busyReport = null;
      }
    },
    async remove(pet) {
      if (!confirm(this.$t('admin.confirmDelete'))) return;
      this.busyId = pet._id;
      try {
        await api.adminDeletePet(pet._id);
        this.pets = this.pets.filter((p) => p._id !== pet._id);
        this.total -= 1;
        this.$toast(this.$t('delete.success'));
        this.fetchStats();
        this.fetchReports();
      } catch {
        this.$toast(this.$t('form.saveError'), 'error');
      } finally {
        this.busyId = null;
      }
    },
    // Chạy đợt dọn ngay thay vì chờ cron. Chủ yếu để kiểm tra rằng nó hoạt động —
    // chờ tới 2 giờ sáng mới biết mình cấu hình sai thì quá chậm.
    async runCleanup() {
      if (!confirm(this.$t('admin.confirmCleanup'))) return;
      this.cleaning = true;
      try {
        const { data } = await api.adminCleanup();
        this.$toast(this.$t('admin.cleanupDone', { count: data.deleted }));
        // Tin vừa xoá có thể đang nằm trong bảng bên dưới, và báo cáo về chúng
        // cũng đã bị xoá theo, nên nạp lại cả ba.
        this.fetchStats();
        this.fetchReports();
        this.reload();
      } catch {
        this.$toast(this.$t('form.saveError'), 'error');
      } finally {
        this.cleaning = false;
      }
    },
    formatDate(date) {
      const locale = this.$lang === 'en' ? 'en-GB' : 'vi-VN';
      return new Date(date).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    },
  },
};
</script>
