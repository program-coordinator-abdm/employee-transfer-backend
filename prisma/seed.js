const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

const cities = [
  "Bengaluru",
  "Mysuru",
  "Mangaluru",
  "Hubballi",
  "Dharwad",
  "Belagavi",
  "Kalaburagi",
  "Ballari",
  "Davanagere",
  "Shivamogga",
  "Tumakuru",
  "Udupi",
  "Hassan",
  "Mandya",
  "Chitradurga",
  "Kolar",
  "Chikkamagaluru",
  "Vijayapura",
  "Bidar",
  "Raichur",
  "Koppal",
  "Gadag",
  "Bagalkot",
  "Yadgir",
  "Ramanagara",
  "Chikkaballapur",
  "Kodagu (Madikeri)",
  "Haveri",
  "Uttara Kannada (Karwar)",
  "Dakshina Kannada (Mangaluru)",
  "Bengaluru Rural",
];

const roles = [
  "Medical Officer",
  "Staff Nurse",
  "Public Health Officer",
  "Data Analyst",
  "Program Manager",
  "Senior Clerk",
  "District Coordinator",
  "IT Support",
  "Pharmacist",
  "Lab Technician",
];

const positions = [
  "Senior Medical Officer",
  "Community Health Supervisor",
  "District Program Lead",
  "Junior Analyst",
  "Senior Analyst",
  "Operations Coordinator",
  "Regional Liaison",
  "Health Informatics Officer",
  "Field Supervisor",
  "Administrative Officer",
];

const firstNames = [
  "Aarav",
  "Ananya",
  "Vihaan",
  "Isha",
  "Arjun",
  "Kavya",
  "Rohan",
  "Meera",
  "Aditya",
  "Nisha",
  "Rahul",
  "Pooja",
  "Sanjay",
  "Divya",
  "Kiran",
  "Lakshmi",
  "Naveen",
  "Sneha",
  "Manish",
  "Priya",
];

const lastNames = [
  "Shetty",
  "Rao",
  "Gowda",
  "Reddy",
  "Naik",
  "Kumar",
  "Hegde",
  "Patil",
  "Jain",
  "Kulkarni",
  "Bhat",
  "Desai",
  "Murthy",
  "Sharma",
  "Joshi",
];

const generateEmployees = (count) => {
  const employees = [];
  for (let i = 1; i <= count; i += 1) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[(i * 3) % lastNames.length];
    const empName = `${firstName} ${lastName}`;
    const empKgid = `KGID${1000 + i}`;
    const role = roles[i % roles.length];
    const yearsOfWork = Math.max(0, (i * 2) % 31);
    const dob = new Date(1975 + (i % 20), (i * 2) % 12, (i * 7) % 28 + 1);
    const currentCity = cities[i % cities.length];
    const currentPosition = positions[i % positions.length];

    employees.push({
      empName,
      empKgid,
      role,
      yearsOfWork,
      dob,
      currentCity,
      currentPosition,
    });
  }
  return employees;
};

const seed = async () => {
  await prisma.transfer.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Admin@123", 10);

  await prisma.user.create({
    data: {
      username: "admin",
      email: "admin@karnataka.gov.in",
      phone: "9000000000",
      passwordHash,
      profilePictureUrl: null,
    },
  });

  const employees = generateEmployees(45);
  await prisma.employee.createMany({ data: employees });
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
