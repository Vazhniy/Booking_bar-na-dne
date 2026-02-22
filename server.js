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
const SHEET_URL = process.env.SHEET_URL;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const BASE_PROMPT = `
Ты — невероятно харизматичный, веселый и свой в доску бармен руин-бара «На дне» на Зыбицкой. 
Твой стиль: френдли сервис, остроумие, легкая ирония и атмосфера бесконечной тусовки. Ты общаешься с гостем как с давним приятелем, который зашел на шот.

ТВОЯ ЗАДАЧА:
1. Собрать данные для брони за МИНИМАЛЬНОЕ количество сообщений (Имя, Время, Кол-во тусовщиков, Повод, Телефон). Если всё прислано — напиши "Бронь принята!".
2. Отвечать на вопросы гостей про тусовки, диджеев, мероприятия и акции, опираясь ТОЛЬКО на предоставленное тебе актуальное расписание.

ПРАВИЛА ДИАЛОГА:
- Никакой духоты и скриптов. Пиши коротко, емко и ярко.
- Переспрашивай недостающие данные с юмором.
- Если спрашивают про акции, мероприятия или музыку — загляни в расписание, которое я передам ниже, и весело расскажи об этом гостю. 
- 🎧 ВАЖНОЕ ПРАВИЛО ПРО ДИДЖЕЕВ: В таблице диджеи написаны через запятую. Запомни железобетонное правило: ПЕРВЫЙ диджей всегда играет с 22:00 до 01:00, а ВТОРОЙ диджей — с 01:00 до 05:00. 
- Выдавай только то, о чем конкретно спросили.
`;

async function sendToTelegram(bookingData) {
    const text = `🔔 **НОВАЯ БРОНЬ "НА ДНЕ"**\n\n👤 Данные: ${bookingData}\n📍 Место: Зыбицкая, 6`;
    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID, text: text, parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('❌ Ошибка Telegram:', error.response?.data || error.message);
    }
}

app.get('/ping', (req, res) => res.status(200).send('Бармен не спит!'));

app.post('/api/chat', async (req, res) => {
    const { message, history } = req.body;
    try {
        let currentEvents = "Новостей пока нет.";
        if (SHEET_URL) {
            try { currentEvents = (await axios.get(SHEET_URL)).data; } catch (e) {}
        }

        const fullSystemPrompt = BASE_PROMPT + `\n\n=== АКТУАЛЬНОЕ РАСПИСАНИЕ ===\n${currentEvents}`;
        
        // ВАЖНО: Переключили на версию 1.5-flash с большими лимитами
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: fullSystemPrompt });

        let formattedHistory = history.map(msg => ({
            role: msg.role === 'bot' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        }));

        // Удаляем первое приветственное сообщение бота, чтобы оно не путало ИИ
        if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
            formattedHistory.shift();
        }

        // === ОГРАНИЧИТЕЛЬ ПАМЯТИ ===
        // Оставляем только последние 6 сообщений, чтобы не перегружать лимиты
        if (formattedHistory.length > 6) {
            formattedHistory = formattedHistory.slice(-6);
        }

        const chat = model.startChat({ history: formattedHistory });
        const result = await chat.sendMessage(message);
        const botResponse = result.response.text();

        if (botResponse.toLowerCase().includes("бронь принята")) {
            await sendToTelegram(message);
        }

        res.json({ text: botResponse });
    } catch (error) {
        console.error('Ошибка Gemini:', error);
        res.status(500).json({ text: 'Упс, бармен отвлекся на наливку. Попробуй еще раз чуть позже.' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Сервер запущен на порту ${PORT}`));
