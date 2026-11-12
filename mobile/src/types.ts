/*
 * Kiểu dữ liệu dùng chung cho cả app.
 *
 * Mô tả ĐÚNG những gì back-end trả về, không phải những gì mình mong nó trả
 * về. Khai sai ở đây còn tệ hơn không khai: TypeScript sẽ yên tâm cho qua
 * những chỗ thật ra đang hỏng.
 *
 * Nguồn đối chiếu:
 *   back-end/api/models/petModel.js       cấu trúc một tin
 *   back-end/api/controllers/aiController.js   kết quả AI
 *   back-end/api/controllers/authController.js publicUser()
 */

import type { NavigatorScreenParams } from '@react-navigation/native';

/** 'lost' = tin báo mất, 'found' = tin báo nhặt được. Back-end chỉ nhận hai giá trị này. */
export type PetType = 'lost' | 'found';

/*
 * Mã lý do báo cáo một tin đăng.
 *
 * Phải khớp từng chữ với REASONS trong back-end/api/models/reportModel.js —
 * server từ chối thẳng mã lạ. Khai thành kiểu ở đây thay vì để string, nhờ
 * vậy gõ sai một chữ là TypeScript báo ngay lúc viết, không phải đợi tới lúc
 * bấm nút mới thấy lỗi 400.
 */
export type ReportReason =
  | 'scam'
  | 'fake_image'
  | 'wrong_contact'
  | 'offensive'
  | 'duplicate'
  | 'other';

/**
 * Một tin đăng.
 *
 * Mấy trường đánh dấu tuỳ chọn (`?`) là những trường back-end đặt select:false
 * hoặc chỉ trả về trong một số trường hợp — đọc thẳng mà không kiểm tra là
 * đúng loại lỗi TypeScript sinh ra để chặn.
 */
export interface Pet {
  _id: string;
  /** Mã tin dạng LOST-xxxx, chỉ để người dùng đọc và tra cứu. */
  postId?: string;
  type: PetType;
  name: string;
  species: string;
  breed: string;
  color: string;
  area: string;
  contact: string;
  description: string;
  /** Chuỗi RỖNG khi không có ảnh, KHÔNG phải null. Đừng kiểm tra bằng `=== null`. */
  image: string;
  resolved: boolean;
  /**
   * Toạ độ, đã được back-end làm tròn về lưới ~550m.
   *
   * null khi người đăng không chọn vị trí. Dùng hasPoint() trong src/map.ts
   * để kiểm tra, đừng tự viết Number(lat) — Number(null) ra 0, là một toạ độ
   * hợp lệ giữa Đại Tây Dương. Lỗi này đã xảy ra thật một lần rồi.
   */
  lat: number | null;
  lng: number | null;
  /** Ngày đăng, dạng chuỗi ISO. */
  date: string;
  /**
   * Đặc điểm chỉ chủ nuôi biết.
   *
   * Back-end đặt select:false nên CHỈ trả về cho chủ bài. Người khác xem tin
   * sẽ nhận undefined — khác hẳn với chuỗi rỗng, vốn nghĩa là chủ bài có
   * quyền xem nhưng chưa điền gì. Gửi chuỗi rỗng lên khi chỉ nhận được
   * undefined là XOÁ MẤT dữ liệu của chủ bài.
   */
  secretDetail?: string;
  /** Chỉ có ở danh sách của trang quản trị, và chỉ khi tin đăng bởi tài khoản. */
  owner?: { _id: string; name: string; email: string } | null;
  /**
   * Mã xác nhận, back-end trả về ĐÚNG MỘT LẦN lúc tạo tin.
   * Không lưu lại ngay là mất quyền sửa/xoá tin đó vĩnh viễn.
   */
  claimCode?: string;
}

/** Trang danh sách tin: GET /pets */
/*
 * Một tin trên bản đồ. ÍT TRƯỜNG HƠN Pet, cố ý.
 *
 * Back-end chỉ trả về đúng những trường bản đồ vẽ ra (MAP_FIELDS trong
 * petController.js): không có contact, không có description, không có đặc
 * điểm bí mật. Một tin có mô tả dài, mà bản đồ có thể kéo về tới 500 tin một
 * lúc — trả đầy đủ là vài MB cho một màn hình chỉ hiện chấm tròn.
 *
 * Khai bằng Pick chứ không chép tay lại: đổi kiểu của Pet là chỗ này đổi
 * theo, không có chuyện hai nơi lệch nhau.
 */
export type MapPet = Pick<
  Pet,
  '_id' | 'postId' | 'type' | 'name' | 'breed' | 'color' | 'area' | 'image' | 'lat' | 'lng' | 'resolved'
>;

/** Kết quả GET /pets/map. */
export interface MapPage {
  pets: MapPet[];
  /** Số tin CÓ toạ độ và khớp bộ lọc. */
  total: number;
  /** Số tin khớp bộ lọc nhưng người đăng không chọn vị trí, nên không vẽ được. */
  withoutCoords: number;
  /** true = đã chạm trần 500 tin, bản đồ đang thiếu. */
  capped: boolean;
}

export interface PetPage {
  pets: Pet[];
  total: number;
}

// ---- Tài khoản ----

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  /*
   * Hộp thư đã xác minh chưa.
   *
   * KHÔNG BẮT BUỘC, và đó là cố ý: bản app cũ lưu user vào ổ đĩa khi back-end
   * chưa có trường này, nên người đang đăng nhập sẵn sẽ đọc lên undefined.
   * Chỗ dùng phải kiểm === false, đừng kiểm !emailVerified — không thì mọi
   * người dùng cũ bị nhắc xác minh dù họ đã xác minh từ lâu.
   */
  emailVerified?: boolean;
}

/*
 * Kết quả của /auth/register và /auth/login.
 *
 * token KHÔNG BẮT BUỘC, và đó là điểm quan trọng nhất của kiểu này.
 *
 * Từ back-end PR #104, đăng ký thành công KHÔNG còn trả token: máy chủ gửi
 * thư xác minh rồi trả { verifyRequired, email, message }. Chỉ khi máy chủ
 * chưa khai thiết lập gửi thư — chạy ở máy, chạy test — nó mới trả token như
 * cũ. Giao diện phải xử lý CẢ HAI dạng.
 *
 * Khai token là bắt buộc thì TypeScript không cảnh báo gì khi mình viết
 * login(data.token, data.user), và lỗi chỉ lộ ra lúc người dùng bấm Đăng ký
 * rồi ngồi nhìn nút quay mãi. Khai không bắt buộc thì nó bắt ngay lúc biên
 * dịch — đó là cách lỗi đó lẽ ra phải bị chặn.
 */
export interface AuthResult {
  token?: string;
  user?: User;
  /** true = đã gửi thư xác minh, chưa có phiên đăng nhập nào cả. */
  verifyRequired?: boolean;
  /** Địa chỉ vừa đăng ký, dùng luôn cho nút gửi lại thư. */
  email?: string;
  message?: string;
}

// ---- AI ----

/** POST /ai/analyze-image — AI nhìn ảnh rồi đoán hộ các ô trong form. */
export interface AnalyzeResult {
  species: string;
  breed: string;
  color: string;
  description: string;
  /** 0-100. */
  confidence: number;
}

/** Một tin có thể là cùng con vật. */
export interface MatchItem {
  pet: Pet;
  /** 0-100. */
  score: number;
  reason: string;
}

/** GET /ai/match/:id */
export interface MatchResult {
  matches: MatchItem[];
  candidatesChecked: number;
}

/** Một lượt trong hội thoại với trợ lý. */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ---- Bộ lọc ----

export interface Filters {
  species: string;
  area: string;
  /** Số ngày gần đây, chuỗi rỗng nghĩa là không giới hạn. */
  days: string;
  sort: string;
}

/*
 * Một báo cáo trong trang quản trị: GET /admin/reports
 *
 * pet có thể là NULL — và đây là chỗ dễ quên nhất.
 *
 * Báo cáo trỏ tới tin bằng khoá ngoại. Admin xoá tin xong thì báo cáo vẫn
 * nằm lại, và populate trả về null chứ không bỏ dòng đó đi. Coi như lúc nào
 * cũng có tin là app sẽ chết ngay ở dòng đầu tiên đọc pet.image.
 */
export interface AdminReport {
  _id: string;
  reason: ReportReason;
  /** Mô tả người báo cáo tự ghi. Chuỗi rỗng khi họ không ghi gì. */
  note: string;
  date: string;
  pet: Pick<
    Pet,
    'postId' | 'type' | 'species' | 'breed' | 'color' | 'area' | 'image' | 'resolved'
  > & { _id: string } | null;
}

/** Kết quả GET /admin/reports. Mỗi trang 20 báo cáo. */
export interface AdminReportPage {
  reports: AdminReport[];
  total: number;
  page: number;
  pages: number;
}

// ---- Số liệu trang quản trị: GET /admin/stats ----

export interface AdminRank {
  label: string;
  count: number;
}

export interface AdminStats {
  total: number;
  lost: number;
  found: number;
  resolved: number;
  open: number;
  withImage: number;
  users: number;
  /** Phần trăm tin đã đánh dấu đoàn tụ, 0-100. */
  resolvedRate: number;

  /*
   * Ba trường back-end vẫn trả về mà trước đây mobile bỏ quên.
   *
   * Tin đã đoàn tụ không giữ mãi: quá hạn thì bị xoá hẳn, kèm cả ảnh trên
   * Cloudinary. Đó là chủ ý về quyền riêng tư — giữ mãi ảnh và số điện thoại
   * của một chuyện đã xong từ lâu thì không có lý do gì.
   */
  /** Số tin đã quá hạn giữ lại, tức đợt dọn kế tiếp sẽ xoá đúng ngần này. */
  pendingCleanup: number;
  /** Quá bao nhiêu ngày kể từ lúc đánh dấu đoàn tụ thì tính là quá hạn. */
  cleanupDays: number;
  /** Số báo cáo chưa ai xử lý. */
  openReports: number;

  topAreas: AdminRank[];
  topBreeds: AdminRank[];
}

/** Kết quả POST /admin/cleanup. */
export interface CleanupResult {
  /** Số tin vừa bị xoá hẳn. */
  deleted: number;
  /*
   * Số tin được đóng dấu mốc thời gian lần đầu.
   *
   * Tin đoàn tụ từ trước khi back-end có trường resolvedAt thì không có mốc
   * nào để tính hạn, nên lần dọn đầu chỉ đóng dấu "bây giờ" cho chúng chứ
   * không xoá. Vì vậy deleted có thể bằng 0 mà stamped vẫn lớn.
   */
  stamped: number;
  days: number;
}

// ---- Điều hướng ----

/*
 * Danh sách màn hình và tham số mỗi màn nhận.
 *
 * Khai ở đây rồi thì ba thứ được chặn ngay lúc gõ code:
 *   - navigate('Detial') — gõ sai tên màn hình, báo lỗi ngay
 *   - navigate('Detail') — quên tham số id, báo lỗi ngay
 *   - route.params.ids   — đọc sai tên tham số, báo lỗi ngay
 *
 * Trước đây cả ba đều phải chạy thật mới biết, mà lỗi hiện ra lại là một màn
 * hình trắng chứ không nói mình sai ở đâu.
 */
export type RootStackParamList = {
  /*
   * NavigatorScreenParams chứ không phải undefined.
   *
   * Tabs là một bộ ba màn hình lồng bên trong, nên đôi khi cần chỉ đích danh
   * màn nào — ví dụ đăng nhập xong thì về thẳng Trang chủ. Khai undefined thì
   * navigate('Tabs', { screen: 'Home' }) bị TypeScript từ chối, mà tên màn gõ
   * sai cũng không ai bắt được.
   */
  Tabs: NavigatorScreenParams<MainTabParamList>;
  Detail: { id: string };
  /*
   * Hai dạng tham số, không gộp làm một được: đăng mới thì CHƯA CÓ tin nào,
   * còn sửa thì BẮT BUỘC phải có. Viết thành liên hợp (union) nên quên truyền
   * pet lúc sửa là báo lỗi, mà truyền thừa pet lúc đăng mới cũng báo lỗi.
   */
  Form: { mode: 'create'; pet?: undefined } | { mode: 'edit'; pet: Pet };
  Auth: undefined;
  Chat: undefined;
  Admin: undefined;
  /*
   * token chỉ có khi mở từ đường dẫn trong thư đặt lại mật khẩu. Không có thì
   * màn hiện ô nhập email để xin một đường dẫn mới.
   */
  ForgotPassword: { token?: string } | undefined;
  Contact: undefined;
  Privacy: undefined;
};

/** Ba tab dưới đáy. Không tab nào nhận tham số. */
export type MainTabParamList = {
  Home: undefined;
  MyPets: undefined;
  Settings: undefined;
};
