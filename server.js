import express from 'express';
import multer from 'multer';
import cors from 'cors';
import OpenAI from "openai";
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import path from 'path';
import speech from "@google-cloud/speech";
import fs from "fs";
import axios from 'axios';

// ▶ 추가: Google Cloud TTS 패키지
import textToSpeech from '@google-cloud/text-to-speech';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
const allowedOrigins = [
    'https://jang-geum-i-front.web.app',
    'https://jang-geum-i-front.firebaseapp.com',
    'http://localhost:3000'
];

app.use(cors({
    origin: function (origin, callback) {
        if (allowedOrigins.includes(origin) || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
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

// 퍼센트 조정 비율 설정
const PERCENTAGE_CHANGE = {
    "소금": 10,     
    "설탕": 20,     
    "고춧가루": 15  
};

// 사용자별 맛 평가 데이터 저장
const userTasteData = {};

// 사용자 맛 평가 저장 API
app.post('/taste-evaluation', async (req, res) => {
    const { user_id, sweet, spicy, salty } = req.body;

    if (!user_id || sweet == null || spicy == null || salty == null) {
        return res.status(400).json({ error: "사용자 ID와 모든 맛 점수를 입력해주세요." });
    }

    if (!userTasteData[user_id]) {
        userTasteData[user_id] = { sweet: [], spicy: [], salty: [] };
    }

    userTasteData[user_id].sweet.push(sweet);
    userTasteData[user_id].spicy.push(spicy);
    userTasteData[user_id].salty.push(salty);

    console.log(`[INFO] 사용자 ${user_id}의 평가 추가됨:`, userTasteData[user_id]);

    res.json({ message: "입맛 평가가 저장되었습니다.", data: userTasteData[user_id] });
});

// 평균 점수 계산 함수
const calculateAverageTaste = (user_id) => {
    if (!userTasteData[user_id]) return { sweet: 3, spicy: 3, salty: 3 };

    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

    return {
        sweet: avg(userTasteData[user_id].sweet).toFixed(1),
        spicy: avg(userTasteData[user_id].spicy).toFixed(1),
        salty: avg(userTasteData[user_id].salty).toFixed(1)
    };
};

// 기존 ingredients 배열을 기반으로 조미료 양 조절
const adjust_ingredients_percentage = (ingredients, salty_score, sweet_score, spicy_score) => {
    return ingredients.map(item => {
        let name = item.name;
        let quantity = parseFloat(item.quantity.replace("g", "")) || 0;

        if (PERCENTAGE_CHANGE[name]) {
            let changePercentage = PERCENTAGE_CHANGE[name];
            let scoreDifference = (name === "소금" ? (salty_score - 3) :
                                   name === "설탕" ? (sweet_score - 3) :
                                   (spicy_score - 3));

            let adjustedQuantity = quantity * (1 + scoreDifference * changePercentage / 100);
            return { name, quantity: `${adjustedQuantity.toFixed(1)}g` };
        }

        return item;
    });
};

// ------------------------------------------
// 기존 /upload 라우트 (OpenAI API 호출 부분)
// ------------------------------------------
app.post('/upload', async (req, res) => {
    const { query, imageUrl } = req.body;

    try {
        let openAiResponse;
        // OpenAI API 호출
        if (query) {
            try {
                openAiResponse = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [
                        {
                            role: "system",
                            content: "너는 세계 각 국의 다양한 요리와 그 요리의 레시피를 알고있는 전문가야. 요리의 이름, 재료 목록, 그리고 조리법을 JSON 형식으로 반환해야 해. 그리고 재료 목록은 g단위로 환산해서 통일해줘."
                        },
                        {
                            role: "user",
                            content: [
                                { type: "text", text: query },
                                { type: "text", text: "이 음식의 이름과 들어가는 재료의 양(반드시 g 단위로), 자세한 레시피를 한국어로 출력해줘." },
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
        } else if (imageUrl) {
            try {
                openAiResponse = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [
                        {
                            role: "system",
                            content: "너는 세계 각 국의 다양한 요리와 그 요리의 레시피를 알고있는 전문가야. 요리의 이름, 재료 목록, 그리고 조리법을 JSON 형식으로 반환해야 해. 그리고 재료 목록은 g단위로 환산해서 통일해줘."
                        },
                        {
                            role: "user",
                            content: [
                                { type: "text", text: "이 음식의 이름과 들어가는 재료의 양(반드시 g 단위로), 자세한 레시피를 한국어로 출력해줘." },
                                { type: "image_url", image_url: { "url": imageUrl } },
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
        console.log(`[INFO] 사용자 ${user_id} 평균 점수 적용 - 단맛: ${sweet}, 매운맛: ${spicy}, 짠맛: ${salty}`);

        ingredients = adjust_ingredients_percentage(ingredients, parseFloat(salty), parseFloat(sweet), parseFloat(spicy));


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

// ------------------------------------------
// 네이버 쇼핑 검색 API 엔드포인트 추가
// ------------------------------------------
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const searchRecordDir = path.join(process.cwd(), 'searchrecord');

if (!fs.existsSync(searchRecordDir)) {
    fs.mkdirSync(searchRecordDir, { recursive: true });
    console.log(`[INFO] searchrecord 디렉토리를 생성했습니다.`);
}

app.get('/api/search', async (req, res) => {
    try {
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({ error: '검색어를 입력해주세요.' });
        }

        console.log(`[INFO] "${query}" 검색 중...`);

        const apiUrl = `https://openapi.naver.com/v1/search/shop?query=${encodeURIComponent(query)}`;

        const response = await axios.get(apiUrl, {
            headers: {
                'X-Naver-Client-Id': CLIENT_ID,
                'X-Naver-Client-Secret': CLIENT_SECRET,
            },
        });

        if (response.status !== 200) {
            return res.status(response.status).json({ error: '네이버 API 요청 실패' });
        }

        // ✅ 네이버 검색 결과에서 smartstore.naver.com만 필터링하고, 필요한 정보만 반환
        const filteredItems = response.data.items
            .filter(item => item.link.includes('smartstore.naver.com'))
            .slice(0, 5)
            .map(item => ({
                title: item.title,          // 상품명
                link: item.link,            // 상품 구매 링크
                image: item.image,          // 상품 이미지 URL
                price: item.lprice          // 상품 가격
            }));

        if (filteredItems.length === 0) {
            return res.status(404).json({ message: 'smartstore.naver.com 관련 제품이 없습니다.' });
        }

        console.log(`[INFO] ${filteredItems.length}개의 smartstore.naver.com 상품 검색 완료`);

        return res.json({ items: filteredItems });

    } catch (error) {
        console.error('[ERROR] 네이버 API 검색 중 오류 발생:', error.message);
        return res.status(500).json({ error: '서버 내부 오류' });
    }
});


// -------------------------------------------------------
//  ▼▼▼ 새로운 라우트: Google Cloud TTS 기능 추가 예시 ▼▼▼
// -------------------------------------------------------
const initializeCredentials = () => {
    const base64ttskey = process.env.GOOGLE_TTS_KEY_B64;

    if (!base64ttskey) {
        throw new Error("GCP_CREDENTIALS_B64 환경 변수가 설정되지 않았습니다.");
    }

    const ttsPath = "/tmp/tts-key.json";

    if (!fs.existsSync(ttsPath)) {
        fs.writeFileSync(
            ttsPath,
            Buffer.from(base64ttskey, "base64").toString("utf8")
        );
        console.log("[INFO] Google Cloud Credentials 파일 생성됨:", ttsPath);
    }
  return ttsPath;
};


const ttsPath = initializeCredentials();
const ttsClient = new textToSpeech.TextToSpeechClient({
    keyFilename: ttsPath,
  });

app.post('/tts', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "No text provided for TTS." });
    }

    // Google Cloud TTS 요청
    const request = {
      input: { text },
      voice: { languageCode: "ko-KR", ssmlGender: "FEMALE" },
      audioConfig: { audioEncoding: "MP3" },
    };

    const [response] = await ttsClient.synthesizeSpeech(request);

    if (!response.audioContent) {
      return res.status(500).json({ error: "Failed to synthesize speech." });
    }

    // 음성 바이너리를 base64로 변환
    const audioBase64 = response.audioContent.toString("base64");
    res.json({ audioBase64 });
  } catch (err) {
    console.error("[ERROR] Google Cloud TTS 실패:", err.message);
    res.status(500).json({ error: "Google Cloud TTS error." });
  }
});
// -------------------------------------------------------


// ------------------------------------
// 🔥 새로운 AI 어시스턴트 엔드포인트 추가
// ------------------------------------
app.post('/assistant', async (req, res) => {
    const { question, recipe } = req.body;

    if (!question || !recipe) {
        return res.status(400).json({ error: "질문과 레시피 정보를 제공해야 합니다." });
    }

    try {
        const aiResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `너는 요리 전문가 AI야. 사용자가 요리하는 동안 도와주는 역할을 해. 
                    현재 요리는 "${recipe.dish}"야. 
                    재료 목록: ${recipe.ingredients.map(i => `${i.name} ${i.quantity}`).join(", ")}
                    조리법: ${recipe.instructions.join(" / ")} 
                    사용자의 질문에 친절하고 명확하게 답변해줘.`,
                },
                { role: "user", content: question }
            ],
        });

        const answer = aiResponse.choices[0]?.message?.content || "죄송해요, 정확한 답변을 찾을 수 없어요.";

        res.json({ answer });

    } catch (error) {
        console.error("[ERROR] OpenAI 어시스턴트 실패:", error.message);
        res.status(500).json({ error: "AI 어시스턴트 응답 실패." });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`[INFO] Server is running on http://localhost:${PORT}`);
});
