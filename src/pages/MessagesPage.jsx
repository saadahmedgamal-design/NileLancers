import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase/config';
import {
  collection, query, where, getDocs, addDoc, orderBy,
  onSnapshot, doc, getDoc, updateDoc, serverTimestamp
} from 'firebase/firestore';

const MessagesPage = ({ lang, user, setPage }) => {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  const t = lang === 'en' ? {
    title: 'Messages', noConvs: 'No conversations yet.',
    placeholder: 'Type a message...', send: 'Send',
    you: 'You', today: 'Today', noMessages: 'No messages yet. Say hello!',
    loadingConvs: 'Loading conversations...',
    selectConv: 'Select a conversation to start chatting'
  } : {
    title: 'الرسائل', noConvs: 'لا توجد محادثات بعد.',
    placeholder: 'اكتب رسالة...', send: 'إرسال',
    you: 'أنت', today: 'اليوم', noMessages: 'لا توجد رسائل بعد. قل مرحباً!',
    loadingConvs: 'جاري تحميل المحادثات...',
    selectConv: 'اختر محادثة للبدء في الدردشة'
  };

  // Load conversations (messages where user is sender or receiver)
  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }

    const fetchConversations = async () => {
      try {
        const [sentSnap, recvSnap] = await Promise.all([
          getDocs(query(collection(db, 'messages'), where('sender_id', '==', user.id))),
          getDocs(query(collection(db, 'messages'), where('receiver_id', '==', user.id)))
        ]);

        // Get unique partner IDs
        const partnerIds = new Set();
        sentSnap.docs.forEach(d => partnerIds.add(d.data().receiver_id));
        recvSnap.docs.forEach(d => partnerIds.add(d.data().sender_id));

        const partners = await Promise.all([...partnerIds].map(async pid => {
          const uSnap = await getDoc(doc(db, 'users', pid));
          return uSnap.exists() ? { id: pid, ...uSnap.data() } : { id: pid, name: 'Unknown', email: '' };
        }));

        setConversations(partners);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };

    fetchConversations();
  }, [user]);

  // Real-time messages for active conversation
  useEffect(() => {
    if (!activeConv || !user?.id) return;

    const ids = [user.id, activeConv.id].sort();
    const convId = ids.join('_');

    const q = query(
      collection(db, 'messages'),
      where('conversation_id', '==', convId),
      orderBy('sent_at', 'asc')
    );

    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => unsub();
  }, [activeConv, user]);

  const handleSend = async () => {
    if (!newMsg.trim() || !activeConv || !user?.id) return;
    setSending(true);
    const ids = [user.id, activeConv.id].sort();
    try {
      await addDoc(collection(db, 'messages'), {
        conversation_id: ids.join('_'),
        sender_id: user.id,
        receiver_id: activeConv.id,
        content: newMsg.trim(),
        is_read: false,
        sent_at: new Date().toISOString()
      });

      // Add partner to conversations list if new
      if (!conversations.find(c => c.id === activeConv.id)) {
        setConversations(prev => [...prev, activeConv]);
      }

      setNewMsg('');
    } catch (e) {
      console.error(e);
    }
    setSending(false);
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) {
    return (
      <div className="page-wrapper" dir={dir}>
        <div className="container" style={{ paddingTop: '120px', textAlign: 'center' }}>
          <i className="fas fa-lock" style={{ fontSize: '3rem', color: 'var(--text-secondary)', marginBottom: '16px' }}></i>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>
            {lang === 'en' ? 'Please log in to view messages.' : 'سجل دخولك لعرض الرسائل.'}
          </h2>
          <button className="btn-dash-primary" style={{ marginTop: '20px' }} onClick={() => setPage('login')}>
            {lang === 'en' ? 'Login' : 'تسجيل الدخول'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper" dir={dir} style={{ paddingBottom: 0 }}>
      <div className="messages-layout">
        {/* Sidebar */}
        <aside className="messages-sidebar">
          <div className="messages-sidebar-header">
            <h2 className="messages-title">{t.title}</h2>
          </div>
          {loading ? (
            <div className="loader" style={{ padding: '40px 0' }}>{t.loadingConvs}</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
              <i className="fas fa-comments" style={{ fontSize: '2rem', marginBottom: '12px', display: 'block' }}></i>
              {t.noConvs}
            </div>
          ) : (
            <div className="conv-list">
              {conversations.map(conv => (
                <div key={conv.id}
                  className={`conv-item ${activeConv?.id === conv.id ? 'active' : ''}`}
                  onClick={() => setActiveConv(conv)}>
                  <div className="conv-avatar">{(conv.name?.[0] || '?').toUpperCase()}</div>
                  <div className="conv-info">
                    <div className="conv-name">{conv.name || conv.email || conv.id}</div>
                    <div className="conv-role">{conv.role || ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Chat Area */}
        <div className="messages-chat">
          {!activeConv ? (
            <div className="chat-empty">
              <i className="fas fa-paper-plane" style={{ fontSize: '3rem', color: 'var(--text-secondary)' }}></i>
              <p style={{ color: 'var(--text-secondary)', marginTop: '16px' }}>{t.selectConv}</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                <div className="conv-avatar" style={{ width: '40px', height: '40px', fontSize: '16px' }}>
                  {(activeConv.name?.[0] || '?').toUpperCase()}
                </div>
                <div>
                  <div className="chat-header-name">{activeConv.name || activeConv.email}</div>
                  <div className="chat-header-role">{activeConv.role || ''}</div>
                </div>
              </div>

              {/* Messages */}
              <div className="chat-messages">
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px 0', fontSize: '13px' }}>
                    {t.noMessages}
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.sender_id === user.id;
                    return (
                      <div key={msg.id} className={`msg-bubble-wrap ${isMe ? 'me' : 'them'}`}>
                        <div className={`msg-bubble ${isMe ? 'bubble-me' : 'bubble-them'}`}>
                          {msg.content}
                        </div>
                        <div className="msg-time">{formatTime(msg.sent_at)}</div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="chat-input-bar">
                <input
                  className="chat-input"
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder={t.placeholder}
                />
                <button className="chat-send-btn" onClick={handleSend} disabled={sending || !newMsg.trim()}>
                  <i className={`fas fa-${sending ? 'spinner fa-spin' : 'paper-plane'}`}></i>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
