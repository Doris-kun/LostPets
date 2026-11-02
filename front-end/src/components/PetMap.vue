<template>
  <div>
    <!-- Thanh điều khiển chỉ dành cho bản đồ duyệt tin ở trang chủ. Bản đồ một
         tin ở trang chi tiết không cần, nên mặc định tắt. -->
    <div v-if="controls" class="flex items-center gap-2 mb-2 flex-wrap">
      <button type="button" @click="locateMe" :disabled="locating"
        class="inline-flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:border-orange-300 hover:text-orange-600 disabled:opacity-50 transition-all">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
        {{ locating ? $t('map.locating') : $t('map.nearMe') }}
      </button>

      <select v-if="me" v-model.number="radiusKm"
        class="border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-semibold text-gray-600 bg-white focus:outline-none focus:border-orange-300">
        <option v-for="km in radiusChoices" :key="km" :value="km">{{ km }} km</option>
      </select>

      <span class="text-xs text-gray-400 ml-auto">{{ summary }}</span>
    </div>

    <div ref="map" :class="height" class="w-full rounded-2xl border border-gray-100 overflow-hidden z-0"></div>

    <p v-if="geoError" class="text-xs text-rose-500 mt-1.5">{{ geoError }}</p>
    <p v-if="capped" class="text-xs text-amber-600 mt-1.5">{{ $t('map.capped') }}</p>
    <p v-if="unlocated > 0" class="text-xs text-gray-400 mt-2">
      {{ unlocated }} {{ $t('map.withoutCoords') }}
    </p>
  </div>
</template>

<script>
import L, {
  addTiles, pinIcon, colorForPet, clusterByScreen, clusterIcon, meIcon,
  distanceKm, AREA_RADIUS_M, DEFAULT_CENTER, DEFAULT_ZOOM, NEAR_ZOOM, RADIUS_CHOICES_KM,
} from '../map';

// Dưới mức này, vòng tròn 500m nhỏ hơn một pixel nên chỉ làm bẩn màn hình.
const CIRCLE_FROM_ZOOM = 13;

// Mức thu nhỏ dùng để dò xem tin đang tụ ở đâu, khi chưa biết người dùng ở đâu.
const DENSITY_ZOOM = 10;

const ME_KEY = 'map:me';

export default {
  name: 'PetMap',
  props: {
    pets: { type: Array, default: () => [] },
    height: { type: String, default: 'h-[28rem]' },
    // Bật nút "gần tôi" và gom nhóm. Trang chi tiết tin để nguyên mặc định.
    controls: { type: Boolean, default: false },
    // Số tin khớp bộ lọc nhưng không ghim vị trí. Server đếm giúp vì nó đã lọc
    // bỏ những tin đó trước khi gửi về, ở đây không tự suy ra được.
    unlocatedCount: { type: Number, default: null },
    capped: { type: Boolean, default: false },
  },
  data() {
    return {
      me: null,
      radiusKm: 5,
      radiusChoices: RADIUS_CHOICES_KM,
      locating: false,
      geoError: '',
    };
  },
  computed: {
    located() {
      return this.pets.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    },
    unlocated() {
      if (this.unlocatedCount !== null) return this.unlocatedCount;
      return this.pets.length - this.located.length;
    },
    nearby() {
      if (!this.me) return [];
      return this.located.filter(
        (p) => distanceKm(this.me[0], this.me[1], p.lat, p.lng) <= this.radiusKm
      );
    },
    summary() {
      return this.me
        ? this.$t('map.nearbyCount', { n: this.nearby.length, km: this.radiusKm })
        : this.$t('map.locatedCount', { n: this.located.length });
    },
  },
  mounted() {
    this.map = L.map(this.$refs.map).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    addTiles(this.map);
    this.layer = L.layerGroup().addTo(this.map);
    this.meLayer = L.layerGroup().addTo(this.map);

    if (this.controls) {
      // Nhóm được gom theo khoảng cách trên màn hình, nên đổi mức thu phóng là
      // phải gom lại từ đầu.
      this.map.on('zoomend', this.draw);
      this.openWhereItMatters();
    }

    this.draw();
    this.$nextTick(() => this.map.invalidateSize());
  },
  beforeDestroy() {
    if (this.map) this.map.remove();
  },
  watch: {
    pets() { this.draw(); },
    me() { this.drawMe(); this.draw(); },
    radiusKm() { this.drawMe(); },
  },
  methods: {
    // Bản đồ mở ra ở đâu là quyết định quan trọng nhất của cả tính năng này.
    // Ôm hết mọi tin thì khi tin trải từ Cần Thơ tới Hà Nội, màn hình thu về
    // mức cả nước và không nói được gì — càng nhiều tin càng vô dụng. Nên:
    // chỗ người dùng đang đứng trước, không có thì tới chỗ đang có nhiều tin.
    openWhereItMatters() {
      const saved = this.readSavedMe();
      if (saved) {
        this.me = saved;
        this.map.setView(saved, NEAR_ZOOM);
      } else {
        this.map.setView(this.densestPoint(), DEFAULT_ZOOM);
      }
      this.autoLocate();
    },
    densestPoint() {
      if (this.located.length === 0) return DEFAULT_CENTER;
      const groups = clusterByScreen(this.map, this.located, DENSITY_ZOOM);
      const biggest = groups.reduce((a, b) => (b.members.length > a.members.length ? b : a));
      return [biggest.lat, biggest.lng];
    },
    readSavedMe() {
      try {
        const raw = JSON.parse(localStorage.getItem(ME_KEY) || 'null');
        return Array.isArray(raw) && raw.length === 2 && raw.every(Number.isFinite) ? raw : null;
      } catch {
        return null;
      }
    },
    // Chỉ tự định vị khi trình duyệt đã được cho phép từ trước. Tự xin quyền
    // ngay lúc mở bản đồ là ném một hộp thoại vào mặt người mới vào xem.
    async autoLocate() {
      if (this.me || !navigator.geolocation || !navigator.permissions) return;
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' });
        if (status.state === 'granted') this.locateMe();
      } catch {
        // Trình duyệt không hỗ trợ hỏi quyền thì cứ để người dùng tự bấm nút.
      }
    },
    locateMe() {
      if (!navigator.geolocation) {
        this.geoError = this.$t('map.noGeolocation');
        return;
      }
      this.locating = true;
      this.geoError = '';
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.locating = false;
          const here = [pos.coords.latitude, pos.coords.longitude];
          this.me = here;
          this.map.setView(here, NEAR_ZOOM);
          // Nhớ lại để lần sau bản đồ mở ra đúng chỗ ngay, khỏi chờ định vị.
          // Chỉ nằm trong trình duyệt của chính người đó, không gửi lên server.
          try { localStorage.setItem(ME_KEY, JSON.stringify(here)); } catch { /* chế độ ẩn danh */ }
        },
        () => {
          this.locating = false;
          this.geoError = this.$t('map.denied');
        },
        { timeout: 10000 }
      );
    },
    drawMe() {
      if (!this.meLayer) return;
      this.meLayer.clearLayers();
      if (!this.me) return;
      L.circle(this.me, {
        radius: this.radiusKm * 1000,
        color: '#3b82f6', weight: 1, opacity: 0.4,
        fillColor: '#3b82f6', fillOpacity: 0.05,
      }).addTo(this.meLayer);
      L.marker(this.me, { icon: meIcon(), interactive: false }).addTo(this.meLayer);
    },
    draw() {
      if (!this.map) return;
      this.layer.clearLayers();
      if (this.located.length === 0) return;

      if (!this.controls) {
        this.located.forEach((pet) => this.drawPet(pet, true));
        // Một tin, hoặc vài tin của cùng một trang — ôm hết là đúng ở đây.
        this.map.fitBounds(L.latLngBounds(this.located.map((p) => [p.lat, p.lng])), {
          padding: [40, 40],
          maxZoom: 14,
        });
        return;
      }

      const zoom = this.map.getZoom();
      clusterByScreen(this.map, this.located, zoom).forEach((group) => {
        if (group.members.length === 1) {
          this.drawPet(group.members[0], zoom >= CIRCLE_FROM_ZOOM);
          return;
        }
        L.marker([group.lat, group.lng], { icon: clusterIcon(group.members) })
          .addTo(this.layer)
          // Bấm vào chấm gộp thì phóng vừa đủ để tách chùm đó ra, chứ không
          // nhảy một mạch tới mức tối đa rồi người dùng mất phương hướng.
          .on('click', () => {
            this.map.fitBounds(
              L.latLngBounds(group.members.map((p) => [p.lat, p.lng])),
              { padding: [60, 60], maxZoom: zoom + 3 }
            );
          });
      });
    },
    drawPet(pet, withArea) {
      const color = colorForPet(pet);
      if (withArea) {
        // Toạ độ đã được làm mờ về lưới ~500m, nên vẽ vùng mới đúng với
        // độ chính xác mình thật sự có. Một chấm nhỏ ngụ ý chính xác hơn sự thật.
        L.circle([pet.lat, pet.lng], {
          radius: AREA_RADIUS_M,
          color, weight: 1, opacity: 0.5,
          fillColor: color, fillOpacity: 0.12,
        }).addTo(this.layer);
      }
      L.marker([pet.lat, pet.lng], { icon: pinIcon(color) })
        .addTo(this.layer)
        .bindPopup(this.popupHtml(pet))
        .on('popupopen', () => {
          const el = document.getElementById(`go-${pet._id}`);
          if (el) el.onclick = () => this.$router.push(`/pet/${pet._id}`);
        });
    },
    // Popup của Leaflet nhận HTML thuần, không dùng được template của Vue.
    popupHtml(pet) {
      const esc = (t) => String(t || '').replace(/[&<>"]/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      const img = pet.image
        ? `<img src="${esc(pet.image)}" alt="" style="width:100%;height:80px;object-fit:cover;border-radius:8px;margin-bottom:6px"/>`
        : '';
      const away = this.me
        ? `<div style="font-size:11px;color:#3b82f6;font-weight:600;margin-bottom:4px">${
            distanceKm(this.me[0], this.me[1], pet.lat, pet.lng).toFixed(1)} km</div>`
        : '';
      return `
        <div style="min-width:150px">
          ${img}
          <div style="font-weight:700;color:#111827">${esc(pet.name || pet.breed)}</div>
          <div style="font-size:11px;color:#9ca3af;margin-bottom:6px">${esc(pet.color)} · ${esc(pet.area)}</div>
          ${away}
          <button id="go-${pet._id}" style="
            width:100%;background:#f97316;color:#fff;border:0;border-radius:8px;
            padding:5px 0;font-size:12px;font-weight:600;cursor:pointer">
            ${esc(this.$t('map.viewPost'))}
          </button>
        </div>`;
    },
  },
};
</script>
