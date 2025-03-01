import express from 'express';
import jwt from "jsonwebtoken";
import Recipe from '../models/Recipe.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// ✅ 사용자의 검색 기록을 최신순으로 조회
router.get("/search-history", async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: "로그인이 필요합니다." });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id;

        const history = await Recipe.find({ userId }).sort({ createdAt: -1 });

        res.json({ history });
    } catch (error) {
        console.error("[ERROR] 검색 기록 조회 실패:", error);
        res.status(500).json({ error: "서버 오류 발생" });
    }
});

export default router;

