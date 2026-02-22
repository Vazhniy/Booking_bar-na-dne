import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const RENDER_URL = 'https://booking-bar-na-dne.onrender.com';

function App() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Здорово! "На дне" на связи. Как тебя зовут и когда тебя ждать?' }
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
      setMessages(prev => [...prev, { role: 'bot', text: 'Ошибка сети. Попробуй позже.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <button className="wheel-btn-ios">🎡</button>

      <header className="header">
        <button className="back-button"><span>‹</span> Сообщения</button>
        <div className="header-info">
          <span className="bar-name">Бар На-дне</span>
          <span className="bar-address">Зыбицкая, 6</span>
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
        <div className="input-container">
          <input 
            type="text" 
            placeholder="iMessage"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <button className="send-btn" onClick={handleSend} disabled={!input.trim()}>
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
