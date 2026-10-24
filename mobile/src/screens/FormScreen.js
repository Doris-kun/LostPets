import { useLayoutEffect, useState } from 'react';
import {
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
import api from '../api';
import claim from '../claim';
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

export default function FormScreen({ route, navigation }) {
  const { mode, pet } = route.params;
  const isEdit = mode === 'edit';
  const { t } = useLanguage();
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
      quality: 0.7, // nén bớt, ảnh gốc điện thoại thường 3-5MB, tải lên rất chậm
    });

    if (!result.canceled) setImage(result.assets[0]);
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

        if (data.claimCode) {
          Alert.alert(
            t('form.postedTitle'),
            t('form.postedText', { code: data.claimCode }),
          );
        }
      }

      navigation.goBack();
    } catch (err) {
      const status = err.response?.status;

      // Mỗi mã lỗi một câu riêng, tra thẳng trong từ điển theo số.
      // Mã lạ (500, mất mạng...) thì rơi về câu chung.
      const known = [400, 403, 413].includes(status);
      Alert.alert(t('form.failTitle'), t(known ? `form.err.${status}` : 'form.err.network'));
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
