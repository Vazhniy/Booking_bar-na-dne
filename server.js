import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());
app.use(express.static('build'));

if (!process.env.GEMINI_API_KEY) {
    console.error("❌ ОШИБКА: GEMINI_API_KEY не задан!");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const SHEET_URL = process.env.SHEET_URL;

const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 7,
    handler: (req, res) => {
        res.status(200).json({ text: 'Воу-воу, полегче, пулеметчик! Дай мне минуту перекурить.' });
    }
});

const telegramLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 2,
    handler: (req, res) => {
        res.status(429).json({ success: false, message: 'Слишком много отправок.' });
    }
});

// Промпт (убедись, что здесь вставлен твой полный текст из старого файла)
const BASE_PROMPT = `Ты — Толик, саркастичный, но обаятельный и профессиональный бармен... [ВСТАВЬ СЮЮДА ВЕСЬ СВОЙ ОРИГИНАЛЬНЫЙ ПРОМПТ]`;

async function sendMessageWithRetry(chat, message, maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await chat.sendMessage(message);
        } catch (error) {
            console.error(`Попытка ${attempt + 1} не удалась:`, error.message);
            if (attempt === maxRetries - 1) throw error;
            await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        }
    }
}

app.post('/api/chat', chatLimiter, async (req, res) => {
    const { message, history } = req.body;
    try {
        let currentEvents = "Новостей пока нет.";
        if (SHEET_URL) {
            try { currentEvents = (await axios.get(SHEET_URL)).data; } catch (e) {}
        }

        const mskTime = new Intl.DateTimeFormat('ru-RU', { 
            timeZone: 'Europe/Minsk', hour: 'numeric', minute: 'numeric' 
        }).format(new Date());

        const fullSystemPrompt = `${BASE_PROMPT}\nВремя: ${mskTime}. Расписание: ${currentEvents}`;
        
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash", 
            systemInstruction: fullSystemPrompt 
        });

        // ПРЕОБРАЗОВАНИЕ ИСТОРИИ С ЗАЩИТОЙ
        let formattedHistory = history.map(msg => ({
            role: msg.role === 'bot' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        }));

        // КРИТИЧЕСКИЙ ФИКС: Удаляем "модель" из начала, пока первым не будет "user"
        while (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
            formattedHistory.shift();
        }

        formattedHistory = formattedHistory.slice(-6);

        const chat = model.startChat({ history: formattedHistory });
        const result = await sendMessageWithRetry(chat, message);
        let botResponse = result.response.text();

        let telegramData = null;
        let showWheel = false;

        if (botResponse.includes("ТЕЛЕГРАМ:")) {
            const parts = botResponse.split("ТЕЛЕГРАМ:");
            botResponse = parts[0].trim();
            telegramData = parts[1].trim();
            showWheel = true;
        }

        res.json({ text: botResponse, showWheel, telegramData });
    } catch (error) {
        console.error('Ошибка Gemini:', error.message);
        res.status(500).json({ text: 'Упс, сервера сегодня горят. Повтори-ка, что ты сказал?' });
    }
});

app.post('/api/telegram', telegramLimiter, async (req, res) => {
    const { telegramData, wonShot } = req.body;
    const text = `🔔 **НОВАЯ БРОНЬ**\n\n${telegramData}\n🎁 Выиграли: ${wonShot}`;
    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID, text, parse_mode: 'Markdown'
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Сервер запущен на ${PORT}`));
