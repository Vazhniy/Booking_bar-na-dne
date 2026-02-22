import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const RENDER_URL = 'https://booking-bar-na-dne.onrender.com';

function App() {
  const [messages, setMessages] = useState([
    // === НОВАЯ ШУТЛИВАЯ СТАРТОВАЯ ФРАЗА ===
    { role: 'bot', text: 'Салют! Бармен со дна Зыбицкой на связи. 🥃 У нас тут темно, шумно и весело. Чтобы я забил вам лучший угол, пиши одним сообщением: как звать, когда ворветесь, сколько вас, по какому поводу пьем и номерок телефона!' }
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
        history: messages.map(m => ({role: m.role, text: m.text}))
      });
      setMessages(prev => [...prev, { role: 'bot', text: response.data.text }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', text: 'Упс, бармен отвлекся на наливку. Попробуй еще раз чуть позже.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-content">
          <div className="logo-wrapper">
            <img src="/logo.png" alt="Лого" className="logo" />
          </div>
          <div className="header-text">
            <h1 className="bar-title">Шот-бар На дне</h1>
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
        {loading && <div className="message bot" style={{opacity: 0.5}}>...</div>}
        <div ref={chatEndRef} />
      </div>

      <div className="input-area">
        <div className="input-wrapper">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Напиши бармену..."
          />
        </div>
        <button className="send-btn" onClick={handleSend} disabled={loading}>
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    </div>
  );
}

export default App;
