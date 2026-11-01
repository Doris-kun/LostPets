# Kết quả đo độ chính xác so khớp Lost↔Found

Chạy ngày 2026-11-01 · 20 cặp gán nhãn · sinh tự động bởi `scripts/eval-matching.js`

## Tầng truy hồi

| k | xếp theo ngày (cách cũ) | xếp theo vector (đang chạy thật) |
|---|---|---|
| recall@1 | 10% | 85% |
| recall@3 | 20% | 100% |
| recall@5 | 30% | 100% |
| recall@10 | 50% | 100% |

Tập ứng viên trung bình: 22 tin sau bộ lọc cứng, bị cắt còn 3 trước khi AI chấm.

## Phân tách theo loài

| Loài | recall@3 (ngày) | recall@3 (vector) | số cặp |
|---|---|---|---|
| Chó | 16.7% | 100% | 12 |
| Mèo | 25% | 100% | 8 |

## Đầu-cuối qua endpoint thật

top-3 accuracy: **100%** (20/20)

## Chi tiết từng cặp

| Cặp | Loài | Khu vực | Số ứng viên | Hạng (ngày) | Hạng (vector) |
|---|---|---|---|---|---|
| p01 | Chó | Quận 1, TP.HCM | 26 | 25 | 1 |
| p02 | Chó | Gò Vấp, TP.HCM | 26 | 22 | 1 |
| p03 | Mèo | Quận 3, TP.HCM | 16 | 16 | 1 |
| p04 | Chó | Thủ Đức, TP.HCM | 26 | 20 | 1 |
| p05 | Mèo | Bình Thạnh, TP.HCM | 16 | 14 | 2 |
| p06 | Chó | Quận 7, TP.HCM | 26 | 17 | 1 |
| p07 | Chó | Quận 2, TP.HCM | 26 | 15 | 2 |
| p08 | Mèo | Tân Bình, TP.HCM | 16 | 11 | 1 |
| p09 | Chó | Quận 10, TP.HCM | 26 | 13 | 2 |
| p10 | Chó | Cầu Giấy, Hà Nội | 26 | 11 | 1 |
| p11 | Mèo | Hải Châu, Đà Nẵng | 16 | 9 | 1 |
| p12 | Chó | Phú Nhuận, TP.HCM | 26 | 9 | 1 |
| p13 | Chó | Quận 9, TP.HCM | 26 | 7 | 1 |
| p14 | Mèo | Bình Tân, TP.HCM | 16 | 7 | 1 |
| p15 | Chó | Quận 4, TP.HCM | 26 | 5 | 1 |
| p16 | Mèo | Quận 5, TP.HCM | 16 | 5 | 1 |
| p17 | Chó | Hóc Môn, TP.HCM | 26 | 3 | 1 |
| p18 | Mèo | Quận 12, TP.HCM | 16 | 3 | 1 |
| p19 | Chó | Quận 6, TP.HCM | 26 | 1 | 1 |
| p20 | Mèo | Củ Chi, TP.HCM | 16 | 1 | 1 |

