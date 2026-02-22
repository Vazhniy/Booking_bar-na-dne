import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const RENDER_URL = 'https://booking-bar-na-dne.onrender.com';

function App() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Здорово! 🥃 Жду тебя "На дне". Пока Keri не разлила все инфузии, а Shchavlik не ушел в депрессию — давай бронировать стол! Как тебя величать и когда ждать?' }
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
      setMessages(prev => [...prev, { role: 'bot', text: 'Ошибка сети. Бармен уронил бокал, попробуй еще раз.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Кнопка колеса теперь просто иконка */}
      <button className="wheel-trigger" onClick={() => alert('🎡 Скоро здесь будет розыгрыш!')}>
        🎡
      </button>

      <header className="header">
        <div className="logo-wrapper">
          <img src="/logo.png" alt="На дне" className="logo" />
          <div className="status-line">Minsk • Zybitskaya</div>
        </div>
      </header>

      <div className="chat-window">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            {msg.text}
          </div>
        ))}
        {loading && <div className="message bot">Печатает...</div>}
        <div ref={chatEndRef} />
      </div>

      <div className="input-area">
        <input 
          placeholder="Твой ответ..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button className="send-btn" onClick={handleSend} disabled={loading}>
          {/* Новая минималистичная иконка стрелки */}
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12H19M19 12L13 6M19 12L13 18" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default App;
