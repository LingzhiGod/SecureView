import { useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import UserLogin from './pages/UserLogin';
import Viewer from './pages/Viewer';

const INACTIVITY_LIMIT_MS = 5 * 60 * 1000;
const NOTICE_SECONDS = 10;
const DEFAULT_NOTICE_HTML = `
<p>文档涉密，不允许泄漏和传播。</p>
<p>如需拍照记录，禁止分享。</p>
<p>如发生泄漏，保留追责权力。</p>
<p>版权所有：黑龙江科技大学数字媒体技术应用与创新协会</p>
`.trim();

function clearAuth() {
  localStorage.removeItem('sv_token');
  localStorage.removeItem('sv_role');
  localStorage.removeItem('sv_name');
  localStorage.removeItem('sv_student_id');
}

function SensitiveNotice({ onAccept, html }) {
  const [secondsLeft, setSecondsLeft] = useState(NOTICE_SECONDS);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="notice-overlay">
      <div className="notice-card">
        <h3>涉密文档阅读告知</h3>
        <div className="notice-content" dangerouslySetInnerHTML={{ __html: html }} />
        <button type="button" disabled={secondsLeft > 0} onClick={onAccept}>
          {secondsLeft > 0 ? `请阅读 ${secondsLeft}s` : '我已阅读并同意'}
        </button>
      </div>
    </div>
  );
}

function RequireRole({ role, children }) {
  const token = localStorage.getItem('sv_token');
  const currentRole = localStorage.getItem('sv_role');
  const [showNotice, setShowNotice] = useState(sessionStorage.getItem('sv_notice_ack') !== '1');
  const [noticeHtml, setNoticeHtml] = useState(DEFAULT_NOTICE_HTML);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!token || currentRole !== role) {
      return undefined;
    }

    const target = role === 'admin' ? '/admin-login?reason=timeout' : '/user-login?reason=timeout';
    const resetTimer = () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        clearAuth();
        sessionStorage.removeItem('sv_notice_ack');
        window.location.href = target;
      }, INACTIVITY_LIMIT_MS);
    };

    const events = ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }));
    document.addEventListener('visibilitychange', resetTimer);
    resetTimer();

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      events.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
      document.removeEventListener('visibilitychange', resetTimer);
    };
  }, [role, token, currentRole]);

  useEffect(() => {
    if (!showNotice || !token || currentRole !== role) {
      return;
    }

    const endpoint = role === 'admin' ? '/admin/notice' : '/viewer/notice';
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

    fetch(`${base}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const html = typeof data?.html === 'string' ? data.html.trim() : '';
        setNoticeHtml(html || DEFAULT_NOTICE_HTML);
      })
      .catch(() => {
        setNoticeHtml(DEFAULT_NOTICE_HTML);
      });
  }, [showNotice, role, token, currentRole]);

  if (!token || currentRole !== role) {
    return <Navigate to={role === 'admin' ? '/admin-login' : '/user-login'} replace />;
  }

  const handleAcceptNotice = () => {
    sessionStorage.setItem('sv_notice_ack', '1');
    setShowNotice(false);
  };

  return (
    <>
      {children}
      {showNotice ? <SensitiveNotice onAccept={handleAcceptNotice} html={noticeHtml} /> : null}
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/user-login" replace />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <RequireRole role="admin">
            <AdminDashboard />
          </RequireRole>
        }
      />
      <Route path="/user-login" element={<UserLogin />} />
      <Route
        path="/viewer"
        element={
          <RequireRole role="user">
            <Viewer />
          </RequireRole>
        }
      />
      <Route path="*" element={<Navigate to="/user-login" replace />} />
    </Routes>
  );
}
