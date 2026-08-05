import mongoose from 'mongoose';
import { app } from './app.js';
import { config } from './config.js';

const PORT = 3000;

const applicationStart = async () => {
  try {
    await mongoose.connect(config.mongo_uri);
    console.log('Connected to MongoDO successfully.');
  } catch (err) {
    console.error(err);
  }

  app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
  });
};

applicationStart();
