import { useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import api, { errorStatus } from '../api';
import type { AnalyzeResult, PetType, RootStackParamList } from '../types';
import claim from '../claim';
import ClaimCodeModal from '../components/ClaimCodeModal';
import PetMap from '../components/PetMap';
import { areaFromCoords } from '../map';
import { useAuth } from '../context/auth';
import { useLanguage } from '../context/language';
import { spacing } from '../theme';
import { useTheme } from '../context/theme';

/*
 * Màn hình form — dùng chung cho cả ĐĂNG MỚI (C) và SỬA (U).
 *
 * Phân biệt bằng route.params.mode:
 *   { mode: 'create' }            -> form trống, gọi POST /pets
 *   { mode: 'edit', pet: {...} }  -> điền sẵn dữ liệu cũ, gọi PUT /pets/:id
 *
 * Gộp một file vì hai form giống nhau tới 90%. Bên web tách đôi NewPet/EditPet
 * là do bản Vue cũ làm vậy, chứ không phải bắt buộc.
 */

const EMPTY_FORM: FormState = {
  type: 'lost',
  name: '',
  species: '',
  breed: '',
  color: '',
  area: '',
  contact: '',
  description: '',
  secretDetail: '',
  /*
   * Toạ độ trên bản đồ. null = chưa chọn, và đó là chuyện bình thường — tin
   * không có vị trí vẫn đăng được, web cũng vậy.
   *
   * Hai trường này là SỐ, khác mọi trường còn lại đều là chuỗi. Qua FormData
   * chúng thành chuỗi "null", và back-end đã lường trước đúng chuỗi đó
   * (xem pickEditable trong api/controllers/petController.js) nên không
   * thành toạ độ 0,0 giữa Đại Tây Dương.
   */
  lat: null,
  lng: null,
};

/*
 * Thu nhỏ ảnh trước khi gửi lên.
 *
 * VÌ SAO CẦN: back-end chặn file quá 5MB. Ảnh chụp bằng iPhone thường 3–8MB,
 * nên ảnh nhẹ thì đăng được, ảnh nặng thì hỏng — rất khó đoán với người dùng.
 *
 * Tệ hơn: back-end chưa có bộ bắt lỗi upload, nên file quá cỡ không trả về
 * 413 mà trả 500 kèm một trang HTML lỗi. App đọc thành "máy chủ gặp lỗi",
 * không ai biết nguyên nhân thật là ảnh nặng.
 *
 * Nên app tự lo: hạ bề ngang về tối đa 1600 điểm và nén còn 70%. Ảnh ra
 * thường dưới 1MB — vừa chắc chắn qua được giới hạn, vừa tải lên nhanh hơn
 * nhiều. Bản đồ hiển thị trong app chỉ rộng vài trăm điểm nên không mất nét.
 */
const MAX_WIDTH = 1600;

/*
 * Ảnh đã chọn. Khai tối thiểu đúng ba trường mình dùng, vì shrink() trả về
 * khi thì kết quả của ImageManipulator, khi thì chính asset gốc của
 * ImagePicker — hai kiểu khác nhau nhưng đều có đủ ba trường này.
 */
interface PickedImage {
  uri: string;
  width: number;
  height: number;
}

/*
 * File gửi kèm trong FormData.
 *
 * React Native mô tả file bằng { uri, name, type } rồi nhét thẳng object đó
 * vào FormData. Kiểu chuẩn của trình duyệt chỉ nhận string hoặc Blob, nên
 * phải ép kiểu — đây là KHÁC BIỆT CÓ THẬT giữa hai nền tảng, không phải lách.
 *
 * Gom vào một hàm để chỉ có đúng một chỗ ép kiểu trong cả app, có giải thích
 * kèm theo, thay vì rải cast khắp nơi rồi quên mất vì sao.
 */
interface RNFile {
  uri: string;
  name: string;
  type: string;
}

const appendFile = (formData: FormData, key: string, file: RNFile) =>
  formData.append(key, file as unknown as Blob);

/** Các ô trong form. lat/lng là SỐ, mọi ô còn lại là chuỗi. */
interface FormState {
  type: PetType;
  name: string;
  species: string;
  breed: string;
  color: string;
  area: string;
  contact: string;
  description: string;
  secretDetail: string;
  lat: number | null;
  lng: number | null;
}

async function shrink(asset: PickedImage): Promise<PickedImage> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      asset.uri,
      // Ảnh đã nhỏ hơn mức này thì không phóng to lên, bỏ qua bước resize
      asset.width > MAX_WIDTH ? [{ resize: { width: MAX_WIDTH } }] : [],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
    );
    return result;
  } catch {
    // Nén hỏng thì vẫn gửi ảnh gốc — còn hơn là chặn người dùng đăng bài.
    return asset;
  }
}

type Props = NativeStackScreenProps<RootStackParamList, 'Form'>;

export default function FormScreen({ route, navigation }: Props) {
  const { mode, pet } = route.params;
  const isEdit = mode === 'edit';
  const insets = useSafeAreaInsets();
  const { t, lang } = useLanguage();
  const { isLoggedIn } = useAuth();
  const { colors } = useTheme();

  const [form, setForm] = useState<FormState>(() => {
    if (!isEdit) return EMPTY_FORM;

    // Chỉ lấy 8 trường form cần. Nhét cả object từ API vào rồi gửi ngược lên sẽ
    // ghi đè resolved, postId, date — mất trạng thái đã đoàn tụ.
    return {
      type: pet.type,
      name: pet.name ?? '',
      species: pet.species ?? '',
      breed: pet.breed ?? '',
      color: pet.color ?? '',
      area: pet.area ?? '',
      contact: pet.contact ?? '',
      description: pet.description ?? '',
      secretDetail: pet.secretDetail ?? '',
      lat: pet.lat ?? null,
      lng: pet.lng ?? null,
    };
  });

  /*
   * Đặc điểm bí mật chỉ server trả về cho CHỦ bài. Người khác mở màn sửa — tin
   * cũ không có mã xác nhận thì ai cũng sửa được — sẽ nhận undefined.
   *
   * Gửi chuỗi rỗng lên trong trường hợp đó là XOÁ MẤT đặc điểm của chủ bài.
   * Nên khi không nhận được trường này thì giấu ô đi và không gửi nó lên.
   */
  const canEditSecret = !isEdit || pet.secretDetail !== undefined;

  // Ảnh mới chọn từ máy. Chỉ dùng khi đăng mới — PUT không nhận upload file.
  const [image, setImage] = useState<PickedImage | null>(null);

  /*
   * Người dùng đã bấm xoá ảnh chưa.
   *
   * Khác với image = null: null chỉ nghĩa là "chưa chọn ảnh mới", lúc lưu máy
   * chủ sẽ GIỮ NGUYÊN ảnh cũ. Muốn xoá hẳn thì phải báo riêng bằng cờ này.
   */
  const [removeImage, setRemoveImage] = useState(false);
  // Bảng lựa chọn ảnh có đang mở không
  const [photoMenu, setPhotoMenu] = useState(false);

  /*
   * Ảnh đang lưu trên máy chủ, chỉ hiện khi chưa chọn ảnh mới và chưa bấm xoá.
   *
   * Dòng này BẮT BUỘC đứng sau hai dòng useState ở trên. Đặt trước thì lúc
   * chạy, removeImage còn chưa có giá trị, `!removeImage` luôn ra true, và
   * ảnh cũ không bao giờ biến mất dù bấm Xoá — app vẫn chạy, chỉ là kết quả
   * sai âm thầm.
   */
  const keptImage = isEdit && !removeImage ? pet.image : '';

  const [saving, setSaving] = useState(false);

  // Phần AI: đang chạy, kết quả, và lỗi nếu có
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AnalyzeResult | null>(null);
  const [aiError, setAiError] = useState('');

  // Mã vừa nhận sau khi đăng bài, chỉ dùng cho khách chưa đăng nhập
  const [newCode, setNewCode] = useState('');

  /*
   * Số thứ tự lần chạy AI. Dùng useRef chứ không useState: nó chỉ để so sánh
   * bên trong hàm, đổi nó không cần vẽ lại màn hình.
   */
  const aiRun = useRef(0);

  // Generic: gõ update('breed', 5) là báo lỗi ngay, vì breed phải là chuỗi.
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  /*
   * Ghim điểm lên bản đồ -> tự điền ô Khu vực.
   *
   * CHỈ điền khi ô còn trống. Người dùng đã gõ "Gần chợ Bến Thành, hẻm 25"
   * thì đó là thứ họ cố ý viết, chi tiết hơn hẳn "Quận 1, TP.HCM" — đè lên là
   * xoá công của họ, và họ sẽ không hiểu vì sao chữ mình vừa gõ biến mất.
   *
   * Toạ độ vào form NGAY, không chờ tra tên: tra tên là một lượt gọi mạng
   * tới máy chủ của người khác, hỏng được và chậm được. Vị trí thì đã ghim
   * rồi, không có lý do gì để nó đứng chờ.
   */
  const pickPoint = (lat: number | null, lng: number | null) => {
    setForm((current) => ({ ...current, lat, lng }));

    if (lat === null || lng === null) return;

    areaFromCoords(lat, lng, lang).then((area) => {
      if (!area) return;
      // Kiểm lại trong setForm chứ không kiểm bên ngoài: giữa lúc chờ mạng
      // người dùng có thể đã tự gõ khu vực rồi.
      setForm((current) => (current.area.trim() ? current : { ...current, area }));
    });
  };

  // Đổi tiêu đề trên thanh điều hướng theo chế độ.
  useLayoutEffect(() => {
    navigation.setOptions({ title: t(isEdit ? 'screen.edit' : 'screen.new') });
  }, [navigation, isEdit, t]);

  /*
   * Việc phải làm sau khi có ảnh, dù ảnh đến từ máy ảnh hay từ thư viện.
   * Tách ra để hai lối không trôi lệch nhau — trước đây chỉ có một lối nên
   * phần này nằm luôn trong pickImage.
   */
  const usePickedAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    const picked = await shrink(asset);
    setImage(picked);
    setRemoveImage(false);

    /*
     * Chạy AI NGAY, không chờ người dùng bấm gì.
     *
     * Họ cứ gõ tiếp các ô khác, kết quả về lúc nào thì điền vào ô còn trống
     * lúc đó. Bắt bấm nút rồi ngồi nhìn vòng xoay 20 giây là phí thời gian của
     * người ta — trong 20 giây đó họ gõ xong nửa cái form rồi.
     *
     * Truyền thẳng ảnh vừa chọn vào, không đợi setImage có hiệu lực: state
     * trong React chỉ đổi ở lần vẽ sau, đọc ngay sẽ ra giá trị cũ.
     */
    analyzePhoto(picked);
  };

  /*
   * CHỤP THẲNG BẰNG MÁY ẢNH.
   *
   * Đây là lối tự nhiên nhất trên điện thoại và web không có: người nhặt được
   * con vật đang đứng ngay cạnh nó. Bắt họ chụp bằng app Camera, thoát ra, mở
   * lại LostPets rồi đi tìm trong thư viện là ba bước thừa — mà giữa chừng
   * con vật có thể chạy mất.
   *
   * Quyền camera KHÁC quyền thư viện ảnh, phải xin riêng. Người dùng có thể
   * đồng ý cái này mà từ chối cái kia.
   */
  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('form.permTitle'), t('form.permCamera'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1, // lấy bản gốc, việc nén để shrink() lo cho chắc tay
    });

    if (result.canceled) return;
    await usePickedAsset(result.assets[0]);
  };

  const pickImage = async () => {
    /*
     * Phải XIN QUYỀN truy cập thư viện ảnh trước. Web không có bước này —
     * thẻ <input type="file"> là trình duyệt tự lo.
     */
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('form.permTitle'), t('form.permText'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1, // lấy bản gốc, việc nén để bước dưới lo cho chắc tay
    });

    if (result.canceled) return;
    await usePickedAsset(result.assets[0]);
  };

  /*
   * Nhờ AI xem ảnh rồi điền hộ loài, giống, màu lông và mô tả.
   *
   * Nguyên tắc: CHỈ điền vào ô còn trống. Người dùng đã tự gõ gì thì giữ
   * nguyên — AI là trợ lý, không phải người quyết định.
   */
  const analyzePhoto = async (picked?: PickedImage) => {
    const photo = picked || image;
    if (!photo) return;

    /*
     * Đánh số mỗi lần chạy.
     *
     * Người dùng có thể đổi ảnh khác trong lúc AI đang xem ảnh cũ. Kết quả cũ
     * về sau sẽ điền nhầm thông tin của ảnh đã bỏ. Tăng số đếm trước khi gọi,
     * rồi lúc nhận kết quả so lại — khác số thì bỏ qua.
     */
    const runId = aiRun.current + 1;
    aiRun.current = runId;

    setAiLoading(true);
    setAiError('');
    setAiResult(null);

    try {
      /*
       * Gửi file trên React Native khác hẳn web: không có đối tượng File, phải
       * tự mô tả bằng { uri, name, type }. Giống hệt lúc đăng bài có ảnh.
       */
      const fileName = photo.uri.split('/').pop() || 'photo.jpg';
      // ?? '' vì split() về lý thuyết có thể trả mảng rỗng. Không bao giờ xảy
      // ra với chuỗi thật, nhưng TypeScript không biết thế nên cứ chặn cho gọn.
      const extension = (fileName.split('.').pop() ?? '').toLowerCase();

      const formData = new FormData();
      appendFile(formData, 'image', {
        uri: photo.uri,
        name: fileName,
        type: extension === 'png' ? 'image/png' : 'image/jpeg',
      });

      const { data } = await api.analyzeImage(formData);
      if (aiRun.current !== runId) return; // ảnh đã đổi, kết quả này lạc hậu

      setForm((current) => ({
        ...current,
        species: data.species !== 'Khác' ? data.species : current.species,
        breed: current.breed || data.breed,
        color: current.color || data.color,
        description: current.description || data.description,
      }));

      setAiResult(data);
    } catch (err) {
      if (aiRun.current !== runId) return;

      const status = errorStatus(err);
      // 422 = ảnh không có chó mèo. 429/504 = AI quá tải hoặc hết lượt.
      // ?? 0 vì status là undefined khi không gọi tới được máy chủ, mà
      // includes() đòi đúng một số. Không mã HTTP nào là 0 cả.
      const key =
        status === 422 ? 'ai.notPet' : [429, 504].includes(status ?? 0) ? 'ai.busy' : 'ai.error';
      setAiError(t(key));
    } finally {
      if (aiRun.current === runId) setAiLoading(false);
    }
  };

  const validate = () => {
    // Back-end trả 400 nếu thiếu, nhưng kiểm tra trước ở đây để báo lỗi rõ ràng hơn.
    /*
     * "as const" là thứ làm dòng t(`form.f.${key}`) bên dưới chạy được.
     *
     * Thiếu nó thì TypeScript coi key là string bất kỳ, nên `form.f.${key}`
     * cũng là chuỗi bất kỳ — mà t() chỉ nhận tên câu có thật. Có nó thì key
     * chỉ là một trong năm tên này, và cả năm câu form.f.* đều có trong
     * word.ts, nên hợp lệ.
     */
    const required = ['species', 'breed', 'color', 'area', 'contact'] as const;

    for (const key of required) {
      if (!form[key].trim()) {
        Alert.alert(t('form.missingTitle'), t('form.missingText', { field: t(`form.f.${key}`) }));
        return false;
      }
    }
    return true;
  };

  const dropPhoto = () => {
    setImage(null);
    // Đánh dấu để lúc lưu báo máy chủ xoá ảnh. Chỉ bỏ ảnh khỏi màn hình thôi
    // thì máy chủ vẫn giữ nguyên ảnh cũ.
    setRemoveImage(true);
    setAiResult(null);
    setAiError('');
  };

  /*
   * Chạm vào khung ảnh.
   *
   * Chưa có ảnh  -> mở thẳng thư viện, không hỏi han gì cho nhanh.
   * Đã có ảnh    -> mở bảng lựa chọn, vì lúc này có hai việc làm được.
   *
   * Dùng bảng TỰ VẼ chứ không dùng Alert của hệ điều hành. Alert để mỗi hệ
   * tự vẽ theo quy ước riêng: iOS xếp nút dọc và tô đỏ nút xoá, Android xếp
   * chữ phẳng nằm ngang và bỏ qua màu đỏ. Hai bên trông lệch hẳn nhau, mà
   * bên Android thì rời rạc khó bấm.
   */
  /*
   * Chạm vào khung ảnh thì LÚC NÀO cũng mở bảng chọn.
   *
   * Trước đây chưa có ảnh thì mở thẳng thư viện, vì lúc đó chỉ có một việc
   * làm được. Giờ có hai lối — chụp mới hoặc chọn từ máy — nên phải hỏi.
   */
  const handlePhotoPress = () => setPhotoMenu(true);

  /*
   * Gói dữ liệu thành FormData để gửi kèm file.
   *
   * Gửi file trên React Native khác hẳn web. Web dùng đối tượng File lấy từ
   * thẻ input. React Native không có File — phải tự mô tả bằng một object
   * { uri, name, type }, và chính object đó được đưa vào FormData.
   */
  const buildFormData = (fields: Record<string, unknown>) => {
    const formData = new FormData();
    // Mọi giá trị qua FormData đều thành chuỗi, kể cả null -> "null".
    // Back-end đã lường trước đúng chuỗi đó, xem pickEditable bên petController.
    Object.entries(fields).forEach(([key, value]) => formData.append(key, String(value)));

    if (image) {
      const fileName = image.uri.split('/').pop() || 'photo.jpg';
      const extension = (fileName.split('.').pop() ?? '').toLowerCase();

      appendFile(formData, 'image', {
        uri: image.uri,
        name: fileName,
        type: extension === 'png' ? 'image/png' : 'image/jpeg',
      });
    } else if (removeImage) {
      // Qua FormData mọi giá trị đều thành chuỗi, nên máy chủ nhận "true"
      // chứ không phải boolean — back-end đã lường trước cả hai kiểu.
      formData.append("removeImage", "true");
    }

    return formData;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);

    // Không có quyền sửa đặc điểm bí mật thì bỏ hẳn trường đó ra khỏi dữ liệu
    // gửi lên, để server giữ nguyên giá trị cũ.
    /*
     * Kiểu lỏng (Record) chứ không phải FormState, vì dòng dưới XOÁ HẲN một
     * trường đi. TypeScript không cho delete một trường bắt buộc — đúng, vì
     * sau đó object không còn đúng kiểu đã khai nữa.
     */
    const payload: Record<string, unknown> = { ...form };
    if (!canEditSecret) delete payload.secretDetail;

    try {
      if (isEdit) {
        const code = await claim.get(pet._id);

        /*
         * Hai cách gửi, tuỳ có đụng tới ảnh hay không:
         *
         *   Không đụng ảnh -> gửi JSON thường. Máy chủ không thấy trường ảnh
         *                     nên giữ nguyên ảnh cũ.
         *   Có đụng ảnh    -> phải gửi FormData, vì file không nhét vào JSON
         *                     được. Kèm theo removeImage nếu muốn xoá hẳn.
         */
        const touchesPhoto = Boolean(image) || removeImage;
        await api.updatePet(pet._id, touchesPhoto ? buildFormData(payload) : payload, code);
      } else {
        const { data } = await api.createPet(buildFormData(payload));

        /*
         * Back-end trả claimCode đúng MỘT LẦN này, và chỉ lưu bản băm.
         * Không cất lại ngay là mất quyền sửa/xoá tin vừa đăng vĩnh viễn.
         */
        // claimCode chỉ có ở lần tạo tin. ?? '' để claim.save tự bỏ qua khi
        // vì lý do nào đó máy chủ không trả về.
        await claim.save(data._id, data.claimCode ?? '');

        /*
         * Đã đăng nhập thì KHÔNG báo gì cả.
         *
         * Bài được gắn thẳng vào tài khoản (trường owner), nên sửa/xoá ở máy
         * nào cũng được — mã xác nhận không còn vai trò gì. Bày ra một đoạn
         * dặn dò giữ mã chỉ làm người dùng hoang mang về thứ họ không cần.
         */
        if (!isLoggedIn && data.claimCode) {
          setNewCode(data.claimCode);
          return; // Đóng hộp thoại xong mới quay lại, xem handleCodeDone
        }
      }

      navigation.goBack();
    } catch (err) {
      const status = errorStatus(err);

      /*
       * Mỗi mã lỗi một câu riêng.
       *
       * Phải tách rõ ba nhóm, trước đây tôi gộp sai:
       *   400/403/413 — lỗi do dữ liệu gửi lên, câu riêng cho từng cái
       *   5xx         — máy chủ hỏng, KHÔNG phải lỗi mạng của người dùng
       *   không có mã — thật sự không gọi tới được máy chủ
       *
       * Gộp 5xx vào nhóm "kiểm tra kết nối" là chỉ sai chỗ: người dùng đi
       * kiểm tra Wi-Fi trong khi lỗi nằm ở máy chủ.
       */
      // Khai rõ từng mã một thay vì ghép chuỗi `form.err.${status}`: ghép
      // chuỗi thì TypeScript không biết kết quả có phải tên câu có thật không.
      const byStatus: Record<number, Parameters<typeof t>[0]> = {
        400: 'form.err.400',
        403: 'form.err.403',
        413: 'form.err.413',
        502: 'form.err.502',
      };
      const known = status !== undefined && status in byStatus;
      const serverFault = (status ?? 0) >= 500;
      Alert.alert(
        t('form.failTitle'),
        t(
          known
            ? byStatus[status as number]
            : serverFault
              ? 'form.err.server'
              : 'form.err.network',
        ),
      );
      setSaving(false);
    }
  };

  return (
    /*
     * KeyboardAvoidingView: khi bàn phím hiện lên, nó đẩy nội dung lên theo.
     * Thiếu nó thì ô nhập ở nửa dưới màn hình bị bàn phím che mất, gõ không
     * thấy chữ. Web không có vấn đề này.
     */
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        /* pb-12 = 48px = spacing.xl * 2, chừa chỗ cho thanh điều hướng dưới */
        contentContainerClassName="p-lg pb-12"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="mb-sm mt-lg text-[11px] font-bold tracking-[0.5px] text-text-muted">{t('form.status')}</Text>
        <View className="flex-row gap-md">
          <Choice
            label={t('form.lostBtn')}
            active={form.type === 'lost'}
            activeColor={colors.lost}
            onPress={() => update('type', 'lost')}
          />
          <Choice
            label={t('form.foundBtn')}
            active={form.type === 'found'}
            activeColor={colors.found}
            onPress={() => update('type', 'found')}
          />
        </View>

        <Text className="mb-sm mt-lg text-[11px] font-bold tracking-[0.5px] text-text-muted">{t('form.speciesLabel')}</Text>
        <View className="flex-row gap-md">
          <Choice
            label={t('form.dog')}
            active={form.species === 'Chó'}
            activeColor={colors.orange}
            onPress={() => update('species', 'Chó')}
          />
          <Choice
            label={t('form.cat')}
            active={form.species === 'Mèo'}
            activeColor={colors.teal}
            onPress={() => update('species', 'Mèo')}
          />
        </View>

        <Field
          label={t('form.name')}
          value={form.name}
          onChangeText={(v) => update('name', v)}
          placeholder={t('form.namePh')}
        />
        <Field
          label={t('form.breed')}
          value={form.breed}
          onChangeText={(v) => update('breed', v)}
          placeholder={t('form.breedPh')}
        />
        <Field
          label={t('form.color')}
          value={form.color}
          onChangeText={(v) => update('color', v)}
          placeholder={t('form.colorPh')}
        />
        <Field
          label={t('form.area')}
          value={form.area}
          onChangeText={(v) => update('area', v)}
          placeholder={t('form.areaPh')}
        />

        {/*
         * Bản đồ đặt ngay dưới ô "Khu vực" vì hai thứ nói cùng một chuyện: ô
         * trên là tên khu vực bằng chữ, bản đồ là chỗ đó trên bản đồ. Không
         * bắt buộc — tin không có toạ độ vẫn đăng được bình thường.
         */}
        <View className="mt-lg">
          <PetMap
            mode="pick"
            lat={form.lat}
            lng={form.lng}
            onChange={({ lat, lng }) => pickPoint(lat, lng)}
          />
        </View>

        <Field
          label={t('form.contact')}
          value={form.contact}
          onChangeText={(v) => update('contact', v)}
          placeholder={t('form.contactPh')}
          keyboardType="default"
        />
        <Field
          label={t('form.desc')}
          value={form.description}
          onChangeText={(v) => update('description', v)}
          placeholder={t('form.descPh')}
          multiline
        />

        {/*
          Đặc điểm bí mật — vũ khí chống lừa đảo.

          Server không bao giờ trả trường này ra ngoài, kể cả ở danh sách hay
          tin công khai. Chỉ chủ bài mới đọc lại được. Khi có người nhắn "tôi
          nhặt được rồi", hỏi họ mô tả đặc điểm này — người thật sự đang giữ
          con vật mới trả lời đúng.
        */}
        {canEditSecret && (
          <>
            <Field
              label={t('secret.label')}
              icon={<Ionicons name="lock-closed" size={12} color={colors.secretText} />}
              value={form.secretDetail}
              onChangeText={(v) => update('secretDetail', v)}
              placeholder={t('secret.placeholder')}
              multiline
            />
            {/* -mt-sm: kéo câu gợi ý sát lên ô nhập ở trên, cho thấy nó nói
                về ô đó chứ không phải mở một mục mới. */}
            <Text className="-mt-sm text-[12px] leading-[18px] text-text-muted">
              {t('secret.hint')}
            </Text>
          </>
        )}

        {/* Chọn ảnh chỉ có khi đăng mới — PUT /pets/:id không nhận upload file */}
        {(
          <>
            <Text className="mb-sm mt-lg text-[11px] font-bold tracking-[0.5px] text-text-muted">{t('form.photo')}</Text>
            {/*
              Ba trạng thái của khung ảnh:
                1. Vừa chọn ảnh mới      -> hiện ảnh đó
                2. Đang sửa, còn ảnh cũ  -> hiện ảnh cũ từ máy chủ
                3. Chưa có gì            -> khung gạch đứt mời chọn
            */}
            <TouchableOpacity
              className="min-h-[110px] items-center justify-center rounded-md border-2 border-dashed border-border-strong p-lg"
              onPress={handlePhotoPress}
              activeOpacity={0.8}
            >
              {image ? (
                <Image source={{ uri: image.uri }} className="h-[180px] w-full rounded-md" />
              ) : keptImage ? (
                <Image source={{ uri: keptImage }} className="h-[180px] w-full rounded-md" />
              ) : (
                <Text className="text-[14px] text-text-muted">{t('form.photoPick')}</Text>
              )}
            </TouchableOpacity>

            {/* Có ảnh thì nhắc nhẹ là chạm vào ảnh sẽ có lựa chọn */}
            {(image || keptImage) && (
              <Text className="mt-1.5 text-center text-[11.5px] text-text-muted">
                {t('form.photoTapHint')}
              </Text>
            )}

            {/*
              Nút AI chỉ hiện khi đã có ảnh — không có ảnh thì chẳng có gì để
              xem, bày nút ra chỉ tổ gây thắc mắc.
            */}
            {/*
              Một dòng trạng thái mảnh, không phải nút bấm.

              AI đã tự chạy từ lúc chọn ảnh rồi, nên không còn gì để bấm. Ba
              trạng thái nối tiếp nhau trong cùng một chỗ: đang xem → đã điền
              xong (kèm % chắc chắn) → hoặc hỏng (kèm link Thử lại).
            */}
            {!!image && (
              /*
               * min-h-[22px]: giữ sẵn chỗ cho một dòng, để lúc trạng thái đổi
               * thì phần bên dưới không nhảy lên nhảy xuống.
               */
              <View className="mt-sm min-h-[22px]">
                {aiLoading && (
                  <View className="flex-row flex-wrap items-center gap-sm">
                    <ActivityIndicator size="small" color={colors.aiText} />
                    <Text className="flex-1 text-[12px] leading-[17px] text-ai-text">{t('ai.working')}</Text>
                  </View>
                )}

                {!aiLoading && !!aiResult && (
                  <View className="flex-row flex-wrap items-center gap-sm">
                    <Ionicons name="checkmark-circle" size={14} color={colors.aiText} />
                    <Text className="flex-1 text-[12px] leading-[17px] text-ai-text">
                      {t('ai.filled')}{' '}
                      <Text className="font-extrabold">{aiResult.confidence}%</Text>
                    </Text>
                  </View>
                )}

                {!aiLoading && !!aiError && (
                  <View className="flex-row flex-wrap items-center gap-sm">
                    <Text className="text-[12px] leading-[17px] text-text-muted">{aiError}</Text>
                    <Text
                      className="text-[12px] font-extrabold text-ai-accent"
                      onPress={() => analyzePhoto()}
                    >
                      {t('ai.retry')}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}


        <TouchableOpacity
          className={`mt-xl items-center rounded-md bg-primary py-4 ${
            saving ? 'opacity-50' : ''
          }`}
          onPress={handleSubmit}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text className="text-[15px] font-bold text-on-primary">
            {t(saving ? 'form.saving' : isEdit ? 'form.save' : 'form.submit')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/*
        Hiện mã cho khách vãng lai. Người dùng bấm Xong mới quay lại danh sách
        — nếu quay lại ngay thì hộp thoại biến mất theo màn hình, không kịp chép.
      */}
      <ClaimCodeModal
        visible={!!newCode}
        mode="show"
        code={newCode}
        onClose={() => {
          setNewCode('');
          navigation.goBack();
        }}
      />

      {/*
        Bảng lựa chọn ảnh, trượt lên từ đáy.

        Tự vẽ nên iPhone và Android trông giống hệt nhau, và theo đúng màu của
        app. Nút Xoá ảnh đỏ ở cả hai bên — Android bỏ qua thuộc tính "nguy
        hiểm" của Alert hệ thống nên nếu dùng Alert thì nó không đỏ.
      */}
      <Modal
        visible={photoMenu}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setPhotoMenu(false)}
      >
        {/* scrim lưu dạng rgba vì đã kèm sẵn độ trong suốt, nên không tách
            thành ba kênh để làm lớp tiện ích được — phải lấy qua useTheme. */}
        <View className="flex-1 justify-end" style={{ backgroundColor: colors.scrim }}>
          {/* Chạm ra ngoài là đóng — thói quen quen thuộc với bảng trượt */}
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPhotoMenu(false)} />

          <View
            className="rounded-t-[24px] bg-background px-lg pt-lg"
            style={{ paddingBottom: spacing.lg + insets.bottom }}
          >
            <Text className="mb-md text-center text-[13px] font-bold text-text-muted">
              {t('form.photoOptions')}
            </Text>

            {/*
              Chụp ảnh đặt TRÊN chọn từ thư viện.
              Người nhặt được con vật đang đứng ngay cạnh nó, nên chụp mới là
              việc hay xảy ra hơn. Thứ tự trong bảng nói lên điều đó.
            */}
            <TouchableOpacity
              className="mb-sm bg-surface flex-row items-center justify-center gap-sm rounded-md py-[15px]"
              onPress={() => {
                setPhotoMenu(false);
                takePhoto();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-outline" size={19} color={colors.text} />
              <Text className="text-[15px] font-bold text-text">{t('form.photoTake')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="mb-sm bg-surface flex-row items-center justify-center gap-sm rounded-md py-[15px]"
              onPress={() => {
                setPhotoMenu(false);
                pickImage();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="images-outline" size={19} color={colors.text} />
              <Text className="text-[15px] font-bold text-text">{t('form.photoLibrary')}</Text>
            </TouchableOpacity>

            {/* Chưa có ảnh thì không có gì để xoá — đừng vẽ một nút vô nghĩa */}
            {(image || keptImage) && (
              <TouchableOpacity
                className="mb-sm bg-surface flex-row items-center justify-center gap-sm rounded-md py-[15px]"
                onPress={() => {
                  setPhotoMenu(false);
                  dropPhoto();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={19} color={colors.danger} />
                <Text className="text-[15px] font-bold text-danger">
                  {t('form.photoRemove')}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              /*
                Nút Huỷ viết riêng cả chuỗi, không ghép "mb-sm ... mb-0".
                Hai lớp cùng khai một thuộc tính thì cái nào thắng là theo
                thứ tự trong file CSS sinh ra, không theo thứ tự trong chuỗi
                — nên viết thẳng là chắc chắn.
              */
              className="bg-transparent flex-row items-center justify-center gap-sm rounded-md py-[15px]"
              onPress={() => setPhotoMenu(false)}
              activeOpacity={0.7}
            >
              <Text className="text-[15px] font-bold text-text-muted">
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function Choice({
  label,
  active,
  activeColor,
  onPress,
}: {
  label: string;
  active: boolean;
  activeColor: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      // Màu lúc đang chọn do bên gọi truyền vào (mất/thấy, chó/mèo) nên ở style
      className="min-h-11 flex-1 items-center justify-center rounded-md border-2 border-border-strong py-3"
      style={active && { backgroundColor: activeColor, borderColor: activeColor }}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text
        className={`text-[14px] font-bold ${active ? 'text-on-primary' : 'text-text-soft'}`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Field({
  label,
  icon,
  multiline,
  ...props
}: ComponentProps<typeof TextInput> & { label: string; icon?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View className="mt-lg">
      {/*
        Icon lồng THẲNG trong Text, không bọc View riêng. React Native cho
        phép vậy vì icon thực chất cũng là chữ, nên nó tự nằm đúng đường chân
        chữ — bọc View thì phải tự canh lại cho khớp.
      */}
      <Text className="mb-1.5 text-[13px] font-semibold text-text">
        {icon}
        {icon ? '  ' : null}
        {label}
      </Text>
      <TextInput
        className={`rounded-md border border-border-strong px-md py-[11px] text-[14px] text-text ${
          multiline ? 'h-[90px]' : ''
        }`}
        // textAlignVertical là thuộc tính chỉ có ở React Native, không có
        // lớp tiện ích tương ứng — để style.
        style={multiline && { textAlignVertical: 'top' }}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        {...props}
      />
    </View>
  );
}
