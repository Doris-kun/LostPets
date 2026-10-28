<template>
  <!-- Dải hỏi lại, nằm ngay dưới thanh menu. Mỗi lần chỉ hỏi MỘT tin: hỏi dồn
       ba bốn tin một lúc thì người ta bấm bừa cho xong, dữ liệu thu về vô nghĩa. -->
  <div v-if="visible" class="bg-teal-50 border-b border-teal-100">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
      <p class="text-sm text-teal-900 flex-1 min-w-[15rem]">
        {{ $t(pet.type === 'found' ? 'nudge.askFound' : 'nudge.askLost', { name: petName, days: ageInDays }) }}
      </p>

      <button @click="markFound" :disabled="saving"
        class="text-sm font-semibold bg-teal-500 text-white px-3.5 py-1.5 rounded-full hover:bg-teal-600 disabled:opacity-50 transition-colors">
        {{ saving ? $t('nudge.saving') : $t('nudge.yes') }}
      </button>

      <button @click="notYet" :disabled="saving"
        class="text-sm font-medium text-teal-700 px-3 py-1.5 rounded-full hover:bg-teal-100 disabled:opacity-50 transition-colors">
        {{ $t('nudge.no') }}
      </button>

      <button @click="later" :disabled="saving" :aria-label="$t('nudge.later')"
        class="text-teal-400 hover:text-teal-700 p-1 rounded-full disabled:opacity-50 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script>
import api from '../api';
import claim from '../claim';
import nudge from '../nudge';

// Tin phải cũ hơn ngần này mới hỏi. Hỏi ngày hôm sau thì vô duyên — người ta
// vừa đăng xong, còn đang tìm.
const ASK_AFTER_DAYS = 7;
// Trả lời "Chưa" thì im bấy nhiêu ngày. Bấm dấu X thì chỉ im một ngày.
const SNOOZE_NO_DAYS = 7;
const SNOOZE_LATER_DAYS = 1;
// Người đăng nhiều tin thì cũng chỉ dò ngần này, để khỏi bắn một loạt request.
const MAX_CHECKED = 5;

export default {
  name: 'ResolveNudge',
  data() {
    return { pet: null, saving: false };
  },
  computed: {
    visible() {
      if (!this.pet) return false;
      // Đang đứng ngay trong tin đó thì thôi — trang chi tiết đã có nút riêng,
      // hiện thêm dải này nữa là hỏi cùng một câu hai lần trên một màn hình.
      return this.$route.params.id !== this.pet._id;
    },
    petName() {
      return this.pet.name || this.pet.breed;
    },
    ageInDays() {
      return Math.floor((Date.now() - new Date(this.pet.date).getTime()) / 86400000);
    },
  },
  created() {
    this.scan();
  },
  methods: {
    async scan() {
      if (!nudge.dueForScan()) return;

      const ids = claim.list().slice(0, MAX_CHECKED).filter((id) => nudge.mayAsk(id));
      if (ids.length === 0) return;
      nudge.markScanned();

      const results = await Promise.allSettled(ids.map((id) => api.getPet(id)));

      const open = [];
      results.forEach((result, i) => {
        const id = ids[i];

        if (result.status === 'rejected') {
          // Tin không còn nữa thì dọn luôn mã trong trình duyệt, khỏi dò lại mãi.
          // Chỉ dọn khi server nói rõ là 404 — mất mạng cũng vào nhánh này, mà
          // xoá mã vì rớt wifi thì người ta mất quyền sửa tin của chính mình.
          const status = result.reason && result.reason.response && result.reason.response.status;
          if (status === 404) {
            claim.remove(id);
            nudge.forget(id);
          }
          return;
        }

        const pet = result.value.data;
        if (!pet || pet.resolved) return;
        if (Date.now() - new Date(pet.date).getTime() < ASK_AFTER_DAYS * 86400000) return;
        open.push(pet);
      });

      // Hỏi tin cũ nhất trước: nó treo lâu nhất nên khả năng đã xong là cao nhất.
      open.sort((a, b) => new Date(a.date) - new Date(b.date));
      this.pet = open[0] || null;
    },

    async markFound() {
      this.saving = true;
      try {
        await api.updatePet(this.pet._id, { resolved: true });
        this.$toast(this.$t('nudge.thanks'));
        this.pet = null;
      } catch {
        // Hỏng thì để nguyên dải đó cho họ bấm lại, đừng nuốt mất câu trả lời.
        this.$toast(this.$t('form.saveError'), 'error');
      } finally {
        this.saving = false;
      }
    },

    notYet() {
      nudge.snooze(this.pet._id, SNOOZE_NO_DAYS);
      this.pet = null;
    },

    later() {
      nudge.snooze(this.pet._id, SNOOZE_LATER_DAYS);
      this.pet = null;
    },
  },
};
</script>
