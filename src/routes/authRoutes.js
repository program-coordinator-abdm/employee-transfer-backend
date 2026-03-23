const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

router.options("/login", (_req, res) => {
  res.sendStatus(200);
});
router.post("/login", authController.login);

module.exports = router;
