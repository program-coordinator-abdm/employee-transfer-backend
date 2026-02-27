const express = require("express");
const employeeController = require("../controllers/employeeController");
const transferController = require("../controllers/transferController");
const authMiddleware = require("../middlewares/auth");
const authorizeRoles = require("../middlewares/authorize");

const router = express.Router();

router.use(authMiddleware);

router.get("/", employeeController.listEmployees);
router.get("/export", employeeController.exportEmployees);
router.get("/suggestions", employeeController.getSuggestions);
router.get("/:id", employeeController.getEmployeeById);
router.post("/", authorizeRoles("DATA_OFFICER"), employeeController.createEmployee);
router.put("/:id", authorizeRoles("ADMIN"), employeeController.updateEmployee);
router.post("/:id/transfers", authorizeRoles("ADMIN"), transferController.createTransfer);

module.exports = router;
