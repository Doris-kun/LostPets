const Pet = require('../models/petModel');
const { distanceKm, boxAround, hasCoords } = require('./geo');
const { cosine } = require('./embedding');

// Tầng truy hồi của tính năng so khớp Lost<->Found.
//
// Tách ra khỏi controller vì hai nơi cần dùng chung: đường chạy thật
// (aiController) và kịch bản đo độ chính xác (scripts/eval-matching.js).
// Nếu kịch bản đo chép lại logic này thay vì gọi nó, con số đo được sẽ nói về
// bản chép chứ không nói về hệ thống — và chỉ cần sửa một bên là hai bên lệch
// nhau mà không ai biết.

const MAX_CANDIDATES = 3;
const CANDIDATE_WINDOW_DAYS = 120;

const oppositeType = (type) => (type === 'lost' ? 'found' : 'lost');

// Bộ lọc cứng: phải ngược loại tin, cùng loài, chưa giải quyết, và trong
// khoảng thời gian còn hợp lý. Đây là lọc nhị phân, không phải chấm điểm —
// một tin trượt bộ lọc này thì không có cơ hội nào được AI nhìn tới.
// Bán kính so khớp. Rộng hơn hẳn 10km của tầng thông báo, và có chủ ý.
//
// Hai tầng trả lời hai câu hỏi khác nhau. Thông báo hỏi "có đáng báo động
// cho người này không" — làm phiền người ở xa là rác, nên phải chặt. So khớp
// hỏi "hai tin này có thể là một con không" — thú cưng đi lạc thì đi xa, và
// bỏ sót một tin đúng nguy hiểm hơn nhiều so với hiện thừa một tin sai.
//
// 50km phủ hết một vùng đô thị kể cả ngoại ô, nhưng vẫn loại được tin ở tỉnh
// khác. Trước khi có mốc này, một con mèo mất ở Quận 3 được gợi ý khớp với
// tin nhặt được ở Cần Thơ, cách 170km.
const MATCH_RADIUS_KM = 50;

const candidateFilter = (source, windowDays = CANDIDATE_WINDOW_DAYS) => {
  const since = new Date();
  since.setDate(since.getDate() - windowDays);
  const filter = {
    _id: { $ne: source._id },
    type: oppositeType(source.type),
    species: source.species,
    resolved: false,
    date: { $gte: since },
  };

  if (hasCoords(source)) {
    // GIỮ LẠI tin không có toạ độ. Không biết nó ở đâu thì không có cơ sở
    // loại, mà tin cũ đăng trước khi có bản đồ thì không tin nào có toạ độ —
    // loại hết là xóa sổ một phần lớn kho tin.
    const box = boxAround(source.lat, source.lng, MATCH_RADIUS_KM);
    filter.$or = [
      { lat: null },
      { lat: box.lat, lng: box.lng },
    ];
  }

  return filter;
};

// Số tin lấy ra để xếp hạng trước khi cắt xuống còn `limit`. Rộng hơn `limit`
// nhiều lần thì tin đúng mới có cơ hội leo lên, nhưng vẫn phải có trần để một
// loài phổ biến không kéo cả nghìn bản ghi lên bộ nhớ.
const RANKING_POOL = 50;

// Lấy tập ứng viên đưa cho AI chấm, xếp theo ĐỘ GIỐNG chứ không theo ngày.
//
// Trước đây chỗ này là `sort({ date: -1 }).limit(3)`: lấy ba tin mới nhất rồi
// mới đưa AI chấm. Nghe thì hợp lý, nhưng khi đo trên bộ dữ liệu gán nhãn
// (scripts/eval-matching.js, 20 cặp) thì recall@3 chỉ đạt 20% — tin đúng
// thường nằm ngoài ba tin mới nhất, và AI không bao giờ được nhìn thấy nó.
// Độ chính xác khi đó bị chặn trần bởi may rủi thứ tự thời gian, không phải
// bởi khả năng của AI.
//
// Xếp cùng tập ấy theo cosine giữa hai vector nhúng thì recall@3 lên 100% và
// recall@1 lên 85%. Con số đo được trên cùng một bộ dữ liệu, cùng một bộ lọc
// cứng — khác nhau duy nhất ở tiêu chí sắp xếp.
//
// Không có vector thì rơi về ngày đăng: tin cũ đăng trước khi có tính năng
// nhúng vẫn phải so khớp được, thà xếp kém còn hơn không trả gì.
// Cắt nốt mấy góc thừa của khung vuông. Dùng ở CẢ HAI nhánh, vì hai nhánh
// lọc khác nhau thì cùng một tin lúc hiện lúc không, tuỳ có vector hay chưa.
const trongBanKinh = (source) => (pet) =>
  !hasCoords(source) || !hasCoords(pet)
  || distanceKm(source.lat, source.lng, pet.lat, pet.lng) <= MATCH_RADIUS_KM;

async function findCandidates(source, options = {}) {
  const limit = options.limit || MAX_CANDIDATES;
  const windowDays = options.windowDays || CANDIDATE_WINDOW_DAYS;
  const filter = candidateFilter(source, windowDays);

  const query = Array.isArray(source.embedding) ? source.embedding : [];
  if (query.length === 0) {
    const cu = await Pet.find(filter).sort({ date: -1 }).limit(RANKING_POOL);
    return cu.filter(trongBanKinh(source)).slice(0, limit);
  }

  const pool = (await Pet.find(filter).select('+embedding').sort({ date: -1 }).limit(RANKING_POOL))
    .filter(trongBanKinh(source));
  return pool
    .map((pet) => ({ pet, score: cosine(query, pet.embedding) }))
    // Giữ nguyên thứ tự ngày khi điểm bằng nhau — tin chưa nhúng đều 0 điểm,
    // rơi xuống cuối nhưng vẫn giữ trật tự mới-trước-cũ giữa chúng với nhau.
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.pet);
}

module.exports = {
  MAX_CANDIDATES,
  MATCH_RADIUS_KM,
  CANDIDATE_WINDOW_DAYS,
  oppositeType,
  candidateFilter,
  findCandidates,
};
