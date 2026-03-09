import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import PdfPageImage from '../components/PdfPageImage';
import WatermarkLayer from '../components/WatermarkLayer';

export default function Viewer() {
  const [docs, setDocs] = useState([]);
  const [docId, setDocId] = useState(null);
  const [docInfo, setDocInfo] = useState(null);
  const [pageNo, setPageNo] = useState(1);
  const [error, setError] = useState('');

  const name = localStorage.getItem('sv_name') || '';
  const studentId = localStorage.getItem('sv_student_id') || '';

  useEffect(() => {
    api
      .get('/viewer/documents')
      .then((res) => {
        const list = res.data.list || [];
        setDocs(list);
        if (list.length) setDocId(list[0].id);
      })
      .catch(() => setError('无法加载 PDF 列表'));
  }, []);

  useEffect(() => {
    if (!docId) return;
    api
      .get(`/viewer/documents/${docId}`)
      .then((res) => {
        setDocInfo(res.data);
        setPageNo(1);
      })
      .catch(() => setError('无法加载文档详情'));
  }, [docId]);

  const imageUrl = useMemo(() => {
    if (!docId || !pageNo) return '';
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('sv_token') || '';
    return `${base}/viewer/documents/${docId}/pages/${pageNo}/image?token=${encodeURIComponent(
      token
    )}&t=${Date.now()}`;
  }, [docId, pageNo]);

  function logout() {
    localStorage.clear();
    window.location.href = '/user-login';
  }

  return (
    <div className="viewer-layout">
      <header className="topbar">
        <h1>在线阅读</h1>
        <div>
          <span>
            {name} / {studentId}
          </span>
          <button onClick={logout}>退出</button>
        </div>
      </header>

      <div className="viewer-body">
        <aside className="sidebar card">
          <h3>PDF 列表</h3>
          {docs.map((d) => (
            <button
              key={d.id}
              className={`doc-item ${docId === d.id ? 'active' : ''}`}
              onClick={() => setDocId(d.id)}
            >
              {d.title}
            </button>
          ))}
        </aside>

        <main className="reader card">
          {error ? <p className="error">{error}</p> : null}
          {docInfo ? (
            <>
              <div className="reader-toolbar">
                <strong>{docInfo.title}</strong>
                <div>
                  <button disabled={pageNo <= 1} onClick={() => setPageNo((p) => p - 1)}>
                    上一页
                  </button>
                  <span>
                    第 {pageNo} / {docInfo.total_pages} 页
                  </span>
                  <button
                    disabled={pageNo >= docInfo.total_pages}
                    onClick={() => setPageNo((p) => p + 1)}
                  >
                    下一页
                  </button>
                </div>
              </div>
              <div className="reader-stage">
                <PdfPageImage src={imageUrl} pageNo={pageNo} />
                <WatermarkLayer name={name} studentId={studentId} />
              </div>
            </>
          ) : (
            <p>暂无可阅读文档</p>
          )}
        </main>
      </div>
    </div>
  );
}
