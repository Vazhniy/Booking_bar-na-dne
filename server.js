import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Забираем ключи
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Характер бармена
const SYSTEM_PROMPT = `
Ты — невероятно харизматичный, веселый и свой в доску бармен руин-бара «На дне» на Зыбицкой. 
Твой стиль: френдли сервис, но не блатной и не пацанский, ты больше интелектуальный шутник, остроумие, легкая ирония и атмосфера бесконечной тусовки. Ты общаешься с гостем как с давними другом или подругой, которые зашели на шот.

ТВОЯ ЗАДАЧА:
Собрать данные для брони за МИНИМАЛЬНОЕ количество сообщений, но сделать это смешно и непринужденно.

ПРАВИЛА ДИАЛОГА:
1. В самом первом сообщении горячо поприветствуй гостя, пошути про атмосферу бара и СРАЗУ попроси прислать одним сообщением: Имя, Время, Кол-во тусовщиков, Повод (пьем с горя или от радости?) и Телефон.
2. Если гость прислал не всё — переспроси недостающее с юмором (например: "Бро, а звонить мне куда, в рельсу? Жду номер!").
3. Если всё прислано — напиши "Бронь принята!" (это ОЧЕНЬ важная фраза, обязательно используй ее точно так), пожелай отличного вечера и заверши диалог.
4. Никакой духоты, скриптов и официоза. Пиши коротко, емко и ярко.
`;

const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash", 
    systemInstruction: SYSTEM_PROMPT
});

async function sendToTelegram(bookingData) {
    const text = `🔔 **НОВАЯ БРОНЬ**\n\n` +
                 `👤 Данные: ${bookingData}\n` +
                 `📍 Место: Шот-бар На Дне`;
    
    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: text,
            parse_mode: 'Markdown'
        });
        console.log('✅ Бронь успешно улетела в Telegram');
    } catch (error) {
        console.error('❌ Ошибка Telegram:', error.response?.data || error.message);
    }
}

// === ТОТ САМЫЙ БУДИЛЬНИК (Лимиты Gemini в безопасности!) ===
app.get('/ping', (req, res) => {
    // Сервер просто отвечает текстушкой и всё. ИИ здесь не работает.
    res.status(200).send('Бармен на месте, стаканы протерты!');
});
// ==========================================================

app.post('/api/chat', async (req, res) => {
    const { message, history } = req.body;

    try {
        let formattedHistory = history.map(msg => ({
            role: msg.role === 'bot' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        }));

        if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
            formattedHistory.shift();
        }

        const chat = model.startChat({
            history: formattedHistory
        });

        const result = await chat.sendMessage(message);
        const botResponse = result.response.text();

        if (botResponse.toLowerCase().includes("бронь принята")) {
            await sendToTelegram(message);
        }

        res.json({ text: botResponse });
    } catch (error) {
        console.error('Ошибка Gemini:', error);
        res.status(500).json({ text: 'Упс, бармен отвлекся на наливку. Повтори-ка!' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Сервер "На дне" запущен на порту ${PORT}`);
});

