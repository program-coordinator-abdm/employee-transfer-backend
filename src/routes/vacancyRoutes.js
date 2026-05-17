const express = require("express");
const authMiddleware = require("../middlewares/auth");
const authorizeRoles = require("../middlewares/authorize");
const vacancyController = require("../controllers/vacancyController");

const router = express.Router();

router.options("/by-institution-id/:institutionId", (_req, res) =>
  res.sendStatus(200)
);
router.options("/institution/:institutionId", (_req, res) => res.sendStatus(200));
router.options("/lines/:lineId", (_req, res) => res.sendStatus(200));
router.options("/:vacancyId", (_req, res) => res.sendStatus(200));

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
router.delete(
  "/lines/:lineId",
  authorizeRoles("ADMIN", "DATA_OFFICER"),
  vacancyController.deleteVacancyLine
);
router.delete(
  "/by-institution-id/:institutionId",
  authorizeRoles("ADMIN"),
  vacancyController.deleteVacancyByInstitutionId
);
// Backward-compatible alias for clients that already send the stable vacancy UUID.
router.delete(
  "/institution/:institutionId",
  authorizeRoles("ADMIN"),
  vacancyController.deleteVacancyByInstitutionId
);
router.delete(
  "/:vacancyId",
  authorizeRoles("ADMIN"),
  vacancyController.deleteVacancy
);

module.exports = router;
