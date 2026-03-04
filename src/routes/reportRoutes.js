const express = require("express");
const authMiddleware = require("../middlewares/auth");
const reportController = require("../controllers/reportController");

const router = express.Router();

router.use(authMiddleware);

router.get("/district-entry-counts", reportController.getDistrictEntryCounts);

module.exports = router;
