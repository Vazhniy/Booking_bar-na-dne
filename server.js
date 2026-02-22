import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json());

// Теперь мы берем ключи из "окружения" сервера
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const systemPrompt = `Ты — бармен "На дне" (Зыбицкая, Минск). 
Твоя цель: собрать бронь за минимальное число сообщений. 
Будь краток, ироничен, упоминай Keri, Shchavlik или Cherribos. 

Сразу запрашивай: 
1. Имя (как величать?)
2. Время (когда ждать?)
3. Сколько вас? (количество выживших)
4. Повод (пьем с горя или от радости?)
5. Телефон (чтобы найти, если потеряетесь)

Если чего-то не хватает — переспроси только это. Если всё есть — пиши "Бронь принята!" и присылай краткий итог.`;

// В функции обработки сообщения добавь:
// { role: "system", content: systemPrompt }

app.post('/api/chat', async (req, res) => {
    try {
        const { message, history } = req.body;
        
        const formattedHistory = [];
        history.forEach((msg, index) => {
            if (index === 0 && msg.role === 'assistant') return; 
            formattedHistory.push({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            });
        });
        
        const secretMessage = `${systemPrompt}\n\nКЛИЕНТ ГОВОРИТ: ${message}`;
        formattedHistory.push({ role: 'user', parts: [{ text: secretMessage }] });

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        const aiRequest = await axios.post(url, { contents: formattedHistory });
        const aiResponse = aiRequest.data.candidates[0].content.parts[0].text;

        if (aiResponse.includes('{"status": "ready"')) {
            const jsonString = aiResponse.match(/\{[\s\S]*\}/)[0];
            const bookingData = JSON.parse(jsonString);
            
            const tgMessage = `🔔 *БРОНЬ НА ЗЫБИЦКОЙ*\n👤 ${bookingData.name}\n📅 ${bookingData.date_time}\n👥 ${bookingData.guests} чел.\n📞 ${bookingData.phone}`;
            
            await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                chat_id: CHAT_ID, text: tgMessage, parse_mode: 'Markdown'
            });

            res.json({ reply: "Твой стол забронирован! 🎉 Теперь крути колесо фортуны ниже, проверим твою удачу!", isFinal: true });
        } else {
            res.json({ reply: aiResponse, isFinal: false });
        }
    } catch (error) {
        // ПРОВЕРКА НА ЛИМИТ ЗАПРОСОВ (Ошибка 429)
        if (error.response && error.response.status === 429) {
            console.log("⚠️ Превышен лимит запросов Google API.");
            return res.status(200).json({ 
                reply: "Тут на Зыбицкой аншлаг! Бармен зашивается с заказами. Подожди буквально полминуты, пока я натру стаканы, и отвечу тебе! 🍻" 
            });
        }

        console.error("ОШИБКА:", error.response?.data || error.message);
        res.status(500).json({ reply: "Что-то Горький хмурится... Попробуй отправить сообщение еще раз!" });
    }
});


app.listen(5000, () => console.log('✅ Сервер "На дне" готов к работе на порту 5000'));

