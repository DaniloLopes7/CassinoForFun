import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getSocket } from '../../services/socket';
import { useUser } from '../../context/UserContext';
import Money from '../Money';

interface ChatMsg {
  _id: string;
  username: string;
  avatar?: string;
  text: string;
  createdAt: string;
}

export default function ChatPanel() {
  const { t } = useTranslation();
  const { user, setAuthOpen } = useUser();
  const [open, setOpen] = useState(() => localStorage.getItem('dbet.chatOpen') !== '0');
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const [online, setOnline] = useState<{ id: string; username: string; level: number }[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = getSocket();
    const onHistory = (h: ChatMsg[]) => setMsgs(h);
    const onMsg = (m: ChatMsg) => setMsgs((prev) => [...prev.slice(-49), m]);
    const onOnline = (u: any[]) => setOnline(u);
    s.on('chat:history', onHistory);
    s.on('chat:message', onMsg);
    s.on('onlineUsers', onOnline);
    return () => {
      s.off('chat:history', onHistory);
      s.off('chat:message', onMsg);
      s.off('onlineUsers', onOnline);
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs]);

  function toggle() {
    const next = !open;
    setOpen(next);
    localStorage.setItem('dbet.chatOpen', next ? '1' : '0');
  }

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return setAuthOpen(true);
    const clean = text.trim();
    if (!clean) return;
    getSocket().emit('chat:send', { text: clean });
    setText('');
  }

  if (!open) {
    return (
      <button
        onClick={toggle}
        className="fixed bottom-4 right-4 z-40 dbet-btn-gold rounded-full px-4 shadow-goldglow"
        aria-label={t('chat.open')}
      >
        💬 {t('chat.title')} · {online.length}
      </button>
    );
  }

  return (
    <aside className="fixed bottom-0 right-0 z-40 flex h-[420px] w-full max-w-sm flex-col border-l border-t border-line bg-deep shadow-card md:bottom-4 md:right-4 md:rounded-xl md:border">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="font-semibold text-gold">
          💬 {t('chat.title')} <span className="text-xs text-felt">● {online.length} online</span>
        </span>
        <button className="dbet-btn-ghost px-2 py-1 text-xs" onClick={toggle}>
          —
        </button>
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {msgs.map((mm) => (
          <div key={mm._id} className="text-sm">
            <span className="font-semibold text-gold/90">{mm.username}: </span>
            <span className="text-ink/90">{mm.text}</span>
          </div>
        ))}
        {msgs.length === 0 && <p className="text-center text-xs text-ink-faint">{t('chat.empty')}</p>}
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-line p-2">
        <input
          className="dbet-input"
          placeholder={t('chat.placeholder')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={280}
        />
        <button className="dbet-btn-gold px-3" type="submit">
          ➤
        </button>
      </form>
    </aside>
  );
}
