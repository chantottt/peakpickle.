import dotenv from 'dotenv';
dotenv.config();
const { connectDatabase } = await import('./config/database.js');
const { app } = await import('./app.js');
try {
  await connectDatabase();
  const server = app.listen(Number(process.env.PORT) || 5000, () =>
    console.log(`PeakPickle API running on port ${process.env.PORT || 5000}`),
  );
  const shutdown = async () => {
    server.close();
    const { default: mongoose } = await import('mongoose');
    await mongoose.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
