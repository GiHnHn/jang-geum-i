import mongoose from 'mongoose';

const recipeSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // 🔥 사용자 ID 저장
    query: { type: String, required: true }, // 검색한 레시피 키워드
    imageUrl: { type: String },
    recipe: {
        dish: String,
        ingredients: [{ name: String, quantity: String }],
        instructions: [String],
    },
    createdAt: { type: Date, default: Date.now }, // 🔥 검색한 시각 저장 (자동)
});

export default mongoose.model("Recipe", recipeSchema);