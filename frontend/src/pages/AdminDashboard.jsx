import { useEffect, useState } from 'react';
import api from '../api/client';

export default function AdminDashboard() {
  const [docs, setDocs] = useState([]);
  const [users, setUsers] = useState([]);
  const [docTitles, setDocTitles] = useState({});
  const [noticeHtml, setNoticeHtml] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [title, setTitle] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [noticeSaving, setNoticeSaving] = useState(false);

  const name = localStorage.getItem('sv_name') || 'admin';

  async function loadData() {
    const [docRes, userRes, noticeRes] = await Promise.allSettled([
      api.get('/admin/documents'),
      api.get('/admin/users'),
      api.get('/admin/notice'),
    ]);

    if (docRes.status === 'fulfilled') {
      const docList = docRes.value.data.list || [];
      setDocs(docList);
      setDocTitles((prev) => {
        const next = {};
        docList.forEach((doc) => {
          next[doc.id] = prev[doc.id] ?? doc.title;
        });
        return next;
      });
    }

    if (userRes.status === 'fulfilled') {
      setUsers(userRes.value.data.list || []);
    }

    if (noticeRes.status === 'fulfilled') {
      setNoticeHtml(typeof noticeRes.value.data?.html === 'string' ? noticeRes.value.data.html : '');
    }

    if (docRes.status === 'rejected' || userRes.status === 'rejected' || noticeRes.status === 'rejected') {
      throw new Error('load failed');
    }
  }

  useEffect(() => {
    loadData().catch(() => setMessage('加载数据失败'));
  }, []);

  async function uploadPdf(e) {
    e.preventDefault();
    if (!pdfFile) return;
    setBusy(true);
    setMessage('');
    try {
      const form = new FormData();
      form.append('file', pdfFile);
      if (title.trim()) form.append('title', title.trim());
      await api.post('/admin/documents', form);
      setMessage('PDF 上传成功，正在转图片，请稍后刷新状态。');
      setPdfFile(null);
      setTitle('');
      await loadData();
    } catch (err) {
      setMessage(err?.response?.data?.message || '上传失败');
    } finally {
      setBusy(false);
    }
  }

  async function importUsers(e) {
    e.preventDefault();
    if (!importFile) return;
    setBusy(true);
    setMessage('');
    try {
      const form = new FormData();
      form.append('file', importFile);
      const { data } = await api.post('/admin/users/import', form);
      setMessage(`导入完成：总计 ${data.total}，成功 ${data.success}，失败 ${data.failed}`);
      setImportFile(null);
      await loadData();
    } catch (err) {
      setMessage(err?.response?.data?.message || '导入失败');
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    localStorage.clear();
    window.location.href = '/admin-login';
  }

  function downloadExport(endpoint, filename) {
    const token = localStorage.getItem('sv_token');
    if (!token) return;
    fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) {
          throw new Error('下载失败');
        }
        return r.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => setMessage('导出失败'));
  }

  async function saveDocTitle(id) {
    const newTitle = (docTitles[id] || '').trim();
    if (!newTitle) {
      setMessage('标题不能为空');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      await api.patch(`/admin/documents/${id}`, { title: newTitle });
      setMessage('标题已更新');
      await loadData();
    } catch (err) {
      setMessage(err?.response?.data?.message || '更新标题失败');
    } finally {
      setBusy(false);
    }
  }

  async function reprocessDoc(id) {
    setBusy(true);
    setMessage('');
    try {
      await api.post(`/admin/documents/${id}/reprocess`);
      setMessage('已触发重新转换，请稍后刷新状态');
      await loadData();
    } catch (err) {
      setMessage(err?.response?.data?.message || '重试转换失败');
    } finally {
      setBusy(false);
    }
  }

  async function deleteDoc(id) {
    if (!window.confirm('确认删除该 PDF 及其页面图片吗？')) return;
    setBusy(true);
    setMessage('');
    try {
      await api.delete(`/admin/documents/${id}`);
      setMessage('文档已删除');
      await loadData();
    } catch (err) {
      setMessage(err?.response?.data?.message || '删除失败');
    } finally {
      setBusy(false);
    }
  }

  async function saveNotice() {
    if (!noticeHtml.trim()) {
      setMessage('公告内容不能为空');
      return;
    }

    setNoticeSaving(true);
    setMessage('');
    try {
      const { data } = await api.put('/admin/notice', { html: noticeHtml });
      setNoticeHtml(data.html || '');
      setMessage('公告已保存');
    } catch (err) {
      setMessage(err?.response?.data?.message || '公告保存失败');
    } finally {
      setNoticeSaving(false);
    }
  }

  return (
    <div className="layout">
      <header className="topbar">
        <h1>SecureView 管理后台</h1>
        <div>
          <span>{name}</span>
          <button onClick={logout}>退出</button>
        </div>
      </header>

      <main className="grid">
        <section className="card">
          <h3>上传 PDF</h3>
          <form onSubmit={uploadPdf} className="stack">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="标题（可选）" />
            <input type="file" accept="application/pdf,.pdf" onChange={(e) => setPdfFile(e.target.files?.[0])} />
            <button disabled={busy}>上传</button>
          </form>
        </section>

        <section className="card">
          <h3>导入用户（CSV/Excel）</h3>
          <form onSubmit={importUsers} className="stack">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => setImportFile(e.target.files?.[0])}
            />
            <button disabled={busy}>导入</button>
          </form>
          <p className="hint">字段：name, student_id（或 姓名, 学号）</p>
        </section>

        <section className="card">
          <h3>导出用户账号</h3>
          <div className="stack">
            <button type="button" onClick={() => downloadExport('/admin/users/export', 'users_export.csv')}>
              下载 CSV
            </button>
            <button
              type="button"
              onClick={() => downloadExport('/admin/users/export.xlsx', 'users_export.xlsx')}
            >
              下载 Excel
            </button>
          </div>
          <p className="hint">包含姓名、学号、初始随机密码</p>
        </section>

        <section className="card full">
          <h3>登录公告（支持 HTML）</h3>
          <div className="stack">
            <textarea
              className="notice-editor"
              value={noticeHtml}
              onChange={(e) => setNoticeHtml(e.target.value)}
              placeholder="<p>请输入公告 HTML</p>"
            />
            <button type="button" disabled={noticeSaving} onClick={saveNotice}>
              {noticeSaving ? '保存中...' : '保存公告'}
            </button>
          </div>
          <p className="hint">允许标签：p, br, strong, em, ul, ol, li, h1-h3, blockquote, div, span, a。保存后在登录弹窗生效。</p>
        </section>

        <section className="card full">
          <h3>PDF 列表</h3>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>标题</th>
                <th>原文件名</th>
                <th>状态</th>
                <th>页数</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td>{d.id}</td>
                  <td>
                    <input
                      value={docTitles[d.id] ?? d.title}
                      onChange={(e) =>
                        setDocTitles((prev) => ({ ...prev, [d.id]: e.target.value }))
                      }
                    />
                  </td>
                  <td>{d.original_filename}</td>
                  <td>{d.status}</td>
                  <td>{d.total_pages}</td>
                  <td>{d.created_at}</td>
                  <td>
                    <div className="stack">
                      <button type="button" disabled={busy} onClick={() => saveDocTitle(d.id)}>
                        保存标题
                      </button>
                      <button type="button" disabled={busy} onClick={() => reprocessDoc(d.id)}>
                        重试转换
                      </button>
                      <button type="button" disabled={busy} onClick={() => deleteDoc(d.id)}>
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card full">
          <h3>用户列表</h3>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>姓名</th>
                <th>学号</th>
                <th>创建时间</th>
                <th>最近登录</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.name}</td>
                  <td>{u.student_id}</td>
                  <td>{u.created_at}</td>
                  <td>{u.last_login_at || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
      {message ? <div className="toast">{message}</div> : null}
    </div>
  );
}
