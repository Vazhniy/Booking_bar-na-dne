import axios from 'axios';

const GEMINI_API_KEY = 'AIzaSyDOtvTjvixtBG03Q4dFS3f6IQrGclghC58';

async function checkModels() {
    try {
        console.log("⏳ Спрашиваем у Google список доступных моделей...");
        const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
        
        console.log("✅ Вот что разрешено вашему ключу:");
        // Выводим только названия моделей
        const modelNames = response.data.models.map(m => m.name);
        console.log(modelNames);
    } catch (error) {
        console.error("❌ Ошибка:", error.response?.data || error.message);
    }
}

checkModels();