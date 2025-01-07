import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config(); // 환경 변수 로드

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // 환경 변수에서 API 키 가져오기
});

(async () => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
          {
              role: "user",
              content: [
                  { type: "text", text: "닭볶음탕의 레시피를 알려줘." },
              ],
          },
      ],
  });

    console.log("Response:", response.choices[0].message.content);
  } catch (error) {
    console.error("Error:", error);
  }
})();
