import { useEffect, useState } from 'react';
import api from '../api/client';

export default function AdminDashboard() {
  const [docs, setDocs] = useState([]);
  const [users, setUsers] = useState([]);
  const [pdfFile, setPdfFile] = useState(null);
  const [title, setTitle] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const name = localStorage.getItem('sv_name') || 'admin';

  async function loadData() {
    const [docRes, userRes] = await Promise.all([api.get('/admin/documents'), api.get('/admin/users')]);
    setDocs(docRes.data.list || []);
    setUsers(userRes.data.list || []);
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
          <a className="button-link" href={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/admin/users/export`} onClick={(e) => {
            const token = localStorage.getItem('sv_token');
            if (!token) return;
            e.preventDefault();
            fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/admin/users/export`, {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then((r) => r.blob())
              .then((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'users_export.csv';
                a.click();
                URL.revokeObjectURL(url);
              });
          }}>下载 CSV</a>
          <p className="hint">包含姓名、学号、初始随机密码</p>
        </section>

        <section className="card full">
          <h3>PDF 列表</h3>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>标题</th>
                <th>状态</th>
                <th>页数</th>
                <th>创建时间</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td>{d.id}</td>
                  <td>{d.title}</td>
                  <td>{d.status}</td>
                  <td>{d.total_pages}</td>
                  <td>{d.created_at}</td>
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
