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
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import recipeRoutes from "./routes/recipeRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);



// ▶ 추가: Google Cloud TTS 패키지
import textToSpeech from '@google-cloud/text-to-speech';
import Recipe from './models/Recipe.js';




dotenv.config();
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const router = express.Router();

const app = express();

const characters = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, 'characters.json'), 'utf8')
  );

const CHARACTER_MAP = characters.reduce((map, cfg) => {
  map[cfg.key] = cfg;
  return map;
}, {});


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

const characterStyles = {
  baek: [
    "백종원: “이제 다진 채소를 계란물에 넣고 다시 한번 잘 섞어주세요.”",
    "백종원: “양파는 달궈진 팬에 먼저 볶아주시면 좋아요.”",
    "백종원: (레시피 소개 마지막에)“맛있게 드세요."
  ],
  seung: [
    "안성재: “이 재료, 살짝 불에 구우면 단맛이 나죠. 꼭 이렇게 해보세요.”",
    "안성재: “양념을 넣으실 땐, 중간 불에서 서서히 볶아야 타지 않아요.”",
    "안성재: “말씀하신 재료는 대체할 수 있지만, 그럴 경우 풍미가 바뀝니다. 본래 의도를 고려하신다면 그대로 쓰는 걸 권합니다.”"
    
  ],
  jang: [
    "장금이(사극체): “간은 오로지 혀가 아니라 마음으로 맞추는 것이지요.”",
    "장금이(사극체): “이 국물은 오래 끓일수록 진국이 되옵니다. 허나, 불의 세기를 살펴가며 은근히 우려내야 하옵지요.”",
    "장금이(사극체): “소인이 아는 바로는, 소고기 장조림에는 홍고추를 함께 넣으면 맛이 깔끔해진다 하옵니다.”"
  ]
};





// ------------------------------------------
// 기존 /upload 라우트 (OpenAI API 호출 부분)
// ------------------------------------------
app.post('/upload', async (req, res) => {
    const { character, query, imageUrl } = req.body;
    const token = req.cookies.token;
    const cfg = CHARACTER_MAP[character];
    console.log("characters 배열:", characters);
    if (!cfg) {
        return res.status(400).json({ error: `알 수 없는 캐릭터: ${character}` });
      }

      

    let userId = null;  // 기본값: 로그인 안 한 상태

    console.log("🟢 [DEBUG] 요청 헤더:", req.headers); // 요청 헤더 로그 출력
    console.log("🟢 [DEBUG] 쿠키 정보:", req.cookies); // 쿠키 로그 출력

    let systemContent = `
    너는 다양한 한식 요리의 레시피를 알고 있는 전문가 ${character === "baek" ? "백종원" : character === "seung" ? "안성재" : "장금이"}야.
    요리의 이름, 재료 목록, 그리고 조리법을 JSON 형식으로 반환해야 해.
    조리법은 ${character === "baek" ? "백종원 말투" : character === "seung" ? "안성재 말투" : "장금이 사극체 말투"}로 작성해줘.

    --- 말투 예시 ---
    ${characterStyles[character].join("\n")}
    `;
    
    
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

        //OpenAI API 호출
        if (query) {
            try {
                openAiResponse = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [
                        { role: "system", content: systemContent.trim() },
                        {
                            role: "user",
                            content: [
                                { type: "text", text: query },
                                { type: "text", text: "이 음식의 이름과 들어가는 재료의 양, 자세한 레시피를 한국어로 출력해줘." },
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
                        { role: "system", content: systemContent.trim() },
                        {
                            role: "user",
                            content: [
                                { type: "text", text: "이 음식의 이름과 들어가는 재료의 양, 자세한 레시피를 한국어로 출력해줘." },
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
        const jsonContent = openAiResponse.choices[0].message.content;
        let parsed;
        try {
            parsed = JSON.parse(jsonContent);
        } catch (e) {
            console.error('JSON 파싱 오류', e);
            return res.status(500).json({ error: 'OpenAI가 반환한 JSON을 파싱할 수 없습니다.' });
        }

        const dishName = parsed?.dish_name || '요리의 이름을 찾지 못 했습니다.';
        let ingredients = parsed?.ingredients || [];
        const instructions = parsed?.instructions || '제공되는 레시피가 없습니다.';

        console.log('[INFO] OpenAI 응답 데이터:', parsed);
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
    baek:  "https://beth-stripes-forgot-phone.trycloudflare.com/tts",
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
                    content: `사용자가 요리하는 동안 도와주는 역할을 해. 
                    현재 요리는 "${recipe.dish}"야. 
                    재료 목록: ${recipe.ingredients.map(i => `${i.name} ${i.quantity}`).join(", ")}
                    조리법: ${recipe.instructions.join(" / ")} 
                    
                    사용자의 질문이나 명령을 분석해서 필요한 정보를 제공하거나 적절한 액션을 정해줘.
                    필요한 정보를 제공할 때는 백종원의 말투와 존댓말로 부탁해. 또한, 반드시 아래 형식으로 JSON을 반환해:

                    {
                    "action": "next_step" | "prev_step" | "repeat_step" | "set_timer" | "cancel_timer" | "navigate_home" | "response",
                    "answer": "사용자에게 보여줄 답변 텍스트",
                    "time": (선택사항: 초 단위 숫자)
                    }`,
                },
                { role: "user", content: question }
            ],
        });

        const raw = aiResponse.choices[0]?.message?.content || "{}";
        let actionData;

        try {
            actionData = JSON.parse(raw);
            if (!actionData.action) throw new Error("Missing action");
        } catch {
            actionData = { action: "response", answer: raw }; // fallback
        }

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


app.post("/api/test-command", async (req, res) => {
    const { sessionId, character, command } = req.body;
  
    try {
      const webhookUrl = "https://n8n-service-4xc5.onrender.com/webhook/fortest";
  
      const response = await axios.post(webhookUrl, {
        ID: sessionId,
        role : character,
        input: command,
      });
  
      res.status(200).send(response.data); // 응답 텍스트 그대로 반환
    } catch (error) {
      console.error("Webhook 호출 실패:", error.message);
      res.status(500).send("Webhook 호출 실패");
    }
  });



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`[INFO] Server is running on http://localhost:${PORT}`);
});