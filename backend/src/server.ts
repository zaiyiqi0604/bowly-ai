import { createApp } from "./app.js";

const port = Number(process.env.BACKEND_PORT ?? 8787);
const app = createApp();

app.listen(port, () => {
  console.log(`Bowly backend running at http://localhost:${port}`);
});
