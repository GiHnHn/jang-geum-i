import express from 'express';
import multer from 'multer';
import cors from 'cors';
import OpenAI from "openai";
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import path from 'path';


dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
const allowedOrigins = [
    'https://jang-geum-i-front.web.app', // Firebase에서 배포된 URL
    'https://jang-geum-i-front.firebaseapp.com', // Firebase 기본 URL
    'http://localhost:3000' // 로컬 개발 환경
];

app.use(cors({
    origin: function (origin, callback) {
        if (allowedOrigins.includes(origin) || !origin) {
            // 요청 origin이 허용된 리스트에 있거나, origin이 없는 경우(Postman 등)
            callback(null, true); // 요청 허용
        } else {
            // 허용되지 않은 origin인 경우
            callback(new Error('Not allowed by CORS')); // 요청 차단
        }
    },
    methods: ['GET', 'POST'], // 허용할 HTTP 메서드
    allowedHeaders: ['Content-Type', 'Authorization'], // 허용할 요청 헤더
}));

app.use(express.json());

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
};

initializeApp(firebaseConfig);
const storage = getStorage();



app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        // Firebase Storage에 업로드된 이미지 호출
        const { imageUrl } = req.body;
        if (!imageUrl) {
          return res.status(400).json({ error: "Image URL is required" });
        }

        // OpenAI API 호출
        let openAiResponse;
        try {
            openAiResponse = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system", content: "너는 다양한 요리와 그 요리의 레시피를 알고있는 전문가야. 요리의 이름, 재료 목록, 그리고 조리법을 JSON 형식으로 반환해야 해. 그리고 재료 목록은 g단위로 환산해서 통일해줘."},
                    {
                        role: "user",
                        content: [
                          { type: "text", text: "이 음식의 이름과 들어가는 재료의 양(반드시 g 단위로), 자세한 레시피를 한국어로 알려줘."  },
                          { type: "image_url", image_url: { "url": imageUrl } }, // 이미지 URL 전달
                      ],
                    }
                ],
                response_format: {
                    "type": "json_schema",
                    "json_schema": {
                      "name": "recipe",
                      "strict": true,
                      "schema": {
                        "type": "object",
                        "properties": {
                          "dish_name": {
                            "type": "string",
                            "description": "요리의 이름을 나타냅니다."
                          },
                          "ingredients": {
                            "type": "array",
                            "description": "요리에 필요한 재료 목록입니다.",
                            "items": {
                              "type": "object",
                              "properties": {
                                "name": {
                                  "type": "string",
                                  "description": "재료의 이름입니다."
                                },
                                "quantity": {
                                  "type": "string",
                                  "description": "재료의 양(g 단위)입니다."
                                }
                              },
                              "required": [
                                "name",
                                "quantity"
                              ],
                              "additionalProperties": false
                            }
                          },
                          "instructions": {
                            "type": "array",
                            "description": "조리법 단계별 목록입니다.",
                            "items": {
                              "type": "string",
                              "description": "조리법의 각 단계 (문장 형식)."
                            }
                          }
                        },
                        "required": [
                          "dish_name",
                          "ingredients",
                          "instructions"
                        ],
                        "additionalProperties": false
                      }
                    }
                }
            });
                
            console.log('[INFO] OpenAI API 요청 성공');
        } catch (apiError) {
            console.error('[ERROR] OpenAI API 요청 실패:', apiError.message || apiError.response?.data);
            return res.status(500).json({ error: 'Failed to fetch data from OpenAI API.' });
        }

        // OpenAI로부터 반환된 데이터
        const parsedResponse = openAiResponse.choices[0]?.message?.content;
        let parsedJSON;
        try {
            parsedJSON = JSON.parse(parsedResponse);
        } catch (parsingError) {
            console.error('[ERROR] JSON 파싱 실패:', parsingError.message);
            return res.status(500).json({ error: 'Failed to parse OpenAI response.' });
        }

        const dishName = parsedJSON?.dish_name || '요리의 이름을 찾지 못 했습니다.';
        const ingredients = parsedJSON?.ingredients || [];
        const instructions = parsedJSON?.instructions || '제공되는 레시피가 없습니다.';

        console.log('[INFO] OpenAI 응답 데이터:', parsedJSON);
        console.log('[INFO] 추출된 요리 이름:', dishName);

        // 클라이언트로 결과 전송
        res.json({
            dish: dishName,
            ingredients,
            instructions
        });
    } catch (error) {
        console.error('[ERROR] 서버 오류:', error.message);
        res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
    }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`[INFO] Server is running on http://localhost:${PORT}`);
});