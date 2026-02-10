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

const formatDate = (date) => date.toISOString().split("T")[0];

const formatPeriod = (startedOn, endedOn) => {
  const start = new Date(startedOn);
  const end = new Date(endedOn);
  const totalMonths =
    end.getFullYear() * 12 +
    end.getMonth() -
    (start.getFullYear() * 12 + start.getMonth());
  const years = Math.floor(totalMonths / 12);
  const months = Math.max(0, totalMonths % 12);
  if (years > 0 && months > 0) {
    return `${years} year${years !== 1 ? "s" : ""} ${months} month${months !== 1 ? "s" : ""}`;
  }
  if (years > 0) {
    return `${years} year${years !== 1 ? "s" : ""}`;
  }
  return `${months} month${months !== 1 ? "s" : ""}`;
};

const buildAssignmentHistory = (index, role, dateOfJoining) => {
  const firstStart = new Date(dateOfJoining);
  const firstEnd = new Date(firstStart);
  firstEnd.setFullYear(firstEnd.getFullYear() + 2);

  const secondStart = new Date(firstEnd);
  const secondEnd = new Date(secondStart);
  secondEnd.setFullYear(secondEnd.getFullYear() + 3);

  const typeCycle = ["past", "rural", "contract", "admin", "additional"];

  const firstEntry = {
    role,
    city: cities[(index + 1) % cities.length],
    hospital: hospitals[(index + 1) % hospitals.length],
    position: positions[(index + 1) % positions.length],
    startedOn: firstStart.toISOString(),
    endedOn: firstEnd.toISOString(),
    district: cities[(index + 1) % cities.length],
    period: formatPeriod(firstStart, firstEnd),
    type: typeCycle[index % typeCycle.length],
  };

  const secondEntry = {
    role,
    city: cities[(index + 2) % cities.length],
    hospital: hospitals[(index + 2) % hospitals.length],
    position: positions[(index + 2) % positions.length],
    startedOn: secondStart.toISOString(),
    endedOn: secondEnd.toISOString(),
    district: cities[(index + 2) % cities.length],
    period: formatPeriod(secondStart, secondEnd),
    type: typeCycle[(index + 1) % typeCycle.length],
  };

  return [firstEntry, secondEntry];
};

const buildProfileData = (index, role, currentCity, currentPosition) => {
  return {
    currentDesignation: `${currentPosition} ${currentCity}`,
    postAppliedFor: `${role} Transfer`,
    submittedOn: formatDate(new Date(2025, 9, 5)),
    objections: "Not provided",
    education: [
      {
        type: "MBBS",
        institution: "Government Medical College",
        year: "2008",
      },
      {
        type: "Post Graduation",
        degree: "MD",
        institution: "Bangalore Medical College",
        university: "RGUHS",
        year: "2012",
        specialization: "General Medicine",
      },
    ],
    serviceInformation: {
      deputedByGovernment: "Yes",
      specialistService: "Yes",
      trainingInHospitalAdmin: "Completed",
      spouseInGovtService: "No",
      spouseServiceDetails: "",
    },
    appointmentDetails: {
      slNoInOrder: `${100 + index}`,
      orderNoAndDate: `GOK/ETM/${2020 + (index % 4)}/${formatDate(new Date(2020, 5, 15))}`,
      dateOfInitialAppointment: formatDate(new Date(2010 + (index % 10), 2, 1)),
    },
    probationDetails: "Probation completed successfully.",
    timeboundPromotions: [
      {
        label: "6 Year Promotion",
        status: "Granted",
        order: `TBP-${200 + index}`,
        date: formatDate(new Date(2016, 6, 1)),
      },
      {
        label: "13 Year Promotion",
        status: "Pending",
        order: `TBP-${300 + index}`,
        date: formatDate(new Date(2023, 6, 1)),
      },
    ],
    postgraduateQualifications: [
      {
        degree: "MD",
        institution: "Bangalore Medical College",
        university: "RGUHS",
        year: "2012",
        specialization: "General Medicine",
      },
    ],
    administrativeRoles: [
      {
        role: "Department Coordinator",
        fromDate: formatDate(new Date(2021, 1, 1)),
        toDate: formatDate(new Date(2022, 11, 31)),
        details: "Oversaw departmental operations",
      },
    ],
    additionalCharges: [
      {
        designation: "In-charge",
        place: currentCity,
        fromDate: formatDate(new Date(2023, 1, 1)),
        toDate: formatDate(new Date(2024, 1, 1)),
      },
    ],
    achievements: [
      {
        type: "significant",
        description: "No significant achievements recorded",
      },
      {
        type: "special",
        description: `State award best program officer of ${currentCity} district 2023 received at Bangalore`,
      },
    ],
    disciplinaryRecord: {
      departmentalEnquiries: "no",
      suspensionPeriods: "no",
      punishmentsReceived: "no",
      criminalProceedings: "No criminal proceedings recorded",
      pendingLegalMatters: "no",
    },
    declaration: {
      declarationDate: formatDate(new Date(2025, 9, 5)),
      declarationPlace: currentCity.toLowerCase(),
      agreedToDeclaration: "Yes",
      remarks: "Not provided",
    },
    documents: [
      {
        name: "13 YR TIME BOND.pdf",
        sizeKB: 1254.51,
        uploadedAt: "10/6/2025, 12:54:30 PM",
        downloadUrl: "https://example.com/docs/13yr-time-bond.pdf",
      },
      {
        name: "06YEAR TIME BOND.jpeg",
        sizeKB: 123.25,
        uploadedAt: "10/6/2025, 12:54:30 PM",
        downloadUrl: "https://example.com/docs/06year-time-bond.jpeg",
      },
    ],
  };
};

const generateCategoryEmployees = ({ count, prefix, role, startIndex }) => {
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

    const assignmentHistory = buildAssignmentHistory(index, role, dateOfJoining);

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
      ...buildProfileData(index, role, currentCity, currentPosition),
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
