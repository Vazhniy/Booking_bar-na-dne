import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const RENDER_URL = 'https://booking-bar-na-dne.onrender.com';
const DRINKS = ["Щавлик", "Кэри", "Цитрон", "Мандарини", "Молочник", "Черрибос", "Рафалия"];

// === БАЗА ЗНАНИЙ ТЕХКАРТ ===
const RECIPES = {
  "Щавлик": { base: 1000, assembly: { "Водка Schmidt": 250, "П/ф Сироп щавель": 270, "П/ф Раствор яблочной кислоты": 250, "Ароматизатор манго (по вкусу)": 0 }, prep: { "П/ф Сироп щавель": { "П/ф Сахарный сироп": 1000, "Щавель свежий (г)": 140 } } },
  "Ежевичная": { base: 1000, assembly: { "П/ф Иван чай": 600, "П/ф Сироп ежевика": 300, "П/ф Раствор яблочной кислоты": 100 }, prep: { "П/ф Иван чай": { "Водка Schmidt": 1000, "Иван чай (г)": 10 }, "П/ф Сироп ежевика": { "П/ф Сахарный сироп": 1000, "Ежевика с/м (г)": 650 } } },
  "Спотыкач": { base: 1000, assembly: { "П/ф Настойка черная смородина": 720, "П/ф Сахарный сироп": 280 }, prep: { "П/ф Настойка черная смородина": { "Водка Schmidt": 1000, "Черная смородина с/м (г)": 800, "Можжевеловая ягода (г)": 5 } } },
  "Перцовка": { base: 1000, assembly: { "П/ф Настойка перцовая": 880, "П/ф Сахарный сироп": 120 }, prep: { "П/ф Настойка перцовая": { "Водка Schmidt": 1000, "Чили (г)": 25, "Желт.перец (г)": 100, "Душистый перец (г)": 3, "Тмин (г)": 2 } } },
  "Померанцевка": { base: 1000, assembly: { "П/ф Настойка на корках": 700, "П/ф Сахарный сироп": 300 }, prep: { "П/ф Настойка на корках": { "Водка Schmidt": 1000, "Цедра апельсин (г)": 35, "Цедра лимон (г)": 8, "Мякоть апельсин (г)": 140 } } },
  "Крамбамбуля": { base: 3255, assembly: { "П/ф Крамбамбуля": 2400, "П/ф Чили": 45, "П/ф Сахарный сироп": 510, "Вода": 300 }, prep: { "П/ф Крамбамбуля": { "Водка Schmidt": 2400, "Цедра апельсин (г)": 48, "Мякоть апельсин (г)": 384, "Корица (г)": 19.2, "Гвоздика (г)": 4.8, "Душистый перец (г)": 1.92, "Бадьян (г)": 1.92, "Кардамон (г)": 1.92 } } },
  "Хреновуха": { base: 1000, assembly: { "П/ф Хреновуха": 920, "П/ф Сахарный сироп": 80 }, prep: { "П/ф Хреновуха": { "Водка Schmidt": 700, "Хрен (г)": 70, "Душ.перец (шт)": 7, "Чили (г)": 15 } } },
  "Сумерки": { base: 1000, assembly: { "П/ф Настойка Лаванда": 480, "Balance Смор/чер": 360, "П/ф Кордиал яблочной кислоты": 120, "Вода": 40 }, prep: { "П/ф Настойка Лаванда": { "Водка Schmidt": 1000, "Лаванда (г)": 4 } } },
  "Клюковка": { base: 1000, assembly: { "П/ф Настойка Лапсанг": 500, "П/ф Сироп клюква": 500 }, prep: { "П/ф Настойка Лапсанг": { "Водка Schmidt": 500, "Чай лапсанг (г)": 1.5 }, "П/ф Сироп клюква": { "П/ф Сахарный сироп": 500, "Клюква (г)": 500, "Соль (г)": 2 } } },
  "Рафалия": { base: 1000, assembly: { "П/ф Малина": 40, "П/ф Черника": 90, "П/ф Клубника": 65, "П/ф Вишня": 90, "П/ф Клюква": 65, "П/ф Черная смородина": 90, "П/ф Настойка на корках": 90, "П/ф Кордиал яблочной кислоты": 110, "П/ф Сахарный сироп": 180, "Вода": 180 }, prep: { "П/ф Малина": { "Водка Schmidt": 40, "Малина с/м (г)": 18 }, "П/ф Черника": { "Водка Schmidt": 90, "Черника с/м (г)": 72 }, "П/ф Клубника": { "Водка Schmidt": 65, "Клубника св/м (г)": 52 }, "П/ф Вишня": { "Водка Schmidt": 90, "Вишня с/м (г)": 90 }, "П/ф Клюква": { "Водка Schmidt": 65, "Клюква с/v (г)": 52 }, "П/ф Черная смородина": { "Водка Schmidt": 90, "Черная смородина с/м (г)": 72 }, "П/ф Настойка на корках": { "Водка Schmidt": 1000, "Цедра апельсин (г)": 35, "Цедра лимон (г)": 8, "Мякоть апельсин (г)": 140 } } },
  "Барби": { base: 1015, assembly: { "Водка Schmidt": 300, "Концентрат Richeza черника-мята": 70, "П/ф Сироп Черника": 100, "Сироп Richeza дыня": 140, "Сливки 10%": 175, "Молоко": 175, "Вода": 50, "Молочная кислота": 0 } },
  "Крестный молочник": { base: 720, assembly: { "Виски": 200, "Молоко": 200, "Сливки 10%": 200, "П/ф Медовый сироп": 100, "Сироп попкорн": 20 } },
  "Кэри": { base: 1100, assembly: { "П/ф Настойка клубника": 450, "Концентрат Грейпфрут/Малина": 120, "П/ф Раствор яблочной кислоты": 250, "П/ф Сахарный сироп": 280 }, prep: { "П/ф Настойка клубника": { "Водка Schmidt": 1000, "Клубника с/м (г)": 700 } } },
  "Минталлика": { base: 1000, assembly: { "Водка Schmidt": 452, "Balance Киви/мята": 452, "П/ф Сахарный сироп": 40, "П/ф Super Juice (Лайм)": 40, "Сироп мята Giffard": 15 } },
  "Цитрон": { base: 1000, assembly: { "П/ф Настойка Саган дайля": 480, "П/ф Super Juice (Лайм)": 280, "П/ф Сахарный сироп": 240 }, prep: { "П/ф Настойка Саган дайля": { "Водка Schmidt": 1000, "Саган Дайля (г)": 5 } } },
  "Mандарини": { base: 1000, assembly: { "П/ф Настойка Гибискус": 480, "Пюре каламанси": 150, "П/ф Сахарный сироп": 300, "П/ф Раствор яблочной кислоты": 70 }, prep: { "П/ф Настойка Гибискус": { "Водка Schmidt": 1000, "Чай каркадэ (г)": 14 } } },
  "Черрибос": { base: 1000, assembly: { "П/ф Настойка Вишня/ройбуш": 480, "Ароматизатор (по вкусу)": 0, "П/ф Кордиал яблочной кислоты": 490, "П/ф Раствор яблочной кислоты": 30 }, prep: { "П/ф Настойка Вишня/ройбуш": { "Водка Schmidt": 1000, "Вишня с/м (г)": 600, "Ройбуш (г)": 8 } } },
  "Тайская": { base: 1000, assembly: { "П/ф Настойка Чили": 450, "Balance Маракуйя/ваниль": 380, "П/ф Кордиал яблочной кислоты": 170 }, prep: { "П/ф Настойка Чили": { "Водка Schmidt": 1000, "Чили свежий (г)": 12 } } },
  "Зубровка": { base: 1000, assembly: { "П/ф Настойка Зубровка": 650, "П/ф Настойка на корках": 200, "П/ф Сахарный сироп": 150 }, prep: { "П/ф Настойка Зубровка": { "Водка Schmidt": 1000, "Зубровка (г)": 3, "Душица (г)": 1, "Мята сух. (г)": 1.5 }, "П/ф Настойка на корках": { "Водка Schmidt": 1000, "Цедра апельсин (г)": 35, "Цедра лимон (г)": 8, "Мякоть апельсин (г)": 140 } } },
  "Желе Ананас/кокос": { base: 1000, assembly: { "Водка Schmidt": 250, "Balance Ананас/кокос": 400, "Вода": 350, "Желатин (г)": 30 } },
  "Желе Земляника/эстрагон": { base: 1000, assembly: { "Водка Schmidt": 250, "Balance Земляника/эстрагон": 400, "Вода": 350, "Желатин (г)": 30 } },
  "Желе Алоэ/мята": { base: 1000, assembly: { "Водка Schmidt": 250, "Balance Алоэ/мята": 400, "Вода": 350, "Желатин (г)": 30 } },
  "Яблочный тини": { base: 1000, assembly: { "Водка Schmidt (белый)": 375, "Monin зел.яблоко": 175, "Сироп лемонграсс": 250, "П/ф Раствор яблочной кислоты": 200 }, prep: { "Сироп лемонграсс": { "П/ф Сахарный сироп": 1000, "Лемонграсс (г)": 120 } } },
  "Мангорита": { base: 1000, assembly: { "Текила Maxximo": 369, "Пюре манго": 284, "Сироп облепиха": 57, "П/ф Сахарный сироп": 142, "П/ф Super Juice (Лайм)": 142, "Сироп чили": 6 } },
  "Пенициллин": { base: 1000, assembly: { "Виски Bells": 488, "Сироп имбирь": 170, "П/ф Super Juice (Лимон)": 243, "П/ф Медовый сироп": 99, "Виски Laphroaig (пшик)": 1 }, prep: { "Сироп имбирь": { "П/ф Сахарный сироп": 1000, "Имбирь (г)": 1000 } } },
  "Бульвар-банан": { base: 1000, assembly: { "Jim beam": 238, "Cinzano Bianco": 380, "Campari": 238, "Ликер MB Банан": 144 } },
  "Clover Club": { base: 1000, assembly: { "Джин Kinross": 368, "Cinzano Extra Dry": 100, "Сироп Малина": 300, "П/ф Super Juice (Лимон)": 232 }, prep: { "Сироп Малина": { "Сахар (г)": 500, "Вода": 250, "Малина (г)": 500 } } },
  "Passion sour": { base: 1000, assembly: { "Водка Schmidt": 480, "Balance Маракуйя/Ваниль": 520, "Fluffy drop (капель)": 5 } },
  "Negroni": { base: 105, assembly: { "Джин Kinross": 35, "Cinzano Rosso": 40, "Carpano Bitter": 30 } },
  "Каси": { base: 1000, assembly: { "Джин Kinross": 300, "П/ф Спотыкач": 350, "П/ф Молочный кордиал": 350 } },
  "Личи Колада": { base: 1020, assembly: { "Ром Ангостура 3 года": 450, "Balance ананас/личи": 350, "Пюре замороженное ананас": 100, "П/ф Кордиал яблочной кислоты": 120 } },
  "Mint Bramble": { base: 90, assembly: { "Джин Kinross": 45, "Balance Ежевика/мята": 40, "П/ф Кордиал яблочной кислоты": 5 } },
  "Сникерс": { base: 900, assembly: { "П/ф Настойка арахис": 450, "П/ф Сироп Шоколад": 440, "П/ф Соленой раствор": 10, "Ваниль (по вкусу)": 0, "Карамель аромка (по вкусу)": 0 }, prep: { "П/ф Настойка арахис": { "Водка Schmidt": 450, "Арахис (г)": 225 }, "П/ф Сироп Шоколад": { "Вода": 440, "Сахар (г)": 250, "Какао порошок (г)": 50 }, "П/ф Соленой раствор": { "Вода": 10, "Соль (г)": 1 } } },
  "Мэри Микс (сангрита)": { base: 1000, assembly: { "Томатный сок": 800, "П/ф Super Juice (Лайм)": 60, "Соус табаско": 13, "Соус ворчестер": 8, "Соль (б.л.)": 2, "Паприка (б.л.)": 3, "Перец черный молотый (б.л.)": 1, "П/ф Сахарный сироп": 80 } },
  "П/ф Сироп лемонграсс": { base: 1000, assembly: { "П/ф Сахарный сироп": 1000, "Лемонграсс свежий (г)": 120 } },
  "П/ф Сироп имбирь": { base: 1000, assembly: { "П/ф Сахарный сироп": 1000, "Имбирь свежий очищ. (г)": 1000 } }
};

function App() {
  const [messages, setMessages] = useState([{ 
      role: 'bot', 
      text: 'Салют! На связи твой кибер-бармен Толик - помогу забронировать тебе столик!! Готовы опуститься на "Дно"? Столики "На Дне" разлетаются быстрее, чем шоты в пятницу! Ну что, бронируем или сначала изучим афишу?' 
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const [wheelState, setWheelState] = useState({ showModal: false, showButton: false, pendingData: null });
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonShot, setWonShot] = useState(null);

  const [isEmployeeMode, setIsEmployeeMode] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [volumes, setVolumes] = useState({});
  const [calcResults, setCalcResults] = useState(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, wheelState.showButton]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setInput('');

    if (userText.toLowerCase() === 'режим сотрудника') {
      setIsEmployeeMode(true);
      setMessages(prev => [...prev, { role: 'bot', text: 'Режим сотрудника активирован. Кнопка базы знаний разблокирована.' }]);
      setShowCalc(true); 
      return;
    }

    loading(true);
    setLoading(true);
    try {
      const response = await axios.post(`${RENDER_URL}/api/chat`, {
        message: userText, history: messages.map(m => ({role: m.role, text: m.text}))
      });
      setMessages(prev => [...prev, { role: 'bot', text: response.data.text }]);
      
      if (response.data.showWheel && response.data.telegramData) {
        setWheelState({ showModal: false, showButton: true, pendingData: response.data.telegramData });
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', text: 'Упс, сервера сегодня горят. Повтори-ка?' }]);
    } finally {
      setLoading(false);
    }
  };

  const openWheelModal = () => {
    setWheelState(prev => ({ ...prev, showModal: true, showButton: false }));
  };

  const spinWheel = () => {
    if (spinning || wonShot) return;
    setSpinning(true);
    
    const randomIndex = Math.floor(Math.random() * DRINKS.length);
    const sliceAngle = 360 / DRINKS.length;
    const targetRotation = rotation + 1800 + (360 - (randomIndex * sliceAngle));
    
    setRotation(targetRotation);

    setTimeout(async () => {
      setSpinning(false);
      setWonShot(DRINKS[randomIndex]);
      
      try {
          await axios.post(`${RENDER_URL}/api/telegram`, {
            telegramData: wheelState.pendingData,
            wonShot: DRINKS[randomIndex]
          });
      } catch (e) {
          console.error("Критическая ошибка отправки брони в ТГ:", e);
      }

      setMessages(prev => [...prev, { role: 'bot', text: `🎉 Выпало: **${DRINKS[randomIndex]}**! Записал, приготовил. Жду вас на баре!` }]);

      setTimeout(() => {
        setWheelState({ showModal: false, showButton: false, pendingData: null });
        setWonShot(null);
      }, 4000);
    }, 4000);
  };

  const handleVolumeChange = (name, value) => {
    setVolumes(prev => ({ ...prev, [name]: value }));
  };

  const generateCalculation = () => {
    const results = [];
    const warehouseTotals = {};

    Object.keys(volumes).forEach(drinkName => {
      const vol = parseFloat(volumes[drinkName]);
      if (!vol || vol <= 0) return;

      const recipe = RECIPES[drinkName];
      const drinkCoef = vol / recipe.base;
      const drinkResult = { name: drinkName, vol: vol, assembly: [], preps: [] };

      Object.entries(recipe.assembly).forEach(([ing, amount]) => {
        if (amount === 0 || typeof amount === 'string') return;
        const needed = amount * drinkCoef;
        drinkResult.assembly.push({ name: ing, value: needed.toFixed(1).replace('.0', '') });
        
        if (!recipe.prep || !recipe.prep[ing]) {
          warehouseTotals[ing] = (warehouseTotals[ing] || 0) + needed;
        }
      });

      if (recipe.prep) {
        Object.entries(recipe.prep).forEach(([prepName, prepIngs]) => {
          const neededPrepVol = recipe.assembly[prepName] * drinkCoef;
          const basePrepVol = Object.values(prepIngs)[0]; 
          const prepCoef = neededPrepVol / basePrepVol;
          
          const rawItems = [];
          Object.entries(prepIngs).forEach(([rawIng, rawAmount]) => {
            const rawNeeded = rawAmount * prepCoef;
            rawItems.push({ name: rawIng, value: rawNeeded.toFixed(1).replace('.0', '') });
            warehouseTotals[rawIng] = (warehouseTotals[rawIng] || 0) + rawNeeded;
          });
          
          drinkResult.preps.push({ name: prepName, vol: neededPrepVol.toFixed(0), items: rawItems });
        });
      }
      results.push(drinkResult);
    });

    setCalcResults({ individual: results, totals: warehouseTotals });
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-content">
          <div className="logo-wrapper"><img src="/logo.png" alt="Лого" className="logo" /></div>
          <div className="header-text">
            <h1 className="bar-title">Шот-бар На дне</h1>
            <p className="bar-address">Зыбицкая, 6</p>
          </div>
          {isEmployeeMode && (
            <button className="employee-btn" onClick={() => setShowCalc(true)}>🧮 Техкарты</button>
          )}
        </div>
      </header>

      <div className="chat-window">
        {messages.map((msg, i) => (
          <div key={i} className={`message-row ${msg.role}`}>
            {msg.role === 'bot' && <img src="/logo.png" alt="Толик" className="bot-avatar" />}
            <div className={`message ${msg.role}`}>{msg.text}</div>
          </div>
        ))}
        {loading && (
          <div className="message-row bot">
            <img src="/logo.png" alt="Толик" className="bot-avatar" />
            <div className="typing-indicator"><div className="typing-dot"></div><div className="typing-dot"></div><div className="typing-dot"></div></div>
          </div>
        )}
        
        {wheelState.showButton && (
           <div style={{ textAlign: 'center', marginTop: '10px', animation: 'messagePop 0.4s ease forwards' }}>
             <button onClick={openWheelModal} style={{
                background: 'linear-gradient(135deg, #7b2cbf 0%, #5a189a 100%)',
                color: 'white', border: 'none', padding: '15px 30px', borderRadius: '30px',
                fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 0 20px rgba(123, 44, 191, 0.6)'
             }}>
                🎁 Крутить Колесо Фортуны
             </button>
           </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div className="input-area">
        <div className="input-wrapper">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder="Напиши Толику..." disabled={wheelState.showModal} />
        </div>
        <button className="send-btn" onClick={handleSend} disabled={loading || wheelState.showModal}>
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>

      {wheelState.showModal && (
        <div className="wheel-modal">
          <div className="wheel-modal-content">
            <h2>Колесо Фортуны</h2>
            <p>{wonShot ? `🎉 Вы выиграли: ${wonShot}!` : 'Крути, чтобы узнать свой подарок!'}</p>
            <div className="wheel-container">
              <div className="wheel-pointer"></div>
              <div className="wheel-spinner" style={{ transform: `rotate(${rotation}deg)` }}>
                {DRINKS.map((drink, i) => {
                  const angle = i * (360 / DRINKS.length) + (360 / DRINKS.length / 2);
                  return (
                    <div 
                      className="wheel-label" 
                      key={i} 
                      style={{ transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-100px)` }}
                    >
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

      {showCalc && (
        <div className="calc-modal">
          <div className="calc-modal-content">
            <button className="calc-close" onClick={() => setShowCalc(false)}>✖</button>
            <h2>🧮 База и расчеты</h2>
            
            <div className="drinks-grid">
              {Object.keys(RECIPES).map(drink => (
                <React.Fragment key={drink}>
                  <div className="drink-row-label">{drink}</div>
                  <input 
                    type="number" 
                    className="drink-row-input" 
                    placeholder="0 мл" 
                    value={volumes[drink] || ''}
                    onChange={(e) => handleVolumeChange(drink, e.target.value)}
                  />
                </React.Fragment>
              ))}
            </div>

            <div className="calc-btn-container">
              <button className="calc-action-btn" onClick={generateCalculation}>Построить расчеты</button>
            </div>

            {calcResults && calcResults.individual.length > 0 && (
              <div className="calc-results-area">
                {calcResults.individual.map((res, i) => (
                  <div key={i} className="result-card">
                    <h4>{res.name} ({res.vol} мл)</h4>
                    
                    <div className="result-section-title">Сборка</div>
                    {res.assembly.map((ing, j) => (
                      <div key={j} className="result-item"><span>{ing.name}</span><b>{ing.value}</b></div>
                    ))}
                    
                    {res.preps.length > 0 && <div className="result-section-title" style={{marginTop:'15px'}}>Заготовки (П/ф)</div>}
                    {res.preps.map((prep, j) => (
                      <div key={j} style={{marginBottom:'10px'}}>
                        <div style={{color:'#c77dff', fontSize:'0.85rem'}}>🔹 {prep.name} ({prep.vol} мл)</div>
                        {prep.items.map((raw, k) => (
                          <div key={k} className="result-item" style={{paddingLeft:'15px'}}><span>{raw.name}</span><b>{raw.value}</b></div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}

                <div className="result-card total-card">
                  <h4>📦 ИТОГО СО СКЛАДА</h4>
                  {Object.entries(calcResults.totals)
                    .sort((a, b) => b[1] - a[1]) 
                    .map(([ing, amount]) => (
                    <div key={ing} className="result-item">
                      <span>{ing}</span>
                      <b>{amount.toFixed(1).replace('.0', '')} {ing.includes('(шт)') || ing.includes('(капель)') || ing.includes('(пшик)') ? 'шт/кап' : ''}</b>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
