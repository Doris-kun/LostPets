import { useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import api from '../api';
import claim from '../claim';
import ClaimCodeModal from '../components/ClaimCodeModal';
import { useAuth } from '../context/auth';
import { useLanguage } from '../context/language';
import { radius, spacing } from '../theme';
import { createThemedStyles, useTheme, useThemedStyles } from '../context/theme';

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

const EMPTY_FORM = {
  type: 'lost',
  name: '',
  species: '',
  breed: '',
  color: '',
  area: '',
  contact: '',
  description: '',
  secretDetail: '',
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

async function shrink(asset) {
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

export default function FormScreen({ route, navigation }) {
  const { mode, pet } = route.params;
  const isEdit = mode === 'edit';
  const { t } = useLanguage();
  const { isLoggedIn } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);

  const [form, setForm] = useState(() => {
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
  const [image, setImage] = useState(null);
  const [saving, setSaving] = useState(false);

  // Phần AI: đang chạy, kết quả, và lỗi nếu có
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState('');

  // Mã vừa nhận sau khi đăng bài, chỉ dùng cho khách chưa đăng nhập
  const [newCode, setNewCode] = useState('');

  /*
   * Số thứ tự lần chạy AI. Dùng useRef chứ không useState: nó chỉ để so sánh
   * bên trong hàm, đổi nó không cần vẽ lại màn hình.
   */
  const aiRun = useRef(0);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  // Đổi tiêu đề trên thanh điều hướng theo chế độ.
  useLayoutEffect(() => {
    navigation.setOptions({ title: t(isEdit ? 'screen.edit' : 'screen.new') });
  }, [navigation, isEdit, t]);

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

    const picked = await shrink(result.assets[0]);
    setImage(picked);

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
   * Nhờ AI xem ảnh rồi điền hộ loài, giống, màu lông và mô tả.
   *
   * Nguyên tắc: CHỈ điền vào ô còn trống. Người dùng đã tự gõ gì thì giữ
   * nguyên — AI là trợ lý, không phải người quyết định.
   */
  const analyzePhoto = async (picked) => {
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
      const extension = fileName.split('.').pop().toLowerCase();

      const formData = new FormData();
      formData.append('image', {
        uri: image.uri,
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

      const status = err.response?.status;
      // 422 = ảnh không có chó mèo. 429/504 = AI quá tải hoặc hết lượt.
      const key = status === 422 ? 'ai.notPet' : [429, 504].includes(status) ? 'ai.busy' : 'ai.error';
      setAiError(t(key));
    } finally {
      if (aiRun.current === runId) setAiLoading(false);
    }
  };

  const validate = () => {
    // Back-end trả 400 nếu thiếu, nhưng kiểm tra trước ở đây để báo lỗi rõ ràng hơn.
    const required = ['species', 'breed', 'color', 'area', 'contact'];

    for (const key of required) {
      if (!form[key].trim()) {
        Alert.alert(t('form.missingTitle'), t('form.missingText', { field: t(`form.f.${key}`) }));
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);

    // Không có quyền sửa đặc điểm bí mật thì bỏ hẳn trường đó ra khỏi dữ liệu
    // gửi lên, để server giữ nguyên giá trị cũ.
    const payload = { ...form };
    if (!canEditSecret) delete payload.secretDetail;

    try {
      if (isEdit) {
        // PUT gửi JSON thường. Không gửi `image` nên ảnh cũ được giữ nguyên.
        const code = await claim.get(pet._id);
        await api.updatePet(pet._id, payload, code);
      } else {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => formData.append(key, value));

        if (image) {
          /*
           * Gửi file trên React Native khác hẳn web.
           *
           * Web: append(File) — đối tượng File lấy từ <input type="file">.
           * RN: không có File. Phải tự mô tả bằng object { uri, name, type },
           * và chính cái object này được append vào FormData.
           */
          const fileName = image.uri.split('/').pop() || 'photo.jpg';
          const extension = fileName.split('.').pop().toLowerCase();

          formData.append('image', {
            uri: image.uri,
            name: fileName,
            type: extension === 'png' ? 'image/png' : 'image/jpeg',
          });
        }

        const { data } = await api.createPet(formData);

        /*
         * Back-end trả claimCode đúng MỘT LẦN này, và chỉ lưu bản băm.
         * Không cất lại ngay là mất quyền sửa/xoá tin vừa đăng vĩnh viễn.
         */
        await claim.save(data._id, data.claimCode);

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
      const status = err.response?.status;

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
      const known = [400, 403, 413].includes(status);
      const serverFault = status >= 500;
      // TẠM: kèm nguyên văn lỗi để chẩn đoán, gỡ sau khi tìm ra nguyên nhân
      const detail = `

[${status || 'không có mã'}] ${err.message || ''}`;
      Alert.alert(t('form.failTitle'), t(known ? `form.err.${status}` : serverFault ? 'form.err.server' : 'form.err.network') + detail);
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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>{t('form.status')}</Text>
        <View style={styles.row}>
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

        <Text style={styles.sectionLabel}>{t('form.speciesLabel')}</Text>
        <View style={styles.row}>
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
              label={`🔒  ${t('secret.label')}`}
              value={form.secretDetail}
              onChangeText={(v) => update('secretDetail', v)}
              placeholder={t('secret.placeholder')}
              multiline
            />
            <Text style={styles.hint}>{t('secret.hint')}</Text>
          </>
        )}

        {/* Chọn ảnh chỉ có khi đăng mới — PUT /pets/:id không nhận upload file */}
        {!isEdit && (
          <>
            <Text style={styles.sectionLabel}>{t('form.photo')}</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.8}>
              {image ? (
                <Image source={{ uri: image.uri }} style={styles.preview} />
              ) : (
                <Text style={styles.imagePickerText}>{t('form.photoPick')}</Text>
              )}
            </TouchableOpacity>

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
              <View style={styles.aiBlock}>
                {aiLoading && (
                  <View style={styles.aiRow}>
                    <ActivityIndicator size="small" color={colors.aiText} />
                    <Text style={styles.aiWorking}>{t('ai.working')}</Text>
                  </View>
                )}

                {!aiLoading && !!aiResult && (
                  <View style={styles.aiRow}>
                    <Text style={styles.aiCheck}>✓</Text>
                    <Text style={styles.aiDone}>
                      {t('ai.filled')} <Text style={styles.aiConfidence}>{aiResult.confidence}%</Text>
                    </Text>
                  </View>
                )}

                {!aiLoading && !!aiError && (
                  <View style={styles.aiRow}>
                    <Text style={styles.aiErrorText}>{aiError}</Text>
                    <Text style={styles.aiRetry} onPress={() => analyzePhoto()}>
                      {t('ai.retry')}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}

        {isEdit && <Text style={styles.note}>{t('form.noImageEdit')}</Text>}

        <TouchableOpacity
          style={[styles.submit, saving && styles.disabled]}
          onPress={handleSubmit}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={styles.submitText}>
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
    </KeyboardAvoidingView>
  );
}

function Choice({ label, active, activeColor, onPress }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);
  return (
    <TouchableOpacity
      style={[styles.choice, active && { backgroundColor: activeColor, borderColor: activeColor }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Field({ label, multiline, ...props }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        {...props}
      />
    </View>
  );
}

const themedStyles = createThemedStyles((colors, shadow) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', gap: spacing.md },

  choice: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  choiceText: { fontSize: 14, fontWeight: '700', color: colors.textSoft },
  choiceTextActive: { color: colors.onPrimary },

  field: { marginTop: spacing.lg },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.text,
  },
  inputMultiline: { height: 90, textAlignVertical: 'top' },

  imagePicker: {
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
  },
  imagePickerText: { color: colors.textMuted, fontSize: 14 },
  preview: { width: '100%', height: 180, borderRadius: radius.md },

  hint: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: -spacing.sm,
  },
  aiBlock: { marginTop: spacing.sm, minHeight: 22 },
  aiRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  aiWorking: { flex: 1, fontSize: 12, color: colors.aiText, lineHeight: 17 },
  aiCheck: { fontSize: 13, fontWeight: '800', color: colors.aiText },
  aiDone: { flex: 1, fontSize: 12, color: colors.aiText, lineHeight: 17 },
  aiConfidence: { fontWeight: '800' },
  aiErrorText: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  aiRetry: { fontSize: 12, fontWeight: '800', color: colors.aiAccent },

  note: { fontSize: 12, color: colors.textMuted, marginTop: spacing.lg, fontStyle: 'italic' },

  submit: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  submitText: { color: colors.onPrimary, fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  }),
);
