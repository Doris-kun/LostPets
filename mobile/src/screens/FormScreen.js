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
import { colors, radius, spacing } from '../theme';

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
};

export default function FormScreen({ route, navigation }) {
  const { mode, pet } = route.params;
  const isEdit = mode === 'edit';

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
    };
  });

  // Ảnh mới chọn từ máy. Chỉ dùng khi đăng mới — PUT không nhận upload file.
  const [image, setImage] = useState(null);
  const [saving, setSaving] = useState(false);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  // Đổi tiêu đề trên thanh điều hướng theo chế độ.
  useLayoutEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Chỉnh sửa tin' : 'Đăng tin mới' });
  }, [navigation, isEdit]);

  const pickImage = async () => {
    /*
     * Phải XIN QUYỀN truy cập thư viện ảnh trước. Web không có bước này —
     * thẻ <input type="file"> là trình duyệt tự lo.
     */
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền truy cập', 'Hãy cho phép ứng dụng đọc thư viện ảnh để chọn ảnh.');
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
    const required = { species: 'loài', breed: 'giống', color: 'màu lông', area: 'khu vực', contact: 'liên hệ' };

    for (const [key, label] of Object.entries(required)) {
      if (!form[key].trim()) {
        Alert.alert('Thiếu thông tin', `Vui lòng điền ${label}.`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      if (isEdit) {
        // PUT gửi JSON thường. Không gửi `image` nên ảnh cũ được giữ nguyên.
        const code = await claim.get(pet._id);
        await api.updatePet(pet._id, form, code);
      } else {
        const formData = new FormData();
        Object.entries(form).forEach(([key, value]) => formData.append(key, value));

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
            'Đã đăng tin',
            `Mã xác nhận của tin này là ${data.claimCode}.\n\n` +
              'Máy bạn đã tự lưu mã, nên sửa hoặc xoá tin ngay trên máy này thì ' +
              'không cần nhập lại. Muốn thao tác từ máy khác thì phải có mã này.',
          );
        }
      }

      navigation.goBack();
    } catch (err) {
      const status = err.response?.status;

      let message = 'Không gửi được lên server. Kiểm tra kết nối.';
      if (status === 400) message = 'Thiếu trường bắt buộc.';
      else if (status === 403) message = 'Tin này đăng từ máy khác nên máy bạn không giữ mã xác nhận.';
      else if (status === 413) message = 'Ảnh quá lớn. Server chỉ nhận ảnh tối đa 5MB.';

      Alert.alert('Lưu thất bại', message);
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
        <Text style={styles.sectionLabel}>TRẠNG THÁI</Text>
        <View style={styles.row}>
          <Choice
            label="Bị mất"
            active={form.type === 'lost'}
            activeColor={colors.lost}
            onPress={() => update('type', 'lost')}
          />
          <Choice
            label="Tìm thấy"
            active={form.type === 'found'}
            activeColor={colors.found}
            onPress={() => update('type', 'found')}
          />
        </View>

        <Text style={styles.sectionLabel}>LOÀI</Text>
        <View style={styles.row}>
          <Choice
            label="Chó"
            active={form.species === 'Chó'}
            activeColor={colors.orange}
            onPress={() => update('species', 'Chó')}
          />
          <Choice
            label="Mèo"
            active={form.species === 'Mèo'}
            activeColor={colors.teal}
            onPress={() => update('species', 'Mèo')}
          />
        </View>

        <Field label="Tên (không bắt buộc)" value={form.name} onChangeText={(v) => update('name', v)} placeholder="Mimi, Lucky, Bông..." />
        <Field label="Giống" value={form.breed} onChangeText={(v) => update('breed', v)} placeholder="Poodle, Corgi..." />
        <Field label="Màu lông" value={form.color} onChangeText={(v) => update('color', v)} placeholder="Đen, Trắng, Vàng..." />
        <Field label="Khu vực" value={form.area} onChangeText={(v) => update('area', v)} placeholder="Quận 1, TP.HCM" />
        <Field
          label="Liên hệ"
          value={form.contact}
          onChangeText={(v) => update('contact', v)}
          placeholder="Số điện thoại hoặc email"
          keyboardType="default"
        />
        <Field
          label="Mô tả"
          value={form.description}
          onChangeText={(v) => update('description', v)}
          placeholder="Đặc điểm nhận dạng, hoàn cảnh mất / tìm thấy..."
          multiline
        />

        {/* Chọn ảnh chỉ có khi đăng mới — PUT /pets/:id không nhận upload file */}
        {!isEdit && (
          <>
            <Text style={styles.sectionLabel}>ẢNH (KHÔNG BẮT BUỘC)</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.8}>
              {image ? (
                <Image source={{ uri: image.uri }} style={styles.preview} />
              ) : (
                <Text style={styles.imagePickerText}>Bấm để chọn ảnh từ máy</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {isEdit && <Text style={styles.note}>Không đổi được ảnh ở màn sửa — API chưa hỗ trợ.</Text>}

        <TouchableOpacity
          style={[styles.submit, saving && styles.disabled]}
          onPress={handleSubmit}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={styles.submitText}>
            {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Đăng báo cáo'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Choice({ label, active, activeColor, onPress }) {
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

const styles = StyleSheet.create({
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
  choiceTextActive: { color: '#fff' },

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

  note: { fontSize: 12, color: colors.textMuted, marginTop: spacing.lg, fontStyle: 'italic' },

  submit: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
