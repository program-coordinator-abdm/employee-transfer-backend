require("dotenv").config();
const app = require("./app");

const port = process.env.PORT || 4000;

console.warn("WARNING: plaintext passwords enabled (dev-only)");

app.listen(port, "127.0.0.1", () => {
  console.log(`Server running on http://localhost:${port}`);
});
