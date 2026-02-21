import React, { useState, useRef, useEffect } from 'react';
import { Send, Zap, Wine } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const ExternalWheel = ({ onClaim }) => (
  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center p-2 bg-zinc-900 border-4 border-amber-600 rounded-[2.5rem] my-4 overflow-hidden">
    <div className="w-full h-[450px] rounded-2xl overflow-hidden shadow-inner">
      <iframe src="https://wheelofnames.com/ru/sw3-37x" width="100%" height="100%" frameBorder="0"></iframe>
    </div>
    <div className="p-4 w-full text-center">
      <button onClick={onClaim} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-4 rounded-2xl transition-all shadow-lg active:scale-95 uppercase tracking-widest">
        Я ВЫИГРАЛ ПРИЗ! 🥃
      </button>
    </div>
  </motion.div>
);

export default function App() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Добро пожаловать "На дне"! 🥃 Я помогу забронировать стол в самом сердце Зыбицкой. Как тебя зовут?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showWheel, setShowWheel] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSendMessage = async (text) => {
    if (!text.trim() || isLoading) return;
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/chat', {
        message: text,
        history: messages.map(m => ({ role: m.role, content: m.content }))
      });
      
      setMessages([...newMessages, { role: 'assistant', content: response.data.reply }]);
      if (response.data.isFinal) setTimeout(() => setShowWheel(true), 1000);
    } catch (e) {
      setMessages([...newMessages, { role: 'assistant', content: '❌ Ошибка связи. Проверь, запущен ли сервер (node server.js) в терминале.' }]);
    } finally { setIsLoading(false); }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#050505] text-zinc-100 p-4">
      <div className="fixed inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/asfalt-dark.png')]"></div>
      
      <div className="relative w-full max-w-md h-[92vh] flex flex-col bg-zinc-950 border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-8 py-6 bg-zinc-900/80 border-b border-white/5 flex items-center gap-4">
          <img src="/logo.png" alt="Logo" className="w-12 h-12 invert" />
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter leading-none">На дне</h1>
            <p className="text-[9px] text-amber-500 font-bold uppercase tracking-[0.2em] mt-1">Зыбицкая, Минск</p>
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-5 py-3 rounded-[2rem] text-sm ${msg.role === 'user' ? 'bg-amber-500 text-black font-bold' : 'bg-zinc-800/50 border border-white/10'}`}>
                {msg.content}
              </div>
            </motion.div>
          ))}
          {isLoading && <div className="text-zinc-500 text-xs animate-pulse">Бармен печатает...</div>}
          {showWheel && <ExternalWheel onClaim={() => { setShowWheel(false); handleSendMessage("Я выиграл бесплатный шот! Наливай!"); }} />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 bg-zinc-900/50">
          <div className="relative flex items-center gap-3">
            <input 
              type="text" value={inputValue} disabled={isLoading}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
              placeholder="Напиши бармену..." 
              className="flex-1 bg-black border border-white/10 rounded-full px-6 py-4 text-sm focus:outline-none focus:border-amber-500"
            />
            <button onClick={() => handleSendMessage(inputValue)} className="bg-amber-500 p-4 rounded-full text-black">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}