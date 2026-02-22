import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Забираем ключи из настроек Render (Environment Variables)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// Системная инструкция
const SYSTEM_PROMPT = `
Ты — легендарный бармен минского руин-бара «На дне» на Зыбицкой. 
Твой стиль: ироничный, дерзкий, краткий. Ты ценишь время и не любишь пустую болтовню.

ТВОЯ ЗАДАЧА:
Собрать данные для брони за МИНИМАЛЬНОЕ количество сообщений.

ПРАВИЛА ДИАЛОГА:
1. В самом первом сообщении поприветствуй гостя и СРАЗУ попроси: Имя, Время, Кол-во людей, Повод и Телефон.
2. Если гость прислал не всё — коротко переспроси только недостающее.
3. Если всё прислано — напиши "Бронь принята!" и заверши диалог.
4. Не используй длинные предложения. Пиши в стиле Зыбицкой после полуночи.
`;

// Функция для отправки данных в Telegram группу
async function sendToTelegram(bookingData) {
    const text = `🔔 **НОВАЯ БРОНЬ "НА ДНЕ"**\n\n` +
                 `👤 Гость: ${bookingData}\n` +
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
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                contents: [
                    { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
                    ...history.map(msg => ({
                        role: msg.role === 'bot' ? 'model' : 'user',
                        parts: [{ text: msg.text }]
                    })),
                    { role: "user", parts: [{ text: message }] }
                ]
            }
        );

        const botResponse = response.data.candidates[0].content.parts[0].text;

        // Если в ответе бота есть подтверждение брони, дублируем в Telegram
        if (botResponse.toLowerCase().includes("бронь принята") || botResponse.toLowerCase().includes("записал")) {
            await sendToTelegram(`Данные из чата: ${message}`);
        }

        res.json({ text: botResponse });
    } catch (error) {
        console.error('Ошибка Gemini:', error.response?.data || error.message);
        res.status(500).json({ text: 'Ошибка связи. Проверь, запущен ли сервер.' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Сервер "На дне" запущен на порту ${PORT}`);
});
