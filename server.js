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
Ты — Толик, саркастичный, ироничный, но обаятельный и профессиональный бармен руин-бара «На дне» на Зыбицкой. 
Твой стиль: тонкий юмор, сарказм, вежливость с остринкой. 
КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО: использовать пацанский, блатной или уличный сленг. Ты интеллигентный циник, а не гопник. С пользователем уже поздоровались в интерфейсе, не пиши "привет".

СЦЕНАРИЙ 1: ИНФОРМАЦИЯ (Акции, музыка, меню):
- Отвечай на вопросы по расписанию ниже. Первый диджей: 22:00-01:00, второй: 01:00-05:00. После ответа предложи бронь стола.

СЦЕНАРИЙ 2: БРОНИРОВАНИЕ СТОЛА:
- Собери 5 данных: 1. Имя 2. Время 3. Кол-во гостей 4. Повод 5. Телефон
- Переспрашивай недостающее с фирменным сарказмом.

🚨 ВАЖНО: КАК ТОЛЬКО ПОЛУЧИШЬ ВСЕ 5 ПУНКТОВ, ОТВЕТЬ СТРОГО ПО ЭТОМУ ШАБЛОНУ:

[Твой саркастичный комментарий о том, что стол найден]

Бронь принята! А теперь проверим вашу удачу. Крутите Колесо Фортуны, чтобы узнать, какой фирменный шот я налью вам в подарок!

ТЕЛЕГРАМ:
Имя: [Имя]
Время: [Время]
Кол-во: [Кол-во]
Повод: [Повод]
Телефон: [Телефон]
`;

app.get('/ping', (req, res) => res.status(200).send('Толик на смене!'));

app.post('/api/chat', async (req, res) => {
    const { message, history } = req.body;
    try {
        let currentEvents = "Новостей пока нет, но алкоголь на месте.";
        if (SHEET_URL) {
            try { currentEvents = (await axios.get(SHEET_URL)).data; } catch (e) {}
        }

        const fullSystemPrompt = BASE_PROMPT + `\n\n=== АКТУАЛЬНОЕ РАСПИСАНИЕ ===\n${currentEvents}`;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction: fullSystemPrompt });

        let formattedHistory = history.map(msg => ({
            role: msg.role === 'bot' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        }));

        if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') formattedHistory.shift();
        if (formattedHistory.length > 6) formattedHistory = formattedHistory.slice(-6);

        const chat = model.startChat({ history: formattedHistory });
        const result = await chat.sendMessage(message);
        let botResponse = result.response.text();

        let telegramData = null;
        let showWheel = false;

        // Ищем скрытый блок, отрезаем его и передаем во фронтенд
        if (botResponse.includes("ТЕЛЕГРАМ:")) {
            const parts = botResponse.split("ТЕЛЕГРАМ:");
            botResponse = parts[0].trim(); 
            telegramData = parts[1].trim(); 
            showWheel = true;
        }

        res.json({ text: botResponse, showWheel, telegramData });
    } catch (error) {
        console.error('Ошибка Gemini:', error);
        res.status(500).json({ text: 'Упс, я немного отвлекся на наливку. Повтори-ка, что ты сказал?' });
    }
});

// НОВЫЙ МАРШРУТ: Отправляет финальную бронь после вращения колеса
app.post('/api/telegram', async (req, res) => {
    const { telegramData, wonShot } = req.body;
    const text = `🔔 **НОВАЯ БРОНЬ "НА ДНЕ"**\n\n👤 Данные:\n${telegramData}\n\n🎁 Выиграли: **${wonShot}**\n📍 Место: Шот-бар На Дне`;
    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID, text: text, parse_mode: 'Markdown'
        });
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Сервер запущен на порту ${PORT}`));
