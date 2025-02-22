import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// 사용자 추가
router.post('/register', async (req, res) => {
    try {
        const newUser = new User(req.body);
        await newUser.save();
        res.json({ message: "✅ 사용자 등록 완료!", data: newUser });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
