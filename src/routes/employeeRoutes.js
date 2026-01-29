const express = require("express");
const employeeController = require("../controllers/employeeController");
const transferController = require("../controllers/transferController");
const authMiddleware = require("../middlewares/auth");

const router = express.Router();

router.use(authMiddleware);

router.get("/", employeeController.listEmployees);
router.get("/suggestions", employeeController.getSuggestions);
router.get("/:id", employeeController.getEmployeeById);
router.post("/:id/transfers", transferController.createTransfer);

module.exports = router;
