import { app } from './app.js';
import { env } from './env.js';

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`FixJeZaak backend listening on http://localhost:${env.port}`);
});
