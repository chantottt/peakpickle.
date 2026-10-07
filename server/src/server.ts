import dotenv from 'dotenv';
dotenv.config();
const { connectDatabase } = await import('./config/database.js');
const { app } = await import('./app.js');
try {
  const { authSecret } = await import('./services/authService.js');
  authSecret();
  if (
    process.env.CLIENT_ORIGIN &&
    process.env.CLIENT_ORIGIN.split(',').some(
      (value) => !['http://localhost:5173', 'http://127.0.0.1:5173'].includes(value.trim()),
    )
  )
    throw new Error('CLIENT_ORIGIN supports only localhost:5173 and 127.0.0.1:5173.');
  if (process.env.PORT && process.env.PORT !== '5000')
    throw new Error('PORT must be 5000 for local PeakPickle.');
  try {
    new Intl.DateTimeFormat('en', { timeZone: process.env.BUSINESS_TIMEZONE || 'Asia/Manila' });
  } catch {
    throw new Error('BUSINESS_TIMEZONE must be a valid IANA timezone.');
  }
  await connectDatabase();
  const server = app.listen(Number(process.env.PORT) || 5000, () =>
    console.log(`PeakPickle API running on port ${process.env.PORT || 5000}`),
  );
  server.on('error', () => {
    console.error('Cannot start API on port 5000. Stop the other API/demo process and retry.');
    process.exit(1);
  });
  const shutdown = async () => {
    server.close();
    const { default: mongoose } = await import('mongoose');
    await mongoose.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  console.error(
    error instanceof Error &&
      /^(JWT_SECRET|PORT|CLIENT_ORIGIN|BUSINESS_TIMEZONE|MONGO_URI|Set MONGO_URI)/.test(
        error.message,
      )
      ? error.message
      : 'MongoDB connection failed. Check MONGO_URI, Atlas database user and IP access list. Connection credentials are not logged.',
  );
  process.exit(1);
}
