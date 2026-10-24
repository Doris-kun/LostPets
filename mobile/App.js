import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { LanguageProvider, useLanguage } from './src/context/language';
import { ThemeProvider, useTheme } from './src/context/theme';
import HomeScreen from './src/screens/HomeScreen';
import DetailScreen from './src/screens/DetailScreen';
import FormScreen from './src/screens/FormScreen';
import SplashScreen from './src/screens/SplashScreen';

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

/*
 * Giữ splash gốc của hệ điều hành trên màn hình, đừng để nó tự tắt.
 *
 * Mặc định nó biến mất ngay khi React vẽ xong khung đầu tiên — lúc đó màn chào
 * của mình chưa kịp dựng, nên người dùng thấy một nháy trắng. Giữ lại rồi tự
 * tắt đúng lúc thì hai lớp nối liền mạch.
 *
 * Gọi ở ngoài component để chạy sớm nhất có thể.
 */
ExpoSplashScreen.preventAutoHideAsync().catch(() => {
  // Gọi hai lần hoặc splash đã tắt rồi thì ném lỗi. Không ảnh hưởng gì.
});

const Stack = createNativeStackNavigator();

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  // App đã dựng xong -> tắt splash gốc, nhường chỗ cho màn chào có hiệu ứng.
  useEffect(() => {
    ExpoSplashScreen.hideAsync().catch(() => {});
  }, []);

  // useCallback để SplashScreen không nhận hàm mới sau mỗi lần render,
  // tránh việc useEffect bên đó chạy lại giữa chừng animation.
  const finishSplash = useCallback(() => setShowSplash(false), []);

  return (
    /*
     * SafeAreaProvider đo phần màn hình bị che: tai thỏ, Dynamic Island, thanh
     * trạng thái, vạch Home ở đáy. Màn hình nào tự vẽ thanh đầu (headerShown:
     * false) thì phải tự chừa chỗ, không thì nội dung chui lên dưới tai thỏ.
     *
     * Các màn còn lại dùng thanh đầu mặc định của react-navigation nên đã được
     * lo sẵn, không cần làm gì.
     */
    <SafeAreaProvider>
      {/* Bọc ngoài cùng để MỌI màn hình đều gọi được useTheme() và useLanguage() */}
      <ThemeProvider>
        <LanguageProvider>
          <Root showSplash={showSplash} onSplashFinish={finishSplash} />
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/*
 * Khung gốc. Tách ra khỏi App vì useTheme() chỉ gọi được BÊN TRONG
 * ThemeProvider — viết thẳng trong App thì nó nằm ngoài, React báo lỗi ngay.
 */
function Root({ showSplash, onSplashFinish }) {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <NavigationContainer
            /*
             * Báo cho react-navigation biết đang ở chế độ nào. Thiếu dòng này
             * thì nền MẶC ĐỊNH của nó vẫn trắng, nên lúc trượt từ màn này sang
             * màn kia sẽ loé một vệt trắng ở rìa — rất khó chịu trên nền tối.
             */
            theme={isDark ? DarkTheme : DefaultTheme}
          >
            {/* Giờ đồng hồ và cột sóng: nền tối thì phải chữ sáng, và ngược lại */}
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <RootStack />
          </NavigationContainer>

          {/*
            Đặt SAU NavigationContainer và cùng cấp với nó, nên nó phủ lên trên.
            Danh sách vẫn gọi API chạy ngầm phía dưới trong lúc hiệu ứng chạy —
            nhờ vậy tắt màn chào là có dữ liệu sẵn, không phải chờ thêm.
          */}
      {showSplash && <SplashScreen onFinish={onSplashFinish} />}
    </View>
  );
}

/*
 * Tách riêng thành component con vì một lý do duy nhất: useLanguage() chỉ gọi
 * được ở BÊN TRONG LanguageProvider. Viết thẳng trong App thì nó nằm ngoài,
 * React báo lỗi ngay. Giống hệt chuyện NavBar bên web phải tách ra vì
 * useLocation() bắt buộc nằm trong <BrowserRouter>.
 */
function RootStack() {
  const { t } = useLanguage();
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
        /*
         * iOS ghi tên màn hình trước cạnh mũi tên Back. Mặc định nó lấy tên
         * KỸ THUẬT của màn — "Home" — nên đang xem tiếng Việt vẫn thấy chữ
         * tiếng Anh. Đặt đè bằng chữ trong từ điển.
         */
        headerBackTitle: t('screen.back'),
      }}
    >
      {/* Màn hình chính tự vẽ thanh đầu riêng (có logo + slogan) nên tắt thanh mặc định */}
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="Detail"
        component={DetailScreen}
        options={{ title: t('screen.detail') }}
      />
      {/* Tiêu đề màn này do chính nó đặt, tuỳ theo đang đăng mới hay sửa */}
      <Stack.Screen name="Form" component={FormScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
