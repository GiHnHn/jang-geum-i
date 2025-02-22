import mongoose from 'mongoose';

mongoose.connect('mongodb+srv://codol:zhehf2409@cluster0.ctrzf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB 연결 성공!"))
.catch(err => console.error("❌ MongoDB 연결 실패:", err));

export default mongoose;