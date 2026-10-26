import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { AuthProvider } from './src/context/auth';
import { LanguageProvider, useLanguage } from './src/context/language';
import { ThemeProvider, useTheme } from './src/context/theme';
import HomeScreen from './src/screens/HomeScreen';
import DetailScreen from './src/screens/DetailScreen';
import FormScreen from './src/screens/FormScreen';
import AuthScreen from './src/screens/AuthScreen';
import ChatScreen from './src/screens/ChatScreen';
import MyPetsScreen from './src/screens/MyPetsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
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
const Tab = createBottomTabNavigator();

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
          <AuthProvider>
            <Root showSplash={showSplash} onSplashFinish={finishSplash} />
          </AuthProvider>
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
 * Thanh điều hướng dưới đáy — ba nhánh chính của app.
 *
 * Khác với Stack (xếp chồng, bấm Back bỏ tờ trên cùng), Tab là ba màn CHẠY
 * SONG SONG: chuyển qua lại không mất vị trí cuộn, không tạo lịch sử Back.
 *
 * Bên web ba nhánh này nằm trên thanh điều hướng trên cùng. Điện thoại cầm
 * một tay nên đặt dưới đáy, ngón cái với tới được.
 *
 * Nút + đăng bài vẫn là nút tròn nổi ở trang chủ, không làm thành tab — đó là
 * hành động, không phải một nơi để tới.
 */
function MainTabs() {
  const { t } = useLanguage();
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.borderLight,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: t('tab.home'),
          // Tab đang chọn thì icon tô đặc, chưa chọn thì chỉ có viền —
          // thêm một dấu hiệu nữa ngoài màu, cho người khó phân biệt màu.
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MyPets"
        component={MyPetsScreen}
        options={{
          title: t('tab.mine'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'paw' : 'paw-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: t('tab.settings'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
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
      {/* Ba tab chính. Chúng tự vẽ thanh đầu riêng nên tắt thanh mặc định */}
      <Stack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="Detail"
        component={DetailScreen}
        options={{ title: t('screen.detail') }}
      />
      {/* Tiêu đề màn này do chính nó đặt, tuỳ theo đang đăng mới hay sửa */}
      <Stack.Screen name="Form" component={FormScreen} />
      {/* Tiêu đề màn này do chính nó đặt, tuỳ đang ở tab Đăng nhập hay Đăng ký */}
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: t('chat.title') }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
