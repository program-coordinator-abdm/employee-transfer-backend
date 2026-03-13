const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

router.options("/login", (_req, res) => {
  res.sendStatus(204);
});
router.post("/login", authController.login);

module.exports = router;
