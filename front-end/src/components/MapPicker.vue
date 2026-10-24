<template>
  <div>
    <div ref="map" class="h-56 w-full rounded-xl border border-gray-200 overflow-hidden z-0"></div>

    <div class="flex items-center gap-2 mt-2 flex-wrap">
      <button type="button" @click="useMyLocation" :disabled="locating"
        class="inline-flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:border-orange-300 hover:text-orange-600 disabled:opacity-50 transition-all">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
        {{ locating ? $t('map.locating') : $t('map.useMyLocation') }}
      </button>

      <button v-if="hasPoint" type="button" @click="clear"
        class="text-xs font-semibold text-gray-400 hover:text-rose-600 px-2 py-1.5 transition-colors">
        {{ $t('map.clear') }}
      </button>

      <span class="text-xs text-gray-400 ml-auto">
        {{ hasPoint ? $t('map.picked') : $t('map.tapToPick') }}
      </span>
    </div>

    <p class="text-xs text-amber-600 mt-2 leading-relaxed">{{ $t('map.privacyNote') }}</p>
    <p v-if="error" class="text-xs text-rose-500 mt-1.5">{{ error }}</p>
  </div>
</template>

<script>
import L, { addTiles, pinIcon, DEFAULT_CENTER, DEFAULT_ZOOM } from '../map';

export default {
  name: 'MapPicker',
  props: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  data() {
    return { locating: false, error: '' };
  },
  computed: {
    hasPoint() {
      return Number.isFinite(this.lat) && Number.isFinite(this.lng);
    },
  },
  mounted() {
    const center = this.hasPoint ? [this.lat, this.lng] : DEFAULT_CENTER;
    this.map = L.map(this.$refs.map).setView(center, this.hasPoint ? 16 : DEFAULT_ZOOM);
    addTiles(this.map);

    this.map.on('click', (e) => this.setPoint(e.latlng.lat, e.latlng.lng));
    if (this.hasPoint) this.drawMarker(this.lat, this.lng);

    // Bản đồ nằm trong form có thể được dựng lúc khung chưa có kích thước thật.
    this.$nextTick(() => this.map.invalidateSize());
  },
  beforeDestroy() {
    if (this.map) this.map.remove();
  },
  watch: {
    // Dữ liệu từ ngoài đổ vào sau, ví dụ form sửa tin tải xong mới có toạ độ.
    lat() { this.syncFromProps(); },
    lng() { this.syncFromProps(); },
  },
  methods: {
    syncFromProps() {
      if (!this.map) return;
      if (this.hasPoint) {
        this.drawMarker(this.lat, this.lng);
        this.map.setView([this.lat, this.lng], 16);
      } else if (this.marker) {
        this.map.removeLayer(this.marker);
        this.marker = null;
      }
    },
    drawMarker(lat, lng) {
      if (this.marker) {
        this.marker.setLatLng([lat, lng]);
        return;
      }
      this.marker = L.marker([lat, lng], { icon: pinIcon(), draggable: true }).addTo(this.map);
      this.marker.on('dragend', () => {
        const p = this.marker.getLatLng();
        this.emit(p.lat, p.lng);
      });
    },
    setPoint(lat, lng) {
      this.drawMarker(lat, lng);
      this.emit(lat, lng);
    },
    emit(lat, lng) {
      // Làm tròn 6 chữ số, đủ chính xác tới khoảng 10cm, khỏi lưu số dài vô ích.
      this.error = '';
      this.$emit('change', { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
    },
    clear() {
      if (this.marker) {
        this.map.removeLayer(this.marker);
        this.marker = null;
      }
      this.$emit('change', { lat: null, lng: null });
    },
    useMyLocation() {
      if (!navigator.geolocation) {
        this.error = this.$t('map.noGeolocation');
        return;
      }
      this.locating = true;
      this.error = '';
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.locating = false;
          const { latitude, longitude } = pos.coords;
          this.map.setView([latitude, longitude], 16);
          this.setPoint(latitude, longitude);
        },
        () => {
          this.locating = false;
          this.error = this.$t('map.denied');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    },
  },
};
</script>
