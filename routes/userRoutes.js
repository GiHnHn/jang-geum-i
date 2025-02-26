import express from 'express';
import User from '../models/User.js';
import bcryptjs from 'bcryptjs';

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

// ✅ 로그인 API
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "이메일과 비밀번호를 입력해주세요." });
        }

        // 이메일 확인
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: "존재하지 않는 이메일입니다." });
        }

        // 비밀번호 검증
        const isMatch = await bcryptjs.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "비밀번호가 올바르지 않습니다." });
        }

        res.status(200).json({ message: "✅ 로그인 성공!", username: user.username });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "서버 오류 발생" });
    }
});


export default router;
