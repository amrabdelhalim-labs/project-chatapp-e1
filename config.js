import 'dotenv/config';
import mongoose from 'mongoose';

export const connectDB = async () => {
  // Support multiple environment variables with priority order:
  // 1. DATABASE_URL (Heroku standard)
  // 2. MONGODB_URI (MongoDB Atlas standard)
  // 3. MONGODB_URL (custom)
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.MONGODB_URI ||
    process.env.MONGODB_URL ||
    'mongodb://127.0.0.1:27017/mychat';

  try {
    await mongoose.connect(dbUrl);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
};

// Connect Server at default port 5000.
export const connectServer = (app) => {
  const PORT = process.env.PORT || 5000;

  try {
    app.listen(PORT, () => console.log(`Server running on PORT ${PORT}.`));
  } catch (error) {
    throw new Error('Error in server connection: ' + error);
  }
};
