import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const RENDER_URL = 'https://booking-bar-na-dne.onrender.com'; // ТВОЯ ССЫЛКА

function App() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Здорово! "На дне" на связи. Пока Keri не выпила всё Hippocras, давай бронировать! Как тебя зовут и когда ждать?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

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
      setMessages(prev => [...prev, { role: 'bot', text: 'Ошибка связи. Попробуй через минуту, бармен отошел за Shchavlik.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <button className="wheel-btn" onClick={() => alert('Колесо скоро будет готово!')}>🎡 Скидка</button>
      
      <header className="header">
        <img src="/logo.png" alt="На дне" className="logo" />
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
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Напиши бармену..."
        />
        <button className="send-btn" onClick={handleSend}>➜</button>
      </div>
    </div>
  );
}

export default App;
