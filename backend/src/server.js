import app from './app.js';
import { env } from './config/env.js';
import './db/init.js';

app.listen(env.port, () => {
  console.log(`Backend listening on http://localhost:${env.port}`);
});
