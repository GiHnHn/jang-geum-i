import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// ✅ 회원가입 API
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 입력 값이 비어있는지 확인
        if (!username || !email || !password) {
            return res.status(400).json({ error: "모든 필드를 입력해주세요." });
        }

        // 이메일 중복 확인
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "이미 사용 중인 이메일입니다." });
        }

        // 사용자 저장
        const newUser = new User({ username, email, password });
        await newUser.save();

        res.status(201).json({ message: "✅ 회원가입 성공! MongoDB에 저장되었습니다." });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "서버 오류 발생" });
    }
});

export default router;
