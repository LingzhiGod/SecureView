import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';

export default function AdminLogin() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const timeoutMessage =
    searchParams.get('reason') === 'timeout' ? '5分钟无操作，已自动退出，请重新登录。' : '';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/admin/login', { username, password });
      localStorage.setItem('sv_token', data.token);
      localStorage.setItem('sv_role', 'admin');
      localStorage.setItem('sv_name', data.admin.username);
      localStorage.removeItem('sv_student_id');
      sessionStorage.removeItem('sv_notice_ack');
      navigate('/admin');
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="center-page">
      <form className="card" onSubmit={handleSubmit}>
        <h2>管理员登录</h2>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="用户名" />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码"
          type="password"
        />
        {timeoutMessage ? <p className="warn">{timeoutMessage}</p> : null}
        {error ? <p className="error">{error}</p> : null}
        <button disabled={loading}>{loading ? '登录中...' : '登录'}</button>
      </form>
    </div>
  );
}
