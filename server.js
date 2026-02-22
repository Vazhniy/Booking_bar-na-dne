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
Ты — харизматичный, веселый бармен руин-бара «На дне» на Зыбицкой.

ПРАВИЛА ДИАЛОГА:
- Никакой духоты и скриптов. Пиши коротко, емко и ярко.
- Если спрашивают про акции, мероприятия или музыку — загляни в расписание ниже. 
- ПРАВИЛО ПРО ДИДЖЕЕВ: ПЕРВЫЙ диджей из таблицы всегда играет с 22:00 до 01:00, а ВТОРОЙ — с 01:00 до 05:00.

ТВОЯ ЗАДАЧА И ЭТАПЫ БРОНИ:
ЭТАП 1: Собрать 5 данных: Имя, Время, Кол-во людей, Повод, Телефон.
ЭТАП 2: Как только получишь ВСЕ 5 пунктов, НЕ ПОДТВЕРЖДАЙ БРОНЬ. Напиши гостю фразу: "Всё записал! А теперь бонус от заведения. ВРЕМЯ РУЛЕТКИ" (Фраза ВРЕМЯ РУЛЕТКИ обязательна, она запустит игру у гостя на экране).
ЭТАП 3: Гость пришлет сообщение с результатом (например, "Выпал велком-шот: Сникерс").
ЭТАП 4: Радостно отреагируй на выпавший напиток и напиши финальное подтверждение брони. В конце своего сообщения ОБЯЗАТЕЛЬНО добавь скрытый блок для администратора по шаблону (используй слово ТЕЛЕГРАМ:):
"Бронь принята! Жду вас!
ТЕЛЕГРАМ: 
Имя: [Имя]
Время: [Время]
Кол-во: [Кол-во]
Повод: [Повод]
Телефон: [Телефон]
Выигрыш: [Название шота]"
`;

async function sendToTelegram(bookingData) {
    const text = `🔔 **НОВАЯ БРОНЬ "НА ДНЕ"**\n\n` + bookingData + `\n\n📍 Место: Зыбицкая, 6`;
    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: text,
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('❌ Ошибка Telegram:', error.response?.data || error.message);
    }
}

app.get('/ping', (req, res) => res.status(200).send('Пинг прошел!'));

app.post('/api/chat', async (req, res) => {
    const { message, history } = req.body;

    try {
        let currentEvents = "Новостей пока нет.";
        if (SHEET_URL) {
            try {
                const sheetResponse = await axios.get(SHEET_URL);
                currentEvents = sheetResponse.data;
            } catch (e) {}
        }

        const fullSystemPrompt = BASE_PROMPT + `\n\n=== АКТУАЛЬНОЕ РАСПИСАНИЕ ===\n${currentEvents}`;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction: fullSystemPrompt });

        let formattedHistory = history.map(msg => ({
            role: msg.role === 'bot' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        }));

        if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
            formattedHistory.shift();
        }

        const chat = model.startChat({ history: formattedHistory });
        const result = await chat.sendMessage(message);
        let botResponse = result.response.text();

        // Если бронь принята, извлекаем данные для Telegram
        if (botResponse.toLowerCase().includes("бронь принята")) {
            const parts = botResponse.split("ТЕЛЕГРАМ:");
            if (parts.length > 1) {
                // Отправляем в ТГ только структурированный блок
                await sendToTelegram(parts[1].trim());
                // Гостю показываем только веселую часть ответа до слова ТЕЛЕГРАМ:
                botResponse = parts[0].trim(); 
            } else {
                await sendToTelegram(message);
            }
        }

        // Если в истории уже есть рулетка, прячем техническое сообщение от гостя
        if (botResponse.includes("ВРЕМЯ РУЛЕТКИ")) {
            // Оставляем только техническую фразу для активации фронтенда
            botResponse = "ВРЕМЯ РУЛЕТКИ"; 
        }

        res.json({ text: botResponse });
    } catch (error) {
        console.error('Ошибка Gemini:', error);
        res.status(500).json({ text: 'Упс, бармен отвлекся. Повтори-ка!' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Сервер запущен на порту ${PORT}`));
