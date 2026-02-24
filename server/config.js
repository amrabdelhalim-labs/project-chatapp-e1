import 'dotenv/config';
import mongoose from 'mongoose';

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('MongoDB connected');
    } catch (error) {
        console.error('MongoDB connection error:', error);
    };
};

// Connect Server at default port 5000.
export const connectServer = (app) => {
  const PORT = process.env.PORT || 5000;

  try {
    app.listen(PORT, () => console.log(`Server running on PORT ${PORT}.`));
  } catch (error) {
    throw new Error('Error in server connection: ' + error);
  };
};