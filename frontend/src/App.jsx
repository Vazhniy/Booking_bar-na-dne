import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const RENDER_URL = 'https://booking-bar-na-dne.onrender.com';

// Твои фирменные шоты
const SHOTS = ['Mintallica', 'Щавлик', 'Черрибос', 'цитрон', 'Хреновуха', 'Мандарини', 'Крамбамбуля', 'Сникерс'];

// Компонент мини-игры
const RouletteWidget = ({ onFinish }) => {
  const [currentShot, setCurrentShot] = useState('Нажми кнопку!');
  const [spinning, setSpinning] = useState(false);
  const [done, setDone] = useState(false);

  const spin = () => {
    setSpinning(true);
    let spins = 0;
    const interval = setInterval(() => {
      // Имитация мелькания вариантов
      setCurrentShot(SHOTS[Math.floor(Math.random() * SHOTS.length)]);
      spins++;
      
      if (spins > 20) {
        clearInterval(interval);
        // Финальный выбор
        const finalShot = SHOTS[Math.floor(Math.random() * SHOTS.length)];
        setCurrentShot(`🔥 ${finalShot} 🔥`);
        setSpinning(false);
        setDone(true);
        // Через 1.5 секунды автоматически отправляем результат в чат
        setTimeout(() => onFinish(`Выпал велком-шот: ${finalShot}`), 1500);
      }
    }, 100);
  };

  return (
    <div className="roulette-container">
      <h3>🎁 Бонус от бара!</h3>
      <p>Жми кнопку, чтобы узнать, какой шот мы нальем всей банде на входе:</p>
      <div className={`roulette-box ${spinning ? 'spinning' : ''} ${done ? 'done' : ''}`}>
        {currentShot}
      </div>
      {!done && <button onClick={spin} disabled={spinning} className="spin-btn">КРУТИТЬ!</button>}
    </div>
  );
};

function App() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Салют! Бармен со дна Зыбицкой на связи. 🥃 У нас тут темно, шумно и весело. Чтобы я забил вам лучший угол, пиши одним сообщением: как звать, когда ворветесь, сколько вас, по какому поводу пьем и номерок телефона!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (forcedMessage = null) => {
    const textToSend = forcedMessage || input;
    if (!textToSend.trim() || loading) return;
    
    const userMsg = { role: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(`${RENDER_URL}/api/chat`, {
        message: textToSend,
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
        {messages.map((msg, i) => {
          // Если бот присылает кодовую фразу, показываем игру
          if (msg.role === 'bot' && msg.text.includes('ВРЕМЯ РУЛЕТКИ')) {
            return <RouletteWidget key={i} onFinish={handleSend} />;
          }
          return (
            <div key={i} className={`message ${msg.role}`}>
              {msg.text}
            </div>
          );
        })}
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
        <button className="send-btn" onClick={() => handleSend()} disabled={loading}>
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    </div>
  );
}

export default App;
