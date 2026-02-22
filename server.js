import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    systemInstruction: `Ты — бармен шот-бара «На дне» на Зыбицкой. Твой стиль: вежливый, но краткий и по делу. Ты ценишь время. 
    ТВОЯ ЗАДАЧА: Собрать данные для брони за МИНИМАЛЬНОЕ количество сообщений. 
    ПРАВИЛА: 
    1. СРАЗУ попроси: Имя, Время, Кол-во людей, Повод и Телефон. 
    2. Переспрашивай только недостающее. 
    3. Если всё прислано — напиши "Бронь принята!" и заверши диалог.`
});

async function sendToTelegram(bookingData) {
    const text = `🔔 **НОВАЯ БРОНЬ "НА ДНЕ"**\n\n` +
                 `👤 Данные: ${bookingData}\n` +
                 `📍 Место: Зыбицкая, 6`;
    
    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: text,
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('Ошибка Telegram:', error.message);
    }
}

app.post('/api/chat', async (req, res) => {
    const { message, history } = req.body;

    try {
        // Форматируем историю
        let formattedHistory = history.map(msg => ({
            role: msg.role === 'bot' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        }));

        // === ИСПРАВЛЕНИЕ ОШИБКИ GEMINI ===
        // Если история начинается с ответа бота (model), просто отрезаем его
        if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
            formattedHistory.shift();
        }

        const chat = model.startChat({
            history: formattedHistory
        });

        const result = await chat.sendMessage(message);
        const botResponse = result.response.text();

        if (botResponse.toLowerCase().includes("бронь принята") || botResponse.toLowerCase().includes("записал")) {
            await sendToTelegram(message);
        }

        res.json({ text: botResponse });
    } catch (error) {
        console.error('Ошибка Gemini:', error);
        res.status(500).json({ text: 'Проблемы со связью с ИИ. Бармен пошел проверять запасы.' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Сервер "На дне" запущен на порту ${PORT}`);
});
