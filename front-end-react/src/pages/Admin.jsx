import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useI18n } from '../i18n';
import { showToast } from '../toast';

const PAGE = 20;

// Thanh dài nhất chiếm trọn chiều ngang, các thanh còn lại so theo nó. Sàn 4%
// để một mục có đúng 1 tin vẫn nhìn thấy được chứ không thành vạch vô hình.
const barWidth = (count, rows) => {
  const max = Math.max(...rows.map((r) => r.count), 1);
  return `${Math.max((count / max) * 100, 4)}%`;
};

export default function Admin() {
  const { t, lang } = useI18n();

  const [stats, setStats] = useState(null);

  const [pets, setPets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [cleaning, setCleaning] = useState(false);

  const [reports, setReports] = useState([]);
  const [reportTotal, setReportTotal] = useState(0);
  const [reportPage, setReportPage] = useState(1);
  const [busyReport, setBusyReport] = useState(null);

  // Hai giá trị cho ô tìm kiếm: chữ đang hiện, và chữ đã chốt để gọi API.
  // Cùng lối với trang chủ — xem ghi chú trong Home.jsx.
  const [type, setType] = useState('');
  const [resolved, setResolved] = useState('');
  const [goQ, setGoQ] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    const hen = setTimeout(() => setQ(goQ), 350);
    return () => clearTimeout(hen);
  }, [goQ]);

  const params = useCallback(
    (skip = 0) => {
      const p = { skip, limit: PAGE };
      if (type) p.type = type;
      if (resolved) p.resolved = resolved;
      if (q.trim()) p.q = q.trim();
      return p;
    },
    [type, resolved, q],
  );

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.adminStats();
      setStats(data);
    } catch {
      setStats(null);
    }
  }, []);

  // page = 1 nạp lại từ đầu, page > 1 nối thêm vào cuối.
  const fetchReports = useCallback(async (page = 1) => {
    try {
      const { data } = await api.adminReports({ page });
      setReports((cu) => (page === 1 ? data.reports : [...cu, ...data.reports]));
      setReportTotal(data.total);
      setReportPage(data.page);
    } catch {
      if (page === 1) setReports([]);
    }
  }, []);

  // Nạp bảng tin. Chạy lại mỗi khi một bộ lọc đã chốt thay đổi — xem ghi chú
  // về chỗ này trong Home.jsx, lý do y hệt.
  useEffect(() => {
    let bo = false;
    setLoading(true);

    api
      .adminPets(params(0))
      .then(({ data }) => {
        if (bo) return;
        setPets(data.pets);
        setTotal(data.total);
      })
      .catch(() => {
        if (bo) return;
        setPets([]);
        setTotal(0);
      })
      .finally(() => {
        if (!bo) setLoading(false);
      });

    return () => { bo = true; };
  }, [params]);

  // Số liệu và hàng chờ báo cáo chỉ nạp một lần lúc mở trang.
  useEffect(() => {
    fetchStats();
    fetchReports();
  }, [fetchStats, fetchReports]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const { data } = await api.adminPets(params(pets.length));
      setPets((cu) => cu.concat(data.pets));
      setTotal(data.total);
    } finally {
      setLoadingMore(false);
    }
  };

  const xoaTin = async (pet) => {
    if (!window.confirm(t('admin.confirmDelete'))) return;
    setBusyId(pet._id);
    try {
      await api.adminDeletePet(pet._id);
      setPets((cu) => cu.filter((p) => p._id !== pet._id));
      setTotal((cu) => cu - 1);
      showToast(t('delete.success'));
      fetchStats();
      fetchReports();
    } catch {
      showToast(t('form.saveError'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  // Xoá hẳn tin bị báo cáo. Server xoá kèm mọi báo cáo về tin đó, nên không
  // phải dọn tay từng dòng trong hàng chờ.
  const xoaTinBiBaoCao = async (r) => {
    if (!window.confirm(t('admin.confirmDelete'))) return;
    setBusyReport(r._id);
    try {
      await api.adminDeletePet(r.pet._id);
      showToast(t('delete.success'));
      setPets((cu) => cu.filter((p) => p._id !== r.pet._id));
      fetchReports();
      fetchStats();
    } catch {
      showToast(t('form.saveError'), 'error');
    } finally {
      setBusyReport(null);
    }
  };

  // Bỏ qua: xem rồi, tin không sao. Chỉ gỡ dòng báo cáo, tin giữ nguyên.
  const boQuaBaoCao = async (r) => {
    setBusyReport(r._id);
    try {
      await api.adminDismissReport(r._id);
      setReports((cu) => cu.filter((x) => x._id !== r._id));
      setReportTotal((cu) => cu - 1);
      fetchStats();
    } catch {
      showToast(t('form.saveError'), 'error');
    } finally {
      setBusyReport(null);
    }
  };

  /*
   * Chạy đợt dọn ngay thay vì chờ cron.
   *
   * Chủ yếu để kiểm tra rằng nó hoạt động — chờ tới 2 giờ sáng mới biết mình
   * cấu hình sai thì quá chậm.
   */
  const chayDonDep = async () => {
    if (!window.confirm(t('admin.confirmCleanup'))) return;
    setCleaning(true);
    try {
      const { data } = await api.adminCleanup();
      showToast(t('admin.cleanupDone', { count: data.deleted }));
      // Tin vừa xoá có thể đang nằm trong bảng bên dưới, và báo cáo về chúng
      // cũng đã bị xoá theo, nên nạp lại cả ba.
      fetchStats();
      fetchReports();
      const { data: lai } = await api.adminPets(params(0));
      setPets(lai.pets);
      setTotal(lai.total);
    } catch {
      showToast(t('form.saveError'), 'error');
    } finally {
      setCleaning(false);
    }
  };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString(lang === 'en' ? 'en-GB' : 'vi-VN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });

  const tiles = stats
    ? [
        { label: t('admin.totalPosts'), value: stats.total },
        { label: t('badge.lost'), value: stats.lost, dot: 'bg-lost' },
        { label: t('badge.found'), value: stats.found, dot: 'bg-found' },
        { label: t('admin.users'), value: stats.users },
      ]
    : [];

  const rankings = stats
    ? [
        { title: t('admin.topAreas'), rows: stats.topAreas },
        { title: t('admin.topBreeds'), rows: stats.topBreeds },
      ]
    : [];

  const O_CHON =
    'border border-gray-200 rounded-full px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('admin.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('admin.subtitle')}</p>
      </div>

      {/* Số liệu tổng quan: con số đứng một mình thì dùng thẻ số, không vẽ biểu đồ */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {tiles.map((tile) => (
            <div key={tile.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5">
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{tile.value}</p>
              <div className="flex items-center gap-1.5 mt-1">
                {tile.dot && <span className={'w-2 h-2 rounded-full shrink-0 ' + tile.dot} aria-hidden="true" />}
                <p className="text-xs text-gray-500">{tile.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tỉ lệ đoàn tụ: một con số nổi bật kèm thanh tiến độ */}
      {stats && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{stats.resolvedRate}%</p>
            <p className="text-sm text-gray-500">{t('admin.resolvedRate')}</p>
          </div>
          <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${stats.resolvedRate}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {stats.resolved} / {stats.total} {t('admin.resolvedOf')}
          </p>

          {/*
            Chỉ hiện khi thật sự có tin quá hạn. Một dòng "0 tin sắp bị xoá"
            nằm đó mỗi ngày thì chẳng mấy chốc không ai đọc nữa.
          */}
          {stats.pendingCleanup > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-3">
              <p className="text-xs text-gray-500 flex-1 min-w-[14rem]">
                {t('admin.cleanupDue', { count: stats.pendingCleanup, days: stats.cleanupDays })}
              </p>
              <button
                type="button"
                onClick={chayDonDep}
                disabled={cleaning}
                className="text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                {cleaning ? t('admin.cleanupRunning') : t('admin.cleanupNow')}
              </button>
            </div>
          )}
        </div>
      )}

      {/*
        Hàng chờ báo cáo. Đặt TRÊN bảng tin vì đây là thứ cần người xử lý, còn
        bảng tin chỉ để tra cứu. Ẩn hẳn khi hàng chờ trống.
      */}
      {reports.length > 0 && (
        <div className="bg-white rounded-2xl border border-danger-border shadow-sm p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-danger" aria-hidden="true" />
            <p className="text-sm font-bold text-gray-900">{t('admin.reports')}</p>
            <span className="text-xs font-semibold text-danger-dark bg-danger-soft px-2 py-0.5 rounded-full">
              {reportTotal}
            </span>
          </div>

          {reports.map((r) => (
            <div key={r._id} className="flex gap-3 items-start border border-gray-100 rounded-xl p-3 mb-2">
              {r.pet && r.pet.image && (
                <img src={r.pet.image} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-danger-soft text-danger-dark">
                    {t(`report.reason.${r.reason}`)}
                  </span>
                  {r.pet ? (
                    <Link
                      to={`/pet/${r.pet._id}`}
                      className="text-sm font-semibold text-gray-900 hover:text-accent truncate"
                    >
                      {r.pet.breed} · {r.pet.area}
                    </Link>
                  ) : (
                    // Tin có thể đã bị xoá bởi chính chủ tin trong lúc báo cáo nằm chờ.
                    <span className="text-sm text-gray-500 italic">{t('admin.reportPetGone')}</span>
                  )}
                </div>
                {r.note && (
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed break-words">{r.note}</p>
                )}
                <p className="text-xs text-gray-500 mt-1 font-mono">{r.pet ? r.pet.postId : ''}</p>
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                {r.pet && (
                  <button
                    type="button"
                    onClick={() => xoaTinBiBaoCao(r)}
                    disabled={busyReport === r._id}
                    className="text-xs font-medium px-3 py-1.5 rounded-full bg-danger text-white hover:bg-danger-dark disabled:opacity-50"
                  >
                    {t('admin.reportDeletePost')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => boQuaBaoCao(r)}
                  disabled={busyReport === r._id}
                  className="text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  {t('admin.reportDismiss')}
                </button>
              </div>
            </div>
          ))}

          {reports.length < reportTotal && (
            <button
              type="button"
              onClick={() => fetchReports(reportPage + 1)}
              className="w-full text-xs font-medium text-gray-500 hover:text-gray-900 py-2"
            >
              {t('home.more')}
            </button>
          )}
        </div>
      )}

      {/* Xếp hạng: thanh ngang một màu, độ dài mang nghĩa, số ghi thẳng ở cuối thanh */}
      {stats && (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {rankings.map((rank) => (
            <div key={rank.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm font-bold text-gray-900 mb-3">{rank.title}</p>
              {rank.rows.length === 0 ? (
                <p className="text-xs text-gray-500">{t('admin.noData')}</p>
              ) : (
                <div className="space-y-2.5">
                  {rank.rows.map((row) => (
                    <div key={row.label} title={`${row.label}: ${row.count}`}>
                      <div className="flex items-baseline justify-between gap-3 mb-1">
                        <span className="text-xs text-gray-600 truncate">{row.label}</span>
                        <span className="text-xs font-semibold text-gray-900 tabular-nums shrink-0">
                          {row.count}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-lost rounded-r-full"
                          style={{ width: barWidth(row.count, rank.rows) }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bộ lọc nằm trên bảng, gom một hàng */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <select
          id="type" name="type" aria-label={t('admin.filterType')}
          value={type} onChange={(e) => setType(e.target.value)} className={O_CHON}
        >
          <option value="">{t('admin.allTypes')}</option>
          <option value="lost">{t('filter.lost')}</option>
          <option value="found">{t('filter.found')}</option>
        </select>

        <select
          id="resolved" name="resolved" aria-label={t('admin.filterStatus')}
          value={resolved} onChange={(e) => setResolved(e.target.value)} className={O_CHON}
        >
          <option value="">{t('admin.allStatus')}</option>
          <option value="false">{t('mine.open')}</option>
          <option value="true">{t('mine.resolved')}</option>
        </select>

        <input
          id="q" name="q" type="text"
          aria-label={t('admin.search')} placeholder={t('admin.search')}
          value={goQ} onChange={(e) => setGoQ(e.target.value)}
          className="flex-1 min-w-[10rem] border border-gray-200 rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />

        <span className="text-xs text-gray-500">
          {total} {t('admin.posts')}
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-500 text-center py-10">{t('mine.loading')}</p>
        ) : pets.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-10">{t('admin.noPosts')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left font-semibold px-4 py-2.5">{t('admin.colPost')}</th>
                  <th className="text-left font-semibold px-4 py-2.5 hidden sm:table-cell">{t('admin.colArea')}</th>
                  <th className="text-left font-semibold px-4 py-2.5 hidden md:table-cell">{t('admin.colOwner')}</th>
                  <th className="text-left font-semibold px-4 py-2.5 hidden sm:table-cell">{t('admin.colDate')}</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pets.map((pet) => (
                  <tr key={pet._id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={
                            'w-2 h-2 rounded-full shrink-0 ' +
                            (pet.resolved ? 'bg-primary' : pet.type === 'lost' ? 'bg-lost' : 'bg-found')
                          }
                          aria-hidden="true"
                        />
                        <Link to={`/pet/${pet._id}`} className="font-semibold text-gray-900 hover:text-accent">
                          {pet.name || pet.breed}
                        </Link>
                        <span className="text-xs text-gray-500 font-mono">{pet.postId}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {pet.species} · {pet.color}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{pet.area}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                      {pet.owner ? pet.owner.name : t('admin.guest')}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell whitespace-nowrap">
                      {formatDate(pet.date)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => xoaTin(pet)}
                        disabled={busyId === pet._id}
                        className="text-danger px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-danger-soft disabled:opacity-50 transition-all"
                      >
                        {t('detail.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pets.length < total && (
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="border-2 border-gray-200 text-gray-600 px-5 py-2 rounded-full text-sm font-semibold hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-all"
          >
            {loadingMore ? t('mine.loading') : t('home.loadMore')}
          </button>
        </div>
      )}
    </div>
  );
}
