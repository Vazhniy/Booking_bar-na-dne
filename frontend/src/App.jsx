import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const RENDER_URL = 'https://booking-bar-na-dne.onrender.com';

function App() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Здорово! «На дне» на связи. Чтобы Keri или Shchavlik не ворчали, давай быстро оформим бронь. Как тебя зовут и когда ждать?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(`${RENDER_URL}/api/chat`, {
        message: input,
        history: messages
      });
      setMessages(prev => [...prev, { role: 'bot', text: response.data.text }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', text: 'Ошибка сети. Бармен пошел проверять инфузии.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <button className="wheel-btn">🎡 СКИДКА</button>
      
      <header className="header">
        <div className="header-content">
          <img src="/logo.png" alt="Лого" className="logo" />
          <div className="header-text">
            <h1 className="bar-title">Бар На-дне</h1>
            <p className="bar-address">Зыбицкая, 6</p>
          </div>
        </div>
      </header>

      <div className="chat-window">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            {msg.text}
          </div>
        ))}
        {loading && <div className="message bot">...</div>}
        <div ref={chatEndRef} />
      </div>

      <div className="input-area">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Напиши бармену..."
        />
        <button className="send-btn" onClick={handleSend}>
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    </div>
  );
}

export default App;
