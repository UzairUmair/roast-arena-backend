import 'dotenv/config';
import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';

const port = process.env.PORT || 4000;

if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
  console.log('MONGODB_URI and JWT_SECRET are required in .env');
  process.exit(1);
}

if (process.env.MOCK_AI !== 'true' && (!process.env.GROQ_API_KEY || !process.env.GROQ_MODEL)) {
  console.log('Set GROQ_API_KEY and GROQ_MODEL, or set MOCK_AI=true for demo mode.');
  process.exit(1);
}

await connectDB();

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const closeServer = async () => {
  await disconnectDB();
  server.close(() => process.exit(0));
};

process.on('SIGINT', closeServer);
process.on('SIGTERM', closeServer);
