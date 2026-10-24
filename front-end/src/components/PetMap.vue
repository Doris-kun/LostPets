<template>
  <div>
    <div ref="map" :class="height" class="w-full rounded-2xl border border-gray-100 overflow-hidden z-0"></div>
    <p v-if="withoutCoords > 0" class="text-xs text-gray-400 mt-2">
      {{ withoutCoords }} {{ $t('map.withoutCoords') }}
    </p>
  </div>
</template>

<script>
import L, { addTiles, pinIcon, colorForPet, DEFAULT_CENTER, DEFAULT_ZOOM } from '../map';

export default {
  name: 'PetMap',
  props: {
    pets: { type: Array, default: () => [] },
    height: { type: String, default: 'h-[28rem]' },
  },
  computed: {
    located() {
      return this.pets.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    },
    withoutCoords() {
      return this.pets.length - this.located.length;
    },
  },
  mounted() {
    this.map = L.map(this.$refs.map).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    addTiles(this.map);
    this.layer = L.layerGroup().addTo(this.map);
    this.draw();
    this.$nextTick(() => this.map.invalidateSize());
  },
  beforeDestroy() {
    if (this.map) this.map.remove();
  },
  watch: {
    pets() { this.draw(); },
  },
  methods: {
    draw() {
      if (!this.map) return;
      this.layer.clearLayers();
      if (this.located.length === 0) return;

      this.located.forEach((pet) => {
        L.marker([pet.lat, pet.lng], { icon: pinIcon(colorForPet(pet)) })
          .addTo(this.layer)
          .bindPopup(this.popupHtml(pet))
          .on('popupopen', () => {
            const el = document.getElementById(`go-${pet._id}`);
            if (el) el.onclick = () => this.$router.push(`/pet/${pet._id}`);
          });
      });

      // Khung nhìn tự ôm hết các điểm, khỏi phải tự kéo tìm.
      this.map.fitBounds(L.latLngBounds(this.located.map((p) => [p.lat, p.lng])), {
        padding: [40, 40],
        maxZoom: 15,
      });
    },
    // Popup của Leaflet nhận HTML thuần, không dùng được template của Vue.
    popupHtml(pet) {
      const esc = (t) => String(t || '').replace(/[&<>"]/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      const img = pet.image
        ? `<img src="${esc(pet.image)}" alt="" style="width:100%;height:80px;object-fit:cover;border-radius:8px;margin-bottom:6px"/>`
        : '';
      return `
        <div style="min-width:150px">
          ${img}
          <div style="font-weight:700;color:#111827">${esc(pet.name || pet.breed)}</div>
          <div style="font-size:11px;color:#9ca3af;margin-bottom:6px">${esc(pet.color)} · ${esc(pet.area)}</div>
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
