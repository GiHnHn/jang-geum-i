import express from 'express';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// JWT Secret Key
const JWT_SECRET = process.env.JWT_SECRET;

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

// ✅ 로그인 API (JWT 발급)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 이메일 확인
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
        }

        // 비밀번호 확인
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
        }

        // JWT 생성
        const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, {
            expiresIn: "2h" // 2시간 동안 유효한 토큰
        });

        // 쿠키에 JWT 저장 (httpOnly 쿠키)
        res.cookie("token", token, {
            httpOnly: true, 
            secure: process.env.NODE_ENV === "production", 
            sameSite: "Strict",
        });

        res.json({ message: "✅ 로그인 성공!", username: user.username });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "서버 오류 발생" });
    }
});

// ✅ 로그인한 사용자 정보 확인 API
router.get('/me', (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: "로그인이 필요합니다." });
        }

        // 토큰 검증
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ username: decoded.username });
    } catch (error) {
        return res.status(401).json({ error: "유효하지 않은 토큰입니다." });
    }
});

// ✅ 로그아웃 API (쿠키 삭제)
router.post('/logout', (req, res) => {
    res.clearCookie("token");
    res.json({ message: "✅ 로그아웃 되었습니다." });
});

export default router;