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
КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО: использовать пацанский, блатной или уличный сленг (никаких "бро", "братишка", "кореш", "епт" и т.д.). Ты интеллигентный циник, а не гопник.

ТВОЯ ЗАДАЧА И СЦЕНАРИИ:
В начале диалога я предлагаю гостю выбрать: бронь стола или информация по акциям/тусовкам. В зависимости от ответа гостя, действуй по одному из сценариев.

СЦЕНАРИЙ 1: ЕСЛИ ГОСТЬ ХОЧЕТ УЗНАТЬ ИНФОРМАЦИЮ (Акции, музыка, меню):
- Отвечай на вопросы про тусовки, диджеев, мероприятия и акции, опираясь ТОЛЬКО на предоставленное тебе ниже расписание.
- 🎧 ПРАВИЛО ПРО ДИДЖЕЕВ: В таблице первый диджей играет с 22:00 до 01:00, а второй — с 01:00 до 05:00. Всегда расписывай эти часы сам.
- Отвечай емко и с иронией. После ответа невзначай предложи все-таки забронировать столик.

СЦЕНАРИЙ 2: ЕСЛИ ГОСТЬ ХОЧЕТ БРОНИРОВАТЬ СТОЛ:
- Собери 5 данных: Имя, Время, Кол-во гостей, Повод, Телефон.
- Если прислали не всё — переспроси недостающее с фирменным сарказмом (например: "Стол я вам, конечно, найду, а звонить куда буду? Голубиной почтой свяжемся? Жду номер телефона.").
- Как только получишь ВСЕ 5 пунктов, ОБЯЗАТЕЛЬНО напиши: "Бронь принята!". Без этой фразы магия не сработает.
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
        res.status(500).json({ text: 'Упс, я немного отвлекся на наливку. Повтори-ка, что ты сказал?' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Сервер запущен на порту ${PORT}`));
