import express from 'express';
import Recipe from '../models/Recipe.js';

const router = express.Router();

// 레시피 추가
router.post('/add', async (req, res) => {
    try {
        const newRecipe = new Recipe(req.body);
        await newRecipe.save();
        res.json({ message: "✅ 레시피 추가 완료!", data: newRecipe });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 레시피 조회
router.get('/', async (req, res) => {
    const recipes = await Recipe.find();
    res.json(recipes);
});

export default router;

