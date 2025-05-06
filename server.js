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
import jwt from "jsonwebtoken";  // ✅ 추가해야 함!
import userRoutes from './routes/userRoutes.js';
import './db.js';  // ✅ MongoDB 연결을 위해 db.js 불러오기
import cookieParser from 'cookie-parser';
import recipeRoutes from "./routes/recipeRoutes.js";

// ▶ 추가: Google Cloud TTS 패키지
import textToSpeech from '@google-cloud/text-to-speech';
import Recipe from './models/Recipe.js';

dotenv.config();
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
const router = express.Router();

const app = express();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error("🚨 JWT_SECRET이 설정되지 않았습니다. .env 파일을 확인하세요.");
    process.exit(1); // 서버 강제 종료 (필수 환경변수 미설정 시)
}



const allowedOrigins = [
    'https://jang-geum-i-front.web.app',
    'https://jang-geum-i-front.firebaseapp.com',
    'http://localhost:3000'
];

app.use(cors({
    origin: function (origin, callback) {
        const userAgent = (this && this.req && this.req.headers) ? this.req.headers['user-agent'] : "";
        
        // UptimeRobot 요청 허용
        if (userAgent.includes("UptimeRobot") || allowedOrigins.includes(origin) || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST','OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']    
}));
import session from "express-session";

app.use(session({
  secret: process.env.SESSION_SECRET || "your-secret-key",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }  // HTTPS 쓰면 true
}));

app.use(express.json());
app.use(cookieParser()); // 쿠키 파싱 미들웨어 추가


app.get('/health', (req, res) => {
    res.status(200).json({ message: 'Server is running' });
});



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




// ------------------------------------------
// 기존 /upload 라우트 (OpenAI API 호출 부분)
// ------------------------------------------
app.post('/upload', async (req, res) => {
    const { query, imageUrl } = req.body;
    const token = req.cookies.token;
    let userId = null;  // 기본값: 로그인 안 한 상태

    console.log("🟢 [DEBUG] 요청 헤더:", req.headers); // 요청 헤더 로그 출력
    console.log("🟢 [DEBUG] 쿠키 정보:", req.cookies); // 쿠키 로그 출력

    try {

        // JWT 토큰이 있으면 사용자 ID 추출 (로그인된 사용자만)
        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                userId = decoded.id;
                console.log("[INFO] 로그인된 사용자:", userId);
            } catch (error) {
                console.warn("유효하지 않은 토큰:", error.message);
            }
        } else {
            console.warn("[WARNING] 토큰이 없음 (로그인되지 않은 사용자)");
        }

        let openAiResponse;

        // OpenAI API 호출
        if (query) {
            try {
                openAiResponse = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [
                        {
                            role: "system",
                            content: "너는 다양한 한식 요리의 레시피를 알고있는 전문가 백종원이야. 요리의 이름, 재료 목록, 그리고 조리법을 JSON 형식으로 반환해야 해. 그리고 재료 목록은 g단위로 환산해서 통일해줘. 조리법은 백종원 말투로 반환해줘"
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
                            content: "너는 다양한 한식 요리의 레시피를 알고있는 전문가 백종원이야. 요리의 이름, 재료 목록, 그리고 조리법을 JSON 형식으로 반환해야 해. 그리고 재료 목록은 g단위로 환산해서 통일해줘. 조리법은 백종원 말투로 반환해줘"
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
        let ingredients = parsedJSON?.ingredients || [];
        const instructions = parsedJSON?.instructions || '제공되는 레시피가 없습니다.';

        console.log('[INFO] OpenAI 응답 데이터:', parsedJSON);
        console.log('[INFO] 추출된 요리 이름:', dishName);

        // 로그인한 사용자만 검색 기록 저장
        if (userId) {
            const newSearch = new Recipe({
                userId,
                query,
                recipe: {
                    dish: dishName,
                    ingredients,
                    instructions,
                },
                timestamp: new Date(), // 검색한 시각 저장
            });

            await newSearch.save();
            console.log("검색 기록 저장 완료!");
        } else {
            console.log("🔹 로그인하지 않은 사용자 검색 수행 (검색 기록 저장 안 함)");
        }

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

// 회원가입 API 라우트 추가
app.use('/api/users', userRoutes(JWT_SECRET));

 // 레시피 관련 API 추가
app.use("/api/recipes", recipeRoutes);

app.get("/api/users/me", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ error: "인증되지 않은 사용자" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select("username");

        if (!user) return res.status(404).json({ error: "사용자 정보를 찾을 수 없음" });

        res.json({ username: user.username });
    } catch (error) {
        res.status(401).json({ error: "토큰이 유효하지 않음" });
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
        let { query } = req.query;

        if (!query) {
            return res.status(400).json({ error: '검색할 재료가 없습니다.' });
        }

        console.log(`[INFO] "${query}" 검색 중...`);

        // ✅ 검색어를 여러 개 처리할 수 있도록 "|" 구분자를 사용
        const searchQueries = query.split("|").map(q => encodeURIComponent(q.trim()));
        const searchResults = [];

        for (let searchQuery of searchQueries) {
            const apiUrl = `https://openapi.naver.com/v1/search/shop?query=${searchQuery}`;

            const response = await axios.get(apiUrl, {
                headers: {
                    'X-Naver-Client-Id': CLIENT_ID,
                    'X-Naver-Client-Secret': CLIENT_SECRET,
                },
            });

            console.log(`[DEBUG] 네이버 API 응답 (${searchQuery}):`, response.status);

            if (response.status !== 200) continue;

            const filteredItems = response.data.items
                .filter(item => item.link.includes('smartstore.naver.com'))
                .slice(0, 5)
                .map(item => ({
                    title: item.title,
                    link: item.link,
                    image: item.image,
                    price: item.lprice
                }));

            searchResults.push(...filteredItems);
        }

        if (searchResults.length === 0) {
            return res.json({ items: [] });
        }

        console.log(`[INFO] ${searchResults.length}개의 상품 검색 완료`);
        return res.json({ items: searchResults });

    } catch (error) {
        console.error('[ERROR] 네이버 API 검색 중 오류 발생:', error.message);
        return res.status(500).json({ error: '서버 내부 오류' });
    }
});


const TTS_SERVER_MAP = {
    baek:  " https://auto-surface-turkey-wild.trycloudflare.com/tts",
    seung: "https://seung-tts.example.com/tts",
    jang:  "https://jang-tts.example.com/tts",
  };

// -------------------------------------------------------
//  ▼▼▼ 새로운 라우트: TTS 기능 추가
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
      const { character, text, format = "mp3" } = req.body;
      console.log("▶▶ /tts called with:", { character, text, format });
      console.log("▶▶ mapped ttsUrl:", TTS_SERVER_MAP[character]);

      if (!text || !text.trim()) {
        return res.status(400).json({ error: "No text provided for TTS." });
      }
  
      // 1) 캐릭터별 외부 TTS 서버 URL
      const ttsUrl = TTS_SERVER_MAP[character];
  
      let audioBase64;
      

      if (ttsUrl) {
        const params = {
            ref_audio_path:  "prompt_audio.wav",
            prompt_text:  "천천히 괜히 잘못해서 실패했는데 안에는 안 익었더라 막 이러면 여러분이 잘못한 거예요, 진짜로. 난 분명히 보여줬어요, 제대로.",
            prompt_lang:  "ko",
            text,
            text_lang:  "auto",
            media_type: format === "wav" ? "wav" : "mp3",
          };

        const ttsResp = await axios.get(ttsUrl, {
            params,
            responseType: 'arraybuffer',
        });
        audioBase64 = Buffer.from(ttsResp.data, 'binary').toString('base64');

  
      } else {
        // 4) 디폴트: Google Cloud TTS
        const audioEncoding = format.toLowerCase() === "wav"
          ? "LINEAR16"
          : "MP3";
  
        const request = {
          input: { text },
          voice: { languageCode: "ko-KR", ssmlGender: "FEMALE" },
          audioConfig: { audioEncoding },
        };
        const [gResponse] = await ttsClient.synthesizeSpeech(request);
        if (!gResponse.audioContent) {
          throw new Error("Google TTS failed");
        }
        audioBase64 = gResponse.audioContent.toString("base64");
      }
      // 5) 최종 반환
      return res.json({ audioBase64 });
  
    } catch (err) {
      console.error("[ERROR] /tts:", err);
      return res.status(500).json({ error: "TTS error." });
    }
  });
// -------------------------------------------------------


// ------------------------------------
//  새로운 AI 어시스턴트 엔드포인트 추가
// ------------------------------------
app.post('/assistant', async (req, res) => {
    const { question, recipe, character } = req.body;

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
                    
                    사용자의 질문이나 명령을 분석해서 필요한 정보를 제공하거나 적절한 액션을 정해줘.
                    필요한 정보를 제공할 때는 존댓말로 부탁해.

                    **가능한 액션 목록:**
                    - next_step: 다음 조리 단계로 이동
                    - prev_step: 이전 조리 단계로 이동
                    - repeat_step: 현재 단계를 다시 안내
                    - set_timer: 타이머 설정 (예: "5분 타이머 맞춰줘" 또는 "30초 타이머 맞춰줘")
                    - cancel_timer: 타이머 취소
                    - navigate_home: 홈 화면으로 이동
                    - response: 질문에 대한 응답 제공`,
                },
                { role: "user", content: question }
            ],
        });

        const gptReply = aiResponse.choices[0]?.message?.content || "죄송해요, 정확한 답변을 찾을 수 없어요.";
        let actionData = { action: "response", answer: gptReply };

        if (gptReply.includes("다음 단계")) {
            actionData = { action: "next_step" };
        } else if (gptReply.includes("이전 단계")) {
            actionData = { action: "prev_step" };
        } else if (gptReply.includes("다시 설명")) {
            actionData = { action: "repeat_step" };
        } else if (gptReply.includes("타이머")) {
            const timeMatch = gptReply.match(/(\d+)(초|분)/);
            if (timeMatch) {
                const timeValue = parseInt(timeMatch[1], 10);
                const timeInSeconds = timeMatch[2] === "분" ? timeValue * 60 : timeValue;
                actionData = { action: "set_timer", time: timeInSeconds };
            }
        } else if (gptReply.includes("타이머 취소")) {
            actionData = { action: "cancel_timer" };
        } else if (gptReply.includes("홈 화면")) {
            actionData = { action: "navigate_home" };
        }

        //  쿠키 설정 (이 쿠키는 AI 어시스턴트 활성화 상태를 저장하는 예제)
        res.cookie("assistant_active", "true", {
            httpOnly: true,  // JS에서 접근 불가 (보안 강화)
            secure: true,  // HTTPS에서만 전송 가능 (로컬 개발 시 false)
            sameSite: "None",  // CORS 요청에서도 쿠키 전달 가능
        });

        res.json(actionData);
    } catch (error) {
        console.error("[ERROR] OpenAI 어시스턴트 실패:", error.message);
        res.status(500).json({ error: "AI 어시스턴트 응답 실패." });
    }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`[INFO] Server is running on http://localhost:${PORT}`);
});