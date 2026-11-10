// Canh chính tấm chắn mạng.
//
// tests/setup-env.js xoá GEMINI_API_KEY trước mọi bộ test, vì trên máy phát
// triển khoá thật nằm trong biến môi trường Windows và Jest thừa hưởng nó.
// Nếu ai gỡ "setupFiles" khỏi package.json, hoặc đổi tên file setup, thì
// không có gì báo — test vẫn xanh, chỉ là chúng lặng lẽ gọi mạng thật, đốt
// quota và thỉnh thoảng đỏ vì hết giờ.
//
// Bộ test này làm cho việc gỡ đó phát ra tiếng.
describe('tấm chắn không cho test gọi mạng thật', () => {
  it('khoá Gemini phải rỗng trong môi trường test', () => {
    expect(process.env.GEMINI_API_KEY || '').toBe('');
    expect(process.env.GOOGLE_API_KEY || '').toBe('');
  });
});
