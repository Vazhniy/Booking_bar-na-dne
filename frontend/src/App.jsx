import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const RENDER_URL = 'https://booking-bar-na-dne.onrender.com';

function App() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Здорово! "На дне" на связи. 🥃 Пока Keri не выпила всё Hippocras, а Shchavlik не стал еще кислее — давай бронировать стол! Как тебя зовут и когда ждать?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(`${RENDER_URL}/api/chat`, {
        message: input,
        history: messages.map(m => ({role: m.role, text: m.text}))
      });
      setMessages(prev => [...prev, { role: 'bot', text: response.data.text }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', text: 'Ошибка сети. Бармен пошел менять кегу, попробуй еще раз.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <button className="wheel-trigger" onClick={() => alert('🎡 Колесо удачи скоро будет запущено!')}>
        WHEEL OF FORTUNE
      </button>

      <header className="header">
        <img src="/logo.png" alt="На дне" className="logo" />
        <div className="status">Zybitskaya Underground</div>
      </header>

      <div className="chat-window">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            {msg.text}
          </div>
        ))}
        {loading && (
          <div className="typing">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="input-area">
        <input 
          placeholder="Напиши бармену..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button className="send-btn" onClick={handleSend}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default App;
