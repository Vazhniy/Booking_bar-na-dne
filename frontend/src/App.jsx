import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const RENDER_URL = 'https://booking-bar-na-dne.onrender.com';
const DRINKS = ["Щавлик", "Кэри", "Цитрон", "Мандарини", "Молочник", "Черрибос", "Рафалия"];

function App() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Салют! На связи Толик — твой кибер-бармен в руин-баре «На дне». 🥃 Столики у нас разлетаются быстрее, чем шоты в пятницу, но я могу придержать для тебя отличное место! А если хочешь знать, под чьи биты будем отрываться и какие спешлы стынут на баре — солью все инсайды. Ну что, забиваем место или сначала изучаем афишу?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Состояния для Колеса Фортуны
  const [wheelState, setWheelState] = useState({ show: false, pendingData: null });
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonShot, setWonShot] = useState(null);

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
      
      // Если Толик дал добро на игру
      if (response.data.showWheel && response.data.telegramData) {
        setTimeout(() => {
          setWheelState({ show: true, pendingData: response.data.telegramData });
        }, 1000);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', text: 'Упс, бармен отвлекся на наливку. Попробуй еще раз чуть позже.' }]);
    } finally {
      setLoading(false);
    }
  };

  const spinWheel = () => {
    if (spinning || wonShot) return;
    setSpinning(true);
    
    const randomIndex = Math.floor(Math.random() * DRINKS.length);
    const sliceAngle = 360 / DRINKS.length;
    // Крутим минимум 5 раз (1800 градусов) + выставляем нужный угол
    const targetRotation = rotation + 1800 + (360 - (randomIndex * sliceAngle));
    
    setRotation(targetRotation);

    setTimeout(async () => {
      setSpinning(false);
      setWonShot(DRINKS[randomIndex]);
      
      // Отправляем финальные данные админу в Телеграм
      await axios.post(`${RENDER_URL}/api/telegram`, {
        telegramData: wheelState.pendingData,
        wonShot: DRINKS[randomIndex]
      });

      // Добавляем системное сообщение в чат
      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: `🎉 Выпало: **${DRINKS[randomIndex]}**! Записал, приготовил. Жду вас на баре!` 
      }]);

      setTimeout(() => {
        setWheelState({ show: false, pendingData: null });
        setWonShot(null);
      }, 3500); // Закрываем колесо через 3.5 сек после победы

    }, 4000); // 4 секунды длится анимация
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
          <div key={i} className={`message-row ${msg.role}`}>
            {msg.role === 'bot' && <img src="/logo.png" alt="Толик" className="bot-avatar" />}
            <div className={`message ${msg.role}`}>
              {msg.text}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="message-row bot">
            <img src="/logo.png" alt="Толик" className="bot-avatar" />
            <div className="typing-indicator">
              <div className="typing-dot"></div><div className="typing-dot"></div><div className="typing-dot"></div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="input-area">
        <div className="input-wrapper">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder="Напиши Толику..." disabled={wheelState.show} />
        </div>
        <button className="send-btn" onClick={handleSend} disabled={loading || wheelState.show}>
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>

      {/* === МОДАЛЬНОЕ ОКНО С КОЛЕСОМ === */}
      {wheelState.show && (
        <div className="wheel-modal">
          <div className="wheel-modal-content">
            <h2>Колесо Фортуны</h2>
            <p>{wonShot ? `🎉 Вы выиграли: ${wonShot}!` : 'Крути, чтобы узнать свой подарок!'}</p>
            
            <div className="wheel-container">
              <div className="wheel-pointer"></div>
              <div 
                className="wheel-spinner" 
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                {DRINKS.map((drink, i) => {
                  const angle = i * (360 / DRINKS.length) + (360 / DRINKS.length / 2);
                  return (
                    <div className="wheel-label" key={i} style={{ transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-105px)` }}>
                      {drink}
                    </div>
                  );
                })}
              </div>
            </div>

            <button className={`spin-btn ${spinning || wonShot ? 'disabled' : ''}`} onClick={spinWheel}>
              {wonShot ? 'Наливаем...' : 'КРУТИТЬ!'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
