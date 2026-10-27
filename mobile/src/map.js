/*
 * Bản đồ dùng chung — hằng số, và trang HTML Leaflet nhúng vào WebView.
 *
 * TẠI SAO LÀ WEBVIEW CHỨ KHÔNG PHẢI THƯ VIỆN BẢN ĐỒ THẬT?
 *
 * react-native-maps là cách "chuẩn" hơn, nhưng nó gọi tới Google Maps SDK:
 * phải xin khoá API, khai báo khoá trong app.json, và khoá đó đi kèm thẻ tín
 * dụng. Với một bài tập ở trường thì vướng cả ba.
 *
 * Nhúng Leaflet + nền OpenStreetMap vào WebView thì KHÔNG cần khoá, không cần
 * tài khoản, không giới hạn lượt xem. Thêm một cái lợi nữa: web của nhóm cũng
 * đang dùng đúng Leaflet + OpenStreetMap, nên hai bên hiện ra giống nhau.
 *
 * Đổi lại: phải nói chuyện với bản đồ qua postMessage thay vì gọi hàm trực
 * tiếp. Đó là lý do file này trả về một CHUỖI HTML chứ không phải component.
 */

// Leaflet tải từ CDN. Ghim số phiên bản — để trống thì bản mới ra là app đổi
// theo mà mình không biết, hỏng lúc nào không hay.
const LEAFLET = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4';

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
 * Vì vậy phải vẽ một vùng tròn, không vẽ một chấm nhỏ. Chấm nhỏ ngụ ý biết
 * chính xác hơn sự thật — mà sự thật đó là chuyện riêng tư của người đăng tin,
 * cố tình làm mờ đi.
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
 *   pick        — true: chạm vào bản đồ để chọn một điểm (dùng khi đăng tin)
 *                 false: chỉ hiện các pin có sẵn (trang chủ, màn chi tiết)
 *   interactive — false thì khoá hết thao tác, bản đồ thành một tấm ảnh tĩnh.
 *                 CẦN THIẾT khi bản đồ nằm trong màn hình cuộn được: nếu để
 *                 bản đồ bắt cử chỉ kéo, người dùng muốn cuộn trang mà ngón tay
 *                 chạm vào bản đồ thì trang đứng im — rất khó chịu.
 *   isDark      — chế độ tối
 */
export function mapHtml({ pick = false, interactive = true, isDark = false } = {}) {
  const dark = isDark
    ? `
  /*
   * Chế độ tối: OpenStreetMap chỉ có nền sáng, không có bản tối miễn phí. Thay
   * vì đi mượn nền của một nhà cung cấp khác (lại thêm một bộ điều khoản phải
   * tuân theo), đảo màu ngay tại đây bằng CSS.
   *
   * Chỉ đảo lớp chứa ô bản đồ (.leaflet-tile-pane). Đảo cả bản đồ thì pin và
   * vùng tròn cũng đổi màu theo — mất hết màu nhãn trạng thái.
   */
  .leaflet-tile-pane { filter: invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.88); }`
    : '';

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
${dark}

  /* Dòng ghi nguồn OpenStreetMap — BẮT BUỘC theo điều khoản của họ, không được
     bỏ. Chỉ thu nhỏ lại cho vừa màn hình điện thoại. */
  .leaflet-control-attribution { font-size: 9px; background: rgba(255, 255, 255, 0.75); }
</style>
</head>
<body>
<div id="map"></div>
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
    // Khoá từng thao tác một. Đặt interactive: false lúc tạo map thì Leaflet
    // khoá luôn cả việc bấm vào pin, mà pin vẫn cần bấm được.
    dragging: INTERACTIVE,
    touchZoom: INTERACTIVE,
    doubleClickZoom: INTERACTIVE,
    scrollWheelZoom: INTERACTIVE,
    boxZoom: false,
    keyboard: false,
    zoomControl: INTERACTIVE,
    attributionControl: true,
  }).setView([${DEFAULT_CENTER[0]}, ${DEFAULT_CENTER[1]}], ${DEFAULT_ZOOM});

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  // Pin tự vẽ bằng HTML. Ảnh pin mặc định của Leaflet hỏng đường dẫn khi nhúng
  // kiểu này, mà vẽ tay thì còn đổi được màu theo loại tin.
  function pin(color) {
    return L.divIcon({
      className: '',
      html: '<span style="display:block;width:18px;height:18px;border-radius:9999px;' +
            'background:' + color + ';border:3px solid #fff;' +
            'box-shadow:0 1px 4px rgba(0,0,0,.45)"></span>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }

  // Vùng tròn thể hiện độ chính xác thật (xem AREA_RADIUS_M trong src/map.js).
  function area(lat, lng, color) {
    return L.circle([lat, lng], {
      radius: ${AREA_RADIUS_M},
      color: color,
      weight: 1,
      opacity: 0.5,
      fillColor: color,
      fillOpacity: 0.12,
    });
  }

  // Làm tròn 6 chữ số ~ 10cm. Gửi số dài hơn là vô ích, back-end còn làm mờ nữa.
  function round(n) {
    return Number(n.toFixed(6));
  }

  var layer = L.layerGroup().addTo(map);

  /*
   * window.lp — những hàm React Native gọi vào được qua injectJavaScript.
   *
   * Phía React Native vẫn phải chờ tin 'ready' mới gọi, vì Leaflet tải từ
   * mạng, không biết xong lúc nào.
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
        area(p.lat, p.lng, p.color).addTo(layer);
        L.marker([p.lat, p.lng], { icon: pin(p.color) })
          .addTo(layer)
          .on('click', function () { send({ type: 'select', id: p.id }); });
      });

      // Khung nhìn tự ôm hết các điểm, khỏi phải kéo đi tìm.
      var bounds = L.latLngBounds(pets.map(function (p) { return [p.lat, p.lng]; }));
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 14 });
    },

    // Đặt hoặc xoá điểm đang chọn. Gọi với lat = null để xoá.
    setPoint: function (lat, lng, color, focus) {
      layer.clearLayers();
      if (lat === null || lng === null) return;

      area(lat, lng, color).addTo(layer);
      var marker = L.marker([lat, lng], { icon: pin(color), draggable: INTERACTIVE }).addTo(layer);

      // Kéo pin để chỉnh lại cho đúng chỗ. Chỉ gửi tin khi THẢ TAY, không gửi
      // liên tục trong lúc kéo — không thì React Native vẽ lại hàng chục lần.
      marker.on('dragend', function () {
        var p = marker.getLatLng();
        send({ type: 'pick', lat: round(p.lat), lng: round(p.lng) });
      });

      if (focus) map.setView([lat, lng], ${FOCUS_ZOOM});
    },

    // Đưa khung nhìn về một điểm mà không đặt pin — dùng cho nút "vị trí của tôi".
    focus: function (lat, lng) { map.setView([lat, lng], ${FOCUS_ZOOM}); },
  };

  map.on('click', function (e) {
    if (PICK && INTERACTIVE) {
      send({ type: 'pick', lat: round(e.latlng.lat), lng: round(e.latlng.lng) });
    } else {
      // Bấm vào chỗ trống trên bản đồ = bỏ chọn pin đang mở. Leaflet không
      // tính cú bấm vào pin là bấm vào bản đồ, nên hai việc không đụng nhau.
      send({ type: 'blur' });
    }
  });

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
