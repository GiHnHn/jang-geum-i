import express from 'express';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs'

const router = express.Router();

export default function (JWT_SECRET) {  // ✅ server.js에서 전달받음
    if (!JWT_SECRET) {
        throw new Error("🚨 JWT_SECRET이 전달되지 않았습니다!");
    }

    // ✅ 회원가입 API
    router.post('/register', async (req, res) => {
        try {
            const { username, email, password } = req.body;

            if (!username || !email || !password) {
                return res.status(400).json({ error: "모든 필드를 입력해주세요." });
            }

            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ error: "이미 사용 중인 이메일입니다." });
            }

            const newUser = new User({ username, email, password });
            await newUser.save();

            res.status(201).json({ message: "✅ 회원가입 성공!" });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "서버 오류 발생" });
        }
    });

    // ✅ 로그인 API (JWT 발급)
    router.post('/login', async (req, res) => {
        try {
            const { email, password } = req.body;

            const user = await User.findOne({ email });
            if (!user) {
                return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
            }

            const isMatch = await bcryptjs.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
            }

            // ✅ JWT 생성 (server.js에서 전달받은 JWT_SECRET 사용)
            const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, {
                expiresIn: "2h"
            });

            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "None",
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

            // ✅ JWT 검증 (server.js에서 전달받은 JWT_SECRET 사용)
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

    return router;
}