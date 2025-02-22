import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    created_at: { type: Date, default: Date.now }
});

export default mongoose.model('User', userSchema);
