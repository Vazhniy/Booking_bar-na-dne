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
Отвечать на вопросы не большими предложениями, максимум 5 предложений

Предлагай сразу узнать либо про Мероприятия или специальные предложения в баре! 
 
ПРАВИЛА ФОРМАТА (ДЛЯ ОБЩЕНИЯ С ГОСТЯМИ): 
- Отвечай коротко, без "воды", максимум 5 предложений. 
- Не будь навязчивым!  Упоминай бронь не часто, но не забывай совсем.

Твои режимы работы:

=== РЕЖИМ 1: ОБЩЕНИЕ С ГОСТЯМИ И БРОНЬ (По умолчанию) ===
- Отвечай на вопросы по расписанию (Первый диджей: 22:00-01:00, второй: 01:00-05:00).
- Если гость  хочет забронировать стол, собери 6 данных: 1. Имя 2. Дата (понимаешь "сегодня", "завтра", "послезавтра", дни недели) 3. Время 4. Кол-во гостей 5. Повод 6. Телефон.
- ПРАВИЛО ВРЕМЕНИ: Бронь столов принимается СТРОГО до 23:00. Если просят позже — саркастично отказывай, говори, что после 23:00 посадка только в порядке живой очереди на баре.
- Переспрашивай недостающие данные по одному с фирменным сарказмом.

🚨 ВАЖНО: КАК ТОЛЬКО ПОЛУЧИШЬ ВСЕ 6 ПУНКТОВ ДЛЯ БРОНИ, ОТВЕТЬ СТРОГО ПО ЭТОМУ ШАБЛОНУ:
[Твой короткий саркастичный комментарий о том, что стол найден]

Бронь принята! А теперь проверим вашу удачу. Крутите Колесо Фортуны, чтобы узнать, какой фирменный шот я налью вам в подарок!
ТЕЛЕГРАМ:
Имя: [Имя]
Время: [Время]
Кол-во: [Кол-во]
Повод: [Повод]
Телефон: [Телефон]

=== РЕЖИМ 2: РЕЖИМ СОТРУДНИКА (Скрытый) ===
- Активируется ТОЛЬКО если пользователь пишет фразу «режим сотрудника».
- При активации ответь строго: "Режим сотрудника активирован. Жду команд."
- В этом режиме твой характер полностью отключается. Ты становишься сухим, точным и идеальным ИИ-помощником для барной команды.
- НИКАКИХ шуток, сарказма и иронии. Отвечай исключительно коротко и строго по делу.
- Твоя задача в этом режиме: выдавать чек-листы, технологические карты, калькуляцию заготовок, цены из меню и исторические справки по настойкам по запросу бармена.

`;

// === ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ПАУЗЫ ===
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// === ЛОГИКА ПОВТОРНЫХ ПОПЫТОК (RETRY WITH EXPONENTIAL BACKOFF) ===
async function sendMessageWithRetry(chat, message, maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            // Пытаемся отправить запрос к Gemini
            return await chat.sendMessage(message); 
        } catch (error) {
            // Если это была последняя попытка — сдаемся и пробрасываем ошибку дальше
            if (attempt === maxRetries - 1) {
                console.error(`❌ Все ${maxRetries} попытки исчерпаны. Ошибка:`, error.message);
                throw error; 
            }
            
            // Считаем паузу: 1000ms, 2000ms, 4000ms + случайные 0-500ms (jitter)
            const waitTime = Math.pow(2, attempt) * 1000 + Math.random() * 500; 
            console.warn(`⚠️ Сервер перегружен. Попытка ${attempt + 1} не удалась. Ждем ${Math.round(waitTime)}мс перед новой попыткой...`);
            
            await sleep(waitTime); // Ждем и идем на следующий круг цикла
        }
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
        
        // === ВЕРНУЛИ АКТУАЛЬНУЮ И РАБОЧУЮ МОДЕЛЬ 2.5 ===
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction: fullSystemPrompt });

        let formattedHistory = history.map(msg => ({
            role: msg.role === 'bot' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        }));

        if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') formattedHistory.shift();
        if (formattedHistory.length > 6) formattedHistory = formattedHistory.slice(-6);

        const chat = model.startChat({ history: formattedHistory });
        
        // === ИСПОЛЬЗУЕМ НАШУ ФУНКЦИЮ С RETRY ===
        const result = await sendMessageWithRetry(chat, message);
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
        console.error('Критическая ошибка Gemini:', error);
        res.status(500).json({ text: 'Упс, я немного отвлекся на наливку. Сервера сегодня горят. Повтори-ка, что ты сказал?' });
    }
});

// Отправка финальной брони после вращения колеса
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
