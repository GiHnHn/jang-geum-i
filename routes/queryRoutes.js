import express from 'express';
import QueryHistory from '../models/QueryHistory.js';

const router = express.Router();

// 조회 기록 저장
router.post('/save', async (req, res) => {
    try {
        const newQuery = new QueryHistory(req.body);
        await newQuery.save();
        res.json({ message: "✅ 조회 기록 저장 완료!", data: newQuery });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 특정 사용자의 조회 기록 가져오기
router.get('/:user_id', async (req, res) => {
    const userQueries = await QueryHistory.find({ user_id: req.params.user_id }).populate('recipe_id');
    res.json(userQueries);
});

export default router;
