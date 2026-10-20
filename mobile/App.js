import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './src/screens/HomeScreen';
import DetailScreen from './src/screens/DetailScreen';
import FormScreen from './src/screens/FormScreen';
import { colors } from './src/theme';

/*
 * Điều hướng giữa các màn hình.
 *
 * Web dùng react-router-dom với URL: '/', '/pet/:id', '/new'.
 * Điện thoại không có thanh địa chỉ, nên khái niệm khác hẳn: các màn hình xếp
 * CHỒNG lên nhau như chồng giấy (stack). Mở màn mới là đặt thêm tờ lên trên,
 * bấm Back là bỏ tờ trên cùng đi — kèm sẵn hiệu ứng trượt và nút Back của hệ
 * điều hành, không phải tự làm.
 *
 * Truyền dữ liệu cũng khác:
 *   Web:  <Link to={'/pet/' + id}>         -> đọc bằng useParams()
 *   RN:   navigation.navigate('Detail', { id })  -> đọc bằng route.params
 */

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />

      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {/* Màn hình chính tự vẽ thanh đầu riêng (có logo + slogan) nên tắt thanh mặc định */}
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Detail" component={DetailScreen} options={{ title: 'Chi tiết' }} />
        {/* Tiêu đề màn này do chính nó đặt, tuỳ theo đang đăng mới hay sửa */}
        <Stack.Screen name="Form" component={FormScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
