require("dotenv").config();

const prisma = require("../src/services/prisma");

const seed = async () => {
  await prisma.transfer.deleteMany();
  await prisma.document.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.additionalCharge.deleteMany();
  await prisma.administrativeRole.deleteMany();
  await prisma.timeboundPromotion.deleteMany();
  await prisma.postgraduateQualification.deleteMany();
  await prisma.education.deleteMany();
  await prisma.pastService.deleteMany();
  await prisma.assignmentHistory.deleteMany();
  await prisma.declaration.deleteMany();
  await prisma.disciplinaryRecord.deleteMany();
  await prisma.serviceInformation.deleteMany();
  await prisma.appointmentDetails.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({
    data: [
      {
        username: "admin",
        email: "admin@karnataka.gov.in",
        phone: "9000000000",
        password: "Admin@123",
        role: "ADMIN",
        profilePictureUrl: null,
      },
      {
        username: "dataofficer",
        email: "dataofficer@karnataka.gov.in",
        phone: "9000000001",
        password: "Data@1234",
        role: "DATA_OFFICER",
        profilePictureUrl: null,
      },
    ],
  });
};

seed()
  .then(() => {
    console.log("Seed completed");
  })
  .catch((error) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
