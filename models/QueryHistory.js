const mongoose = require('mongoose');

const queryHistorySchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recipe_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' },
    query_time: { type: Date, default: Date.now },
    status: { type: String, enum: ['조회', '대기', '완료'], default: '조회' }
});

module.exports = mongoose.model('QueryHistory', queryHistorySchema);
