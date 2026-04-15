const express = require("express");
const employeeController = require("../controllers/employeeController");
const transferController = require("../controllers/transferController");
const authMiddleware = require("../middlewares/auth");
const authorizeRoles = require("../middlewares/authorize");

const router = express.Router();

router.use(authMiddleware);

router.get("/", employeeController.listEmployees);
router.get("/filter-options", employeeController.getEmployeeFilterOptions);
router.get("/filter", employeeController.filterEmployees);
router.get("/export", employeeController.exportEmployees);
router.get("/export.xlsx", employeeController.exportEmployeesExcel);
router.get("/suggestions", employeeController.getSuggestions);
router.get("/edit/:id", employeeController.getEmployeeById);
router.get("/:id", employeeController.getEmployeeById);
router.post(
  "/",
  authorizeRoles("ADMIN", "DATA_OFFICER"),
  employeeController.createEmployee
);
router.put(
  "/:id",
  authorizeRoles("ADMIN", "DATA_OFFICER"),
  employeeController.updateEmployee
);
router.put(
  "/edit/:id",
  authorizeRoles("ADMIN", "DATA_OFFICER"),
  employeeController.updateEmployee
);
router.delete("/:id", authorizeRoles("ADMIN"), employeeController.deleteEmployee);
router.post("/:id/transfers", authorizeRoles("ADMIN"), transferController.createTransfer);

module.exports = router;
