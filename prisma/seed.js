require("dotenv").config();

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const seed = async () => {
  const admin = {
    username: "admin",
    email: "admin@etms.gov.in",
    password: "Admin@1234",
    role: "ADMIN",
  };

  const dataOfficer = {
    username: "dataofficer",
    email: "dataofficer@karnataka.gov.in",
    password: "Data@1234",
    role: "DATA_OFFICER",
  };

  await prisma.user.upsert({
    where: { email: admin.email },
    update: {
      username: admin.username,
      password: admin.password,
      role: admin.role,
    },
    create: admin,
  });

  await prisma.user.upsert({
    where: { email: dataOfficer.email },
    update: {
      username: dataOfficer.username,
      password: dataOfficer.password,
      role: dataOfficer.role,
    },
    create: dataOfficer,
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
