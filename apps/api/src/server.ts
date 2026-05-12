import { apiConfig } from "./config";
import { createApp } from "./app";

const app = createApp();

app.listen(apiConfig.port, () => {
  console.log(`API listening on http://localhost:${apiConfig.port}`);
});

