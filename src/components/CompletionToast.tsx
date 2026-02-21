import { useEffect, useRef, useCallback, useState } from 'react';
import './CompletionAnimation.css';

/** Imperative toast handle */
export interface CompletionToastHandle {
  show: (message: string) => void;
}

/** Hook that returns { toast, showToast } — drop <toast> in JSX and call showToast(msg) */
export function useCompletionToast(): {
  toast: React.ReactNode;
  showToast: (message: string) => void;
} {
  const [visible, setVisible] = useState(false);
  const [msg, setMsg] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((message: string) => {
    setMsg(message);
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 2400);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const toast = (
    <div className={`completion-toast ${visible ? 'show' : ''}`}>
      <span className="completion-toast-icon">
        <svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
      </span>
      <span>{msg}</span>
    </div>
  );

  return { toast, showToast };
}
