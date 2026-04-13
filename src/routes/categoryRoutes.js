const express = require("express");
const authMiddleware = require("../middlewares/auth");
const categoryController = require("../controllers/categoryController");

const router = express.Router();

router.use(authMiddleware);

router.get("/", categoryController.getCategoryCounts);
router.get("/employees", categoryController.searchCategoryEmployees);

module.exports = router;
