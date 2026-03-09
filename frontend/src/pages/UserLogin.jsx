import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function UserLogin() {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/auth/login', {
        student_id: studentId,
        password,
      });
      localStorage.setItem('sv_token', data.token);
      localStorage.setItem('sv_role', 'user');
      localStorage.setItem('sv_name', data.user.name);
      localStorage.setItem('sv_student_id', data.user.student_id);
      navigate('/viewer');
    } catch (err) {
      setError(err?.response?.data?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="center-page">
      <form className="card" onSubmit={handleSubmit}>
        <h2>用户登录</h2>
        <input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="学号" />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="随机密码"
          type="password"
        />
        {error ? <p className="error">{error}</p> : null}
        <button disabled={loading}>{loading ? '登录中...' : '登录'}</button>
      </form>
    </div>
  );
}
