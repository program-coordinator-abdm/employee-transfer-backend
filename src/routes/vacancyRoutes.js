const express = require("express");
const authMiddleware = require("../middlewares/auth");
const vacancyController = require("../controllers/vacancyController");

const router = express.Router();

// Apply database migrations on deploy host with: npx prisma migrate deploy
router.use(authMiddleware);

router.post("/", vacancyController.createVacancy);
router.get("/", vacancyController.listVacancies);
router.get("/:id", vacancyController.getVacancyById);
router.put("/:id", vacancyController.updateVacancy);
router.delete("/:id", vacancyController.deleteVacancy);

module.exports = router;
