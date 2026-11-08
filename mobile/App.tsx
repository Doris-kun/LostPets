/*
 * NativeWind: nap bang style do Tailwind sinh ra.
 *
 * Phai dung o day, truoc moi import khac cua app. Nap muon hon thi mot so
 * component vẽ xong rồi lớp tiện ích mới tới nơi.
 */
import './global.css';

import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from './src/context/auth';
import { LanguageProvider, useLanguage } from './src/context/language';
import { ThemeProvider, useTheme } from './src/context/theme';
import HomeScreen from './src/screens/HomeScreen';
import DetailScreen from './src/screens/DetailScreen';
import FormScreen from './src/screens/FormScreen';
import AuthScreen from './src/screens/AuthScreen';
import ChatScreen from './src/screens/ChatScreen';
import MyPetsScreen from './src/screens/MyPetsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AdminScreen from './src/screens/AdminScreen';
import PrivacyScreen from './src/screens/PrivacyScreen';
import SplashScreen from './src/screens/SplashScreen';
import {
  onNotificationTap,
  readTapThatOpenedApp,
  registerPushToken,
  type PushTarget,
} from './src/notify';
import type { MainTabParamList, RootStackParamList } from './src/types';

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

/*
 * Truyền danh sách màn hình vào đây là mấu chốt.
 *
 * Nhờ nó, <Stack.Screen name="Detial"> gõ sai tên là báo lỗi ngay tại chỗ, và
 * mỗi màn hình nhận đúng kiểu tham số đã khai trong types.ts. Để trống thì
 * navigator nhận bừa mọi tên, mọi tham số.
 */
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

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
function Root({
  showSplash,
  onSplashFinish,
}: {
  showSplash: boolean;
  onSplashFinish: () => void;
}) {
  const { colors, isDark } = useTheme();
  const { isLoggedIn } = useAuth();

  /*
   * Tay nam điều hướng, dùng được từ NGOÀI cây màn hình.
   *
   * navigation.navigate() chỉ gọi được bên trong một màn hình. Nhưng cú chạm
   * vào thông báo tới từ hệ điều hành, không từ màn nào cả — nên phải có tay
   * nắm này mới nhảy màn được.
   */
  const navRef = useNavigationContainerRef<RootStackParamList>();

  /*
   * Đi tới màn mà thông báo trỏ đến.
   *
   * isReady() là bắt buộc: lúc app vừa mở từ một cú chạm, cây màn hình có thể
   * chưa dựng xong. Gọi navigate() lúc đó thì react-navigation bỏ qua trong im
   * lặng — thông báo coi như không có tác dụng, mà không có lỗi nào để lần.
   */
  /*
   * Màn đang chờ được mở, vì lúc nhận lệnh thì cây điều hướng chưa dựng xong.
   *
   * Đúng cái trường hợp quan trọng nhất lại rơi vào đây: app đang TẮT HẲN,
   * người dùng chạm vào thông báo, app khởi động. Lệnh nhảy màn tới trong vài
   * mili giây đầu, sớm hơn cả lúc NavigationContainer dựng xong — bỏ qua lúc
   * đó là thông báo coi như không có tác dụng.
   */
  const dangCho = useRef<PushTarget | null>(null);

  const goToTarget = useCallback(
    (target: PushTarget) => {
      // Chưa sẵn sàng thì giữ lại, onReady ở dưới sẽ mở nốt.
      if (!navRef.isReady()) {
        dangCho.current = target;
        return;
      }

      if (target.screen === 'Detail') navRef.navigate('Detail', { id: target.id });
      else navRef.navigate('Chat');
    },
    [navRef],
  );

  // Cây điều hướng dựng xong -> mở nốt màn đang chờ, nếu có.
  const handleNavReady = useCallback(() => {
    const target = dangCho.current;
    dangCho.current = null;
    if (target) goToTarget(target);
  }, [goToTarget]);

  /*
   * Xin quyền và gửi mã lên back-end — CHỈ khi đã đăng nhập.
   *
   * Hỏi quyền lúc app vừa mở là cách nhanh nhất để bị bấm Không cho phép: lúc
   * đó người ta chưa biết mình sẽ gửi gì. Mà trên iOS, từ chối một lần là hộp
   * thoại không bao giờ hiện lại.
   *
   * Khách vãng lai không đăng ký: back-end lưu mã theo user, không có user thì
   * không có chỗ lưu.
   */
  useEffect(() => {
    if (!isLoggedIn) return;

    /*
     * .catch là cần, không phải cho chắc.
     *
     * registerPushToken đã nuốt lỗi ở hai chỗ gọi mạng, nhưng ba lời gọi xin
     * quyền và dựng kênh Android thì vẫn ném được — máy bị chính sách doanh
     * nghiệp chặn thông báo chẳng hạn. Để promise bị từ chối mà không ai bắt
     * thì React Native hiện ra một cảnh báo đỏ ngay sau khi đăng nhập, đúng
     * lúc người dùng vừa làm xong một việc và tưởng mình làm sai.
     *
     * Không có gì để dọn nên cũng không cần cờ huỷ: hàm này không đặt state,
     * nên nó chạy xong sau khi component tháo cũng không ảnh hưởng gì.
     */
    registerPushToken().catch(() => {});
  }, [isLoggedIn]);

  /*
   * Hai đường một thông báo tới được tay người dùng, phải đón cả hai:
   *
   *   1. App đang chạy (mở hoặc nằm nền) -> onNotificationTap
   *   2. App đang TẮT HẲN, chạm vào thông báo làm app mở lên -> cú chạm xảy ra
   *      trước khi người lắng nghe kịp đăng ký, nên phải hỏi lại bằng
   *      readTapThatOpenedApp
   *
   * Thiếu đường 2 là lỗi hay gặp nhất: app mở ra ở trang chủ, người dùng không
   * hiểu vì sao chạm vào tin mà không ra tin.
   */
  const daXuLyLuotMo = useRef(false);

  useEffect(() => {
    const thoi = onNotificationTap(goToTarget);

    if (!daXuLyLuotMo.current) {
      daXuLyLuotMo.current = true;
      readTapThatOpenedApp().then((target) => {
        if (target) goToTarget(target);
      });
    }

    return thoi;
  }, [goToTarget]);

  return (
    /*
      Màu nền CỐ Ý không đổi thành lớp bg-background.

      Thẻ này là gốc của cả cây, nó vẽ ngay trong cùng một lượt với lúc
      ThemeProvider gọi colorScheme.set(). Lượt đầu tiên đó NativeWind còn
      chưa biết app đang ở chế độ nào, nên lớp bg-background ra màu của chế
      độ sáng — rồi mới đổi lại. Trên nền tối thì đó là một vệt trắng loé
      lên đúng lúc mở app, giống lỗi màn chào đã gặp.

      Lấy qua useTheme thì màu có sẵn ngay từ lượt đầu, không loé.
    */
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <NavigationContainer
            ref={navRef}
            onReady={handleNavReady}
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
      {/*
        Trang quản trị nằm trong Stack chứ không phải một tab riêng: chỉ một
        số rất ít tài khoản vào được, thêm hẳn một tab cho mọi người nhìn thấy
        là thừa. Lối vào ở màn Cài đặt, chỉ hiện với quản trị viên.
      */}
      <Stack.Screen name="Admin" component={AdminScreen} options={{ title: t('admin.title') }} />

      {/*
        Chính sách bảo mật. Nằm trong Stack chứ không phải một tab: người ta
        đọc nó đúng một lần, không phải thứ cần có mặt thường trực ở thanh
        dưới. Lối vào ở màn Cài đặt. Tiêu đề do chính màn đó tự đặt.
      */}
      <Stack.Screen name="Privacy" component={PrivacyScreen} />
    </Stack.Navigator>
  );
}
