/*
 * Bản đồ dùng chung — hằng số, và trang HTML Leaflet nhúng vào WebView.
 *
 * TẠI SAO LÀ WEBVIEW CHỨ KHÔNG PHẢI THƯ VIỆN BẢN ĐỒ THẬT?
 *
 * react-native-maps là cách "chuẩn" hơn, nhưng nó gọi tới Google Maps SDK:
 * phải xin khoá API, khai báo khoá trong app.json, và khoá đó đi kèm thẻ tín
 * dụng. Với một bài tập ở trường thì vướng cả ba.
 *
 * Nhúng Leaflet vào WebView thì KHÔNG cần khoá, không cần tài khoản, không
 * giới hạn lượt xem. Web của nhóm cũng đang dùng Leaflet nên hai bên giống nhau.
 *
 * Đổi lại: phải nói chuyện với bản đồ qua postMessage thay vì gọi hàm trực
 * tiếp. Đó là lý do file này trả về một CHUỖI HTML chứ không phải component.
 */

// Leaflet tải từ CDN. Ghim số phiên bản — để trống thì bản mới ra là app đổi
// theo mà mình không biết, hỏng lúc nào không hay.
const LEAFLET = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4';

/*
 * NỀN BẢN ĐỒ.
 *
 * Lúc đầu tôi dùng nền gốc của OpenStreetMap cho cả hai chế độ, rồi ĐẢO MÀU
 * bằng CSS để ra chế độ tối. Cách đó hỏng theo hai kiểu, thấy ngay khi chạy thật:
 *
 *   1. Ảnh bị lọc màu nên nhạt và mờ hẳn đi — chữ đường phố khó đọc.
 *   2. WebKit (nhân trình duyệt của iPhone) nhiều khi KHÔNG vẽ lại lớp đã lọc
 *      màu khi ảnh trong đó vừa tải xong. Kết quả: mở bản đồ ra thấy trống
 *      trơn, phải kéo hoặc phóng một cái thì ô bản đồ mới chịu hiện.
 *
 * Nên đổi sang nền của CARTO: họ có sẵn một bộ nền tối thật, không phải đảo
 * màu, nên bỏ hẳn được bộ lọc CSS — hết cả hai lỗi trên.
 *
 * Nền này cũng miễn phí, không cần khoá, và quan trọng là hỗ trợ {r}: trên
 * màn hình điện thoại mật độ cao, Leaflet tự xin bản ảnh @2x nên bản đồ NÉT
 * hơn hẳn mà KHÔNG tốn thêm lượt tải (vẫn đúng từng ấy ô, chỉ ảnh to gấp đôi).
 *
 * Dữ liệu vẫn là của OpenStreetMap, CARTO chỉ vẽ lại — nên phải ghi nguồn cả hai.
 */
const TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Mặc định nhìn về TP.HCM, nơi phần lớn tin đang tập trung. Giống web.
export const DEFAULT_CENTER = [10.776, 106.7];
export const DEFAULT_ZOOM = 12;

// Mức phóng khi đã biết một điểm cụ thể.
export const FOCUS_ZOOM = 15;

/*
 * Bán kính vùng vẽ quanh mỗi điểm, tính bằng mét.
 *
 * Back-end làm tròn toạ độ về lưới 0,005 độ trước khi lưu (xem hàm fuzz trong
 * api/models/petModel.js) — khoảng 550m ở vĩ độ Việt Nam. Nên đây là độ chính
 * xác THẬT SỰ mà app có, không hơn.
 *
 * Lúc XEM một tin thì vẽ vùng tròn này, không vẽ một chấm nhỏ: chấm nhỏ ngụ ý
 * biết chính xác hơn sự thật. Nhưng lúc ĐANG CHỌN thì không vẽ — người chọn
 * cần nhìn rõ đường phố để ngắm cho đúng, vòng tròn to che mất bản đồ.
 */
export const AREA_RADIUS_M = 550;

// Toạ độ chỉ dùng được khi có đủ cả hai. Thiếu một nửa thì coi như chưa có.
export const hasPoint = (o) =>
  !!o && Number.isFinite(Number(o.lat)) && Number.isFinite(Number(o.lng));

/*
 * Mở app bản đồ của chính điện thoại để chỉ đường.
 *
 * Dùng đường liên kết chung của Google Maps: không cần khoá API, và trên điện
 * thoại hệ điều hành tự bắt lấy link này rồi mở app Maps thay vì trình duyệt.
 */
export const directionsUrl = (lat, lng) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

/*
 * Trang HTML chứa bản đồ.
 *
 *   pick        — true: chọn một điểm (màn đăng / sửa bài)
 *                 false: chỉ hiện các pin có sẵn (màn chi tiết)
 *   interactive — false thì khoá hết thao tác, bản đồ thành một tấm ảnh.
 *                 CẦN THIẾT khi bản đồ nằm trong màn hình cuộn được: nếu để
 *                 bản đồ bắt cử chỉ kéo, người dùng muốn cuộn trang mà ngón tay
 *                 chạm vào bản đồ thì trang đứng im.
 *   isDark      — chế độ tối
 */
export function mapHtml({ pick = false, interactive = true, isDark = false } = {}) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="${LEAFLET}/leaflet.min.css" />
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; }

  /* Nền lúc ô bản đồ chưa tải xong, để không loé một khung trắng ở chế độ tối */
  body { background: ${isDark ? '#16242F' : '#EDF6F8'}; }

  /*
   * Chấm chỉ điểm ĐỨNG YÊN GIỮA MÀN HÌNH, không nằm trong bản đồ.
   *
   * Kiểu của Google Maps: kéo bản đồ cho tới khi chỗ cần chọn nằm dưới chấm,
   * chứ không phải tìm đúng chấm rồi kéo nó đi. Trên điện thoại khác nhau rất
   * nhiều: ngón tay to hơn cái chấm, kéo trúng nó rất khó, mà lúc kéo thì
   * chính ngón tay che mất chỗ đang ngắm.
   *
   * pointer-events: none để nó không chắn cử chỉ kéo bản đồ ở dưới.
   * z-index 700 để nằm trên các lớp của bản đồ (cao nhất 650) nhưng vẫn dưới
   * nút phóng to (800).
   */
  #pin {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 14px;
    height: 14px;
    margin: -7px 0 0 -7px;
    border-radius: 9999px;
    border: 3px solid #fff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, .45);
    pointer-events: none;
    z-index: 700;
    display: none;
  }

  /* Dòng ghi nguồn — BẮT BUỘC theo điều khoản của OpenStreetMap và CARTO,
     không được bỏ. Chỉ thu nhỏ lại cho vừa màn hình điện thoại. */
  .leaflet-control-attribution { font-size: 9px; background: rgba(255, 255, 255, 0.75); }
</style>
</head>
<body>
<div id="map"></div>
<div id="pin"></div>
<script src="${LEAFLET}/leaflet.min.js"></script>
<script>
  var INTERACTIVE = ${interactive ? 'true' : 'false'};
  var PICK = ${pick ? 'true' : 'false'};

  // Gửi tin về phía React Native. postMessage chỉ nhận chuỗi, nên gói bằng JSON.
  function send(msg) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    }
  }

  var map = L.map('map', {
    // Khoá từng thao tác một thay vì đặt interactive: false lúc tạo map.
    dragging: INTERACTIVE,
    touchZoom: INTERACTIVE,
    doubleClickZoom: INTERACTIVE,
    scrollWheelZoom: INTERACTIVE,
    boxZoom: false,
    keyboard: false,
    zoomControl: INTERACTIVE,
    attributionControl: true,
  }).setView([${DEFAULT_CENTER[0]}, ${DEFAULT_CENTER[1]}], ${DEFAULT_ZOOM});

  L.tileLayer('${isDark ? TILES.dark : TILES.light}', {
    maxZoom: 20,
    // Bốn tên miền con để trình duyệt tải nhiều ô song song thay vì xếp hàng
    subdomains: 'abcd',
    attribution: '${TILE_ATTRIBUTION}',
  }).addTo(map);

  // Pin tự vẽ bằng HTML. Ảnh pin mặc định của Leaflet hỏng đường dẫn khi nhúng
  // kiểu này, mà vẽ tay thì còn đổi được màu theo loại tin.
  function pin(color) {
    return L.divIcon({
      className: '',
      html: '<span style="display:block;width:14px;height:14px;border-radius:9999px;' +
            'background:' + color + ';border:3px solid #fff;' +
            'box-shadow:0 1px 4px rgba(0,0,0,.45)"></span>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
  }

  // Làm tròn 6 chữ số ~ 10cm. Gửi số dài hơn là vô ích, back-end còn làm mờ nữa.
  function round(n) {
    return Number(n.toFixed(6));
  }

  var layer = L.layerGroup().addTo(map);
  var pinEl = document.getElementById('pin');

  /*
   * Dời khung nhìn mà KHÔNG báo ngược về React Native.
   *
   * Cần phân biệt vì ở chế độ chọn điểm, mỗi lần bản đồ dừng lại là một lần
   * chọn điểm mới. Nếu chính mình dời khung nhìn theo lệnh của React Native mà
   * cũng báo về, sẽ thành vòng lặp: báo về -> React Native gửi lệnh -> dời ->
   * lại báo về.
   *
   * animate: false để setView chạy XONG NGAY, nhờ vậy cờ silent tắt đúng lúc.
   * Để Leaflet chạy hoạt ảnh thì moveend nổ muộn hơn, lúc đó cờ đã tắt rồi.
   */
  var silent = false;
  function moveTo(lat, lng, zoom) {
    silent = true;
    map.setView([lat, lng], zoom, { animate: false });
    silent = false;
  }

  // Bản đồ dừng lại = chọn xong một điểm. Chỉ ở chế độ chọn và chỉ khi người
  // dùng tự kéo.
  map.on('moveend', function () {
    if (!PICK || !INTERACTIVE || silent) return;
    var c = map.getCenter();
    send({ type: 'pick', lat: round(c.lat), lng: round(c.lng) });
  });

  /*
   * window.lp — những hàm React Native gọi vào được qua injectJavaScript.
   *
   * Phía React Native phải chờ tin 'ready' mới gọi, vì Leaflet tải từ mạng,
   * không biết xong lúc nào.
   */
  window.lp = {
    /*
     * Vẽ lại toàn bộ pin. Nhận mảng { id, lat, lng, color } — cố ý KHÔNG nhận
     * tên hay mô tả con vật: chữ nghĩa để React Native lo, chỉ nó mới biết
     * người dùng đang xem tiếng gì và đang ở chế độ sáng hay tối.
     */
    setPets: function (pets) {
      layer.clearLayers();
      if (!pets || pets.length === 0) return;

      pets.forEach(function (p) {
        // Vùng tròn thể hiện độ chính xác thật (xem AREA_RADIUS_M trong src/map.js)
        L.circle([p.lat, p.lng], {
          radius: ${AREA_RADIUS_M},
          color: p.color,
          weight: 1,
          opacity: 0.5,
          fillColor: p.color,
          fillOpacity: 0.12,
        }).addTo(layer);

        L.marker([p.lat, p.lng], { icon: pin(p.color) }).addTo(layer);
      });

      // Khung nhìn tự ôm hết các điểm, khỏi phải kéo đi tìm.
      var bounds = L.latLngBounds(pets.map(function (p) { return [p.lat, p.lng]; }));
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 14 });
    },

    /*
     * Điểm đang chọn. Gọi với lat = null nghĩa là chưa chọn gì.
     *
     * Không vẽ gì lên bản đồ cả — chấm chỉ điểm đứng yên giữa màn hình, nên
     * "đặt điểm" thực chất là dời bản đồ sao cho điểm đó nằm dưới chấm.
     */
    setPoint: function (lat, lng, color, focus) {
      pinEl.style.background = color;

      if (lat === null || lng === null) {
        /*
         * Chưa chọn gì. Bản đồ xem trước thì giấu chấm đi cho khỏi hiểu nhầm
         * là đã chọn; còn đang mở ra để chọn thì vẫn hiện chấm, vì người dùng
         * cần thấy mình đang ngắm vào đâu.
         *
         * Cố ý KHÔNG tự lấy giữa màn hình làm điểm chọn ở đây. Làm vậy thì chỉ
         * mở ra xem rồi đóng lại cũng đã gán một vị trí — mà lúc đó bản đồ
         * đang ở giữa TP.HCM, hoàn toàn không liên quan tới tin đang đăng.
         */
        pinEl.style.display = INTERACTIVE && PICK ? 'block' : 'none';
        return;
      }

      pinEl.style.display = 'block';
      if (focus) moveTo(lat, lng, ${FOCUS_ZOOM});
    },

    /*
     * Chốt chỗ đang ngắm làm điểm chọn. React Native gọi khi bấm "Xong".
     *
     * Cần hàm riêng vì có một trường hợp không qua moveend: mở ra, chưa chọn
     * gì, không kéo gì cả, bấm Xong luôn. Ý người dùng rõ ràng là lấy chỗ đang
     * hiện, nhưng bản đồ chưa hề dừng lại lần nào nên moveend không nổ.
     */
    commit: function () {
      if (!PICK || !INTERACTIVE) return;
      var c = map.getCenter();
      send({ type: 'pick', lat: round(c.lat), lng: round(c.lng) });
    },
  };

  /*
   * Bản đồ hay được dựng lúc khung chứa nó chưa có kích thước thật, nhất là khi
   * nằm trong hộp thoại đang mở ra. Leaflet đo sai thì chỉ hiện một góc nhỏ.
   * Gọi invalidateSize để nó đo lại.
   */
  setTimeout(function () { map.invalidateSize(); }, 0);
  send({ type: 'ready' });
</script>
</body>
</html>`;
}
