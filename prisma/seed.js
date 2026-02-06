require("dotenv").config();

const prisma = require("../src/services/prisma");

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

const hospitals = [
  "District Hospital",
  "Taluk Hospital",
  "Community Health Center",
  "Primary Health Center",
  "Government Medical College",
  "Sub-District Hospital",
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

const buildAssignmentHistory = (params) => {
  const { dateOfJoining, role, baseIndex } = params;
  const firstStart = new Date(dateOfJoining);
  const firstEnd = new Date(firstStart);
  firstEnd.setFullYear(firstEnd.getFullYear() + 2);

  const secondStart = new Date(firstEnd);
  const secondEnd = new Date(secondStart);
  secondEnd.setFullYear(secondEnd.getFullYear() + 3);

  return [
    {
      role,
      city: cities[(baseIndex + 1) % cities.length],
      hospital: hospitals[(baseIndex + 1) % hospitals.length],
      position: positions[(baseIndex + 1) % positions.length],
      startedOn: firstStart.toISOString(),
      endedOn: firstEnd.toISOString(),
    },
    {
      role,
      city: cities[(baseIndex + 2) % cities.length],
      hospital: hospitals[(baseIndex + 2) % hospitals.length],
      position: positions[(baseIndex + 2) % positions.length],
      startedOn: secondStart.toISOString(),
      endedOn: secondEnd.toISOString(),
    },
  ];
};

const generateCategoryEmployees = ({
  count,
  prefix,
  role,
  startIndex,
}) => {
  const employees = [];
  for (let i = 0; i < count; i += 1) {
    const index = startIndex + i;
    const firstName = firstNames[index % firstNames.length];
    const lastName = lastNames[(index * 3) % lastNames.length];
    const empName = `${firstName} ${lastName}`;
    const empKgid = `${prefix}${1000 + index}`;
    const yearsOfWork = Math.max(1, (index * 2) % 31);
    const dob = new Date(1975 + (index % 20), (index * 2) % 12, (index * 7) % 28 + 1);
    const dateOfJoining = new Date(
      2000 + (index % 20),
      (index * 3) % 12,
      (index * 5) % 28 + 1
    );
    const currentCity = cities[index % cities.length];
    const currentHospital = hospitals[index % hospitals.length];
    const currentPosition = positions[index % positions.length];

    const assignmentHistory = buildAssignmentHistory({
      dateOfJoining,
      role,
      baseIndex: index,
    });

    employees.push({
      empName,
      empKgid,
      role,
      yearsOfWork,
      dob,
      dateOfJoining,
      currentCity,
      currentHospital,
      currentPosition,
      assignmentHistory,
    });
  }
  return employees;
};

const seed = async () => {
  await prisma.transfer.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.nurse.deleteMany();
  await prisma.pharmacist.deleteMany();
  await prisma.labTechnician.deleteMany();
  await prisma.radiologyStaff.deleteMany();
  await prisma.supportStaff.deleteMany();
  await prisma.itHelpdeskStaff.deleteMany();
  await prisma.emtStaff.deleteMany();
  await prisma.administrationStaff.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.create({
    data: {
      username: "admin",
      email: "admin@karnataka.gov.in",
      phone: "9000000000",
      password: "Admin@123",
      profilePictureUrl: null,
    },
  });

  const employees = generateEmployees(45);
  await prisma.employee.createMany({ data: employees });

  await prisma.doctor.createMany({
    data: generateCategoryEmployees({ count: 12, prefix: "DOC", role: "Doctor", startIndex: 1 }),
  });
  await prisma.nurse.createMany({
    data: generateCategoryEmployees({ count: 18, prefix: "NUR", role: "Nurse", startIndex: 40 }),
  });
  await prisma.pharmacist.createMany({
    data: generateCategoryEmployees({ count: 10, prefix: "PHA", role: "Pharmacist", startIndex: 80 }),
  });
  await prisma.labTechnician.createMany({
    data: generateCategoryEmployees({ count: 9, prefix: "LAB", role: "Lab Technician", startIndex: 120 }),
  });
  await prisma.radiologyStaff.createMany({
    data: generateCategoryEmployees({ count: 7, prefix: "RAD", role: "Radiology", startIndex: 160 }),
  });
  await prisma.supportStaff.createMany({
    data: generateCategoryEmployees({ count: 15, prefix: "SUP", role: "Support Staff", startIndex: 200 }),
  });
  await prisma.itHelpdeskStaff.createMany({
    data: generateCategoryEmployees({ count: 6, prefix: "ITH", role: "IT Help Desk", startIndex: 240 }),
  });
  await prisma.emtStaff.createMany({
    data: generateCategoryEmployees({ count: 8, prefix: "EMT", role: "EMT", startIndex: 280 }),
  });
  await prisma.administrationStaff.createMany({
    data: generateCategoryEmployees({ count: 11, prefix: "ADM", role: "Administration", startIndex: 320 }),
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
