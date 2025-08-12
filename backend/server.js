const express = require('express');
const axios = require('axios');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware configuration
app.use(cors()); // Allow cross-origin requests from the frontend
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies with a larger limit

// Multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB file size limit
});

// Get API key from environment variables for security
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// API endpoint for translation
app.post('/api/translate', upload.single('image'), async (req, res) => {
    // Check if the API key is configured
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'API key is not configured on the server.' });
    }
    // Check if an image file was provided
    if (!req.file) {
        return res.status(400).json({ error: 'No image file provided.' });
    }

    try {
        const imageBuffer = req.file.buffer;
        const mimeType = req.file.mimetype;
        
        // ** IMPORTANT: The updated prompt to separate text bubbles with a blank line **
        const prompt = "Please act as an Optical Character Recognition (OCR) and manga translator. Your task is to identify and extract all text from the speech bubbles in the image and translate them into Arabic. IMPORTANT: Separate the translation of each distinct speech bubble with a blank line. The response must be a single JSON object with two keys: `original_text` and `translated_text`. For example: { \"original_text\": \"Original text from bubble 1\\nOriginal text from bubble 2\", \"translated_text\": \"النص المترجم من الفقاعة 1\\n\\nالنص المترجم من الفقاعة 2\" }.";
        
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

        const payload = {
            contents: [{
                role: "user",
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: mimeType, data: imageBuffer.toString('base64') } }
                ]
            }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        original_text: { type: "STRING" },
                        translated_text: { type: "STRING" }
                    }
                }
            }
        };

        const apiResponse = await axios.post(geminiApiUrl, payload);
        res.json(apiResponse.data);

    } catch (error) {
        console.error('Error proxying to Gemini API:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to communicate with Gemini API.' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`✅ Backend server is running securely on http://localhost:${port}`);
});