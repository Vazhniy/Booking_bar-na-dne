import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

// ВАЖНО: Убедись, что тут твоя актуальная ссылка с Render
const RENDER_URL = 'https://booking-bar-na-dne.onrender.com';

function App() {
  // Начальное сообщение от "бармена"
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Здорово! Бар «На дне» на связи. Как тебя зовут и когда ждать?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Автопрокрутка вниз при новом сообщении
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput(''); // Очищаем поле сразу
    setLoading(true);

    try {
      const response = await axios.post(`${RENDER_URL}/api/chat`, {
        message: currentInput,
        // Отправляем историю для контекста
        history: messages.map(m => ({role: m.role, text: m.text}))
      });
      setMessages(prev => [...prev, { role: 'bot', text: response.data.text }]);
    } catch (error) {
      console.error("Ошибка:", error);
      setMessages(prev => [...prev, { role: 'bot', text: 'Проблемы со связью. Попробуй еще раз.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      
      {/* Шапка в стиле iOS */}
      <header className="header">
        <div className="header-back">
          <span>‹</span> Назад
        </div>
        <div className="header-title">
          <span className="bar-name">Бар На-дне</span>
          <span className="bar-status">Зыбицкая, 6</span>
        </div>
        <div className="header-right"></div> {/* Заглушка для баланса */}
      </header>

      {/* Окно чата */}
      <div className="chat-window">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            {msg.text}
          </div>
        ))}
        {/* Простой индикатор загрузки в стиле iOS */}
        {loading && <div className="message bot" style={{color: '#8E8E93'}}>...</div>}
        <div ref={chatEndRef} /> {/* Якорь для прокрутки */}
      </div>

      {/* Панель ввода в стиле iMessage */}
      <div className="input-area">
        <div className="input-wrapper">
          <input 
            type="text" 
            placeholder="iMessage"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
        </div>
        <button 
            className="send-btn" 
            onClick={handleSend} 
            disabled={!input.trim() || loading}
        >
          ↑
        </button>
      </div>
    </div>
  );
}

export default App;
