const express = require("express");
const exportController = require("../controllers/exportController");
const authMiddleware = require("../middlewares/auth");

const router = express.Router();

router.use(authMiddleware);

router.get("/employees.csv", exportController.exportCsv);
router.get("/employees.pdf", exportController.exportPdf);

module.exports = router;
