import { useEffect, useMemo, useState } from 'react';

function formatTime(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes()
  )}:${p(d.getSeconds())}`;
}

export default function WatermarkLayer({ name, studentId }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  const text = useMemo(() => `${name} ${studentId} ${formatTime(now)}`, [name, studentId, now]);

  return (
    <div className="watermark-layer" aria-hidden="true">
      {Array.from({ length: 24 }).map((_, idx) => (
        <span key={idx} className="watermark-item">
          {text}
        </span>
      ))}
    </div>
  );
}
