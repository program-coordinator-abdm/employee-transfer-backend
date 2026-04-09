const express = require("express");
const authMiddleware = require("../middlewares/auth");
const authorizeRoles = require("../middlewares/authorize");
const vacancyController = require("../controllers/vacancyController");

const router = express.Router();

// Apply database migrations on deploy host with: npx prisma migrate deploy
router.use(authMiddleware);

router.post("/", vacancyController.createVacancy);
router.get("/", vacancyController.listVacancies);
router.get(
  "/institutions",
  authorizeRoles("ADMIN", "DATA_OFFICER"),
  vacancyController.listVacancyInstitutions
);
router.get(
  "/by-institution",
  authorizeRoles("ADMIN", "DATA_OFFICER"),
  vacancyController.getVacanciesByInstitution
);
router.get(
  "/edit/:id",
  authorizeRoles("ADMIN", "DATA_OFFICER"),
  vacancyController.getVacancyById
);
router.get("/:id", vacancyController.getVacancyById);
router.put(
  "/:id",
  authorizeRoles("ADMIN", "DATA_OFFICER"),
  vacancyController.updateVacancy
);
router.put(
  "/edit/:id",
  authorizeRoles("ADMIN", "DATA_OFFICER"),
  vacancyController.updateVacancy
);
router.delete("/:id", vacancyController.deleteVacancy);

module.exports = router;
