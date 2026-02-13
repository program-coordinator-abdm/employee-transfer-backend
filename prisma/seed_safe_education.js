require("dotenv").config();

const prisma = require("../src/services/prisma");

const buildEducationProfile = (role, index) => {
  const baseYear = 2004 + (index % 8);
  const diplomaYear = baseYear + 2;
  const gradYear = baseYear + 4;
  const pgYear = gradYear + 2;

  switch (role) {
    case "Doctor":
      return {
        education: [
          {
            qualification: "MBBS",
            type: "Undergraduate",
            degree: "MBBS",
            institution: "Government Medical College",
            university: "RGUHS",
            year: String(gradYear),
          },
          {
            qualification: "MD",
            type: "Post Graduation",
            degree: "MD",
            institution: "Bangalore Medical College",
            university: "RGUHS",
            year: String(pgYear),
            specialization: "General Medicine",
          },
        ],
        postgraduateQualifications: [
          {
            degree: "MD",
            institution: "Bangalore Medical College",
            university: "RGUHS",
            year: String(pgYear),
            specialization: "General Medicine",
          },
        ],
      };
    case "Nurse":
      return {
        education: [
          {
            qualification: "GNM",
            type: "Diploma",
            degree: "GNM",
            institution: "Government Nursing School",
            university: "Karnataka State Nursing Council",
            year: String(diplomaYear),
          },
          {
            qualification: "BSc Nursing",
            type: "Undergraduate",
            degree: "BSc Nursing",
            institution: "Government College of Nursing",
            university: "Karnataka State Nursing University",
            year: String(gradYear),
          },
        ],
        postgraduateQualifications: [
          {
            degree: "MSc Nursing",
            institution: "Government College of Nursing",
            university: "Karnataka State Nursing University",
            year: String(pgYear),
            specialization: "Medical Surgical Nursing",
          },
        ],
      };
    case "Pharmacist":
      return {
        education: [
          {
            qualification: "DPharm",
            type: "Diploma",
            degree: "DPharm",
            institution: "Government Pharmacy College",
            university: "RGUHS",
            year: String(diplomaYear),
          },
          {
            qualification: "BPharm",
            type: "Undergraduate",
            degree: "BPharm",
            institution: "Government Pharmacy College",
            university: "RGUHS",
            year: String(gradYear),
          },
        ],
        postgraduateQualifications: [
          {
            degree: "MPharm",
            institution: "Government Pharmacy College",
            university: "RGUHS",
            year: String(pgYear),
            specialization: "Clinical Pharmacy",
          },
        ],
      };
    case "Lab Technician":
      return {
        education: [
          {
            qualification: "DMLT",
            type: "Diploma",
            degree: "DMLT",
            institution: "Government Medical College",
            university: "RGUHS",
            year: String(diplomaYear),
          },
          {
            qualification: "BSc MLT",
            type: "Undergraduate",
            degree: "BSc MLT",
            institution: "Government Medical College",
            university: "RGUHS",
            year: String(gradYear),
          },
        ],
        postgraduateQualifications: [
          {
            degree: "MSc MLT",
            institution: "Government Medical College",
            university: "RGUHS",
            year: String(pgYear),
            specialization: "Clinical Pathology",
          },
        ],
      };
    case "Radiology":
      return {
        education: [
          {
            qualification: "Diploma in Radiography",
            type: "Diploma",
            degree: "Diploma in Radiography",
            institution: "Government Medical College",
            university: "RGUHS",
            year: String(diplomaYear),
          },
          {
            qualification: "BSc Radiography",
            type: "Undergraduate",
            degree: "BSc Radiography",
            institution: "Government Medical College",
            university: "RGUHS",
            year: String(gradYear),
          },
        ],
        postgraduateQualifications: [
          {
            degree: "MSc Radiography",
            institution: "Government Medical College",
            university: "RGUHS",
            year: String(pgYear),
            specialization: "Imaging Technology",
          },
        ],
      };
    case "Support Staff":
      return {
        education: [
          {
            qualification: "SSLC",
            type: "School",
            degree: "SSLC",
            institution: "Karnataka Secondary Board",
            year: String(baseYear),
          },
          {
            qualification: "PUC",
            type: "Pre-University",
            degree: "PUC",
            institution: "Karnataka Pre-University Board",
            year: String(diplomaYear),
          },
        ],
        postgraduateQualifications: [
          {
            degree: "Certificate in Hospital Support Services",
            institution: "State Health Training Institute",
            year: String(gradYear),
            specialization: "Hospital Operations",
          },
        ],
      };
    case "IT Help Desk":
      return {
        education: [
          {
            qualification: "Diploma in IT",
            type: "Diploma",
            degree: "Diploma in IT",
            institution: "Government Polytechnic",
            year: String(diplomaYear),
          },
          {
            qualification: "BCA",
            type: "Undergraduate",
            degree: "BCA",
            institution: "Government College",
            university: "Bangalore University",
            year: String(gradYear),
          },
        ],
        postgraduateQualifications: [
          {
            degree: "MCA",
            institution: "Government College",
            university: "Bangalore University",
            year: String(pgYear),
            specialization: "Information Systems",
          },
        ],
      };
    case "EMT":
      return {
        education: [
          {
            qualification: "EMT Certification",
            type: "Certificate",
            degree: "EMT",
            institution: "State Health Training Institute",
            year: String(diplomaYear),
          },
          {
            qualification: "Diploma in Emergency Care",
            type: "Diploma",
            degree: "Emergency Care",
            institution: "Government Medical College",
            university: "RGUHS",
            year: String(gradYear),
          },
        ],
        postgraduateQualifications: [
          {
            degree: "Advanced Trauma Care",
            institution: "State Health Training Institute",
            year: String(pgYear),
            specialization: "Pre-hospital Care",
          },
        ],
      };
    case "Administration":
      return {
        education: [
          {
            qualification: "BA",
            type: "Undergraduate",
            degree: "BA",
            institution: "Government College",
            university: "Mysore University",
            year: String(gradYear),
          },
          {
            qualification: "MBA",
            type: "Post Graduation",
            degree: "MBA",
            institution: "Government Business School",
            university: "Bangalore University",
            year: String(pgYear),
            specialization: "Human Resources",
          },
        ],
        postgraduateQualifications: [
          {
            degree: "MBA",
            institution: "Government Business School",
            university: "Bangalore University",
            year: String(pgYear),
            specialization: "Human Resources",
          },
        ],
      };
    default:
      return {
        education: [
          {
            qualification: "PUC",
            type: "Pre-University",
            degree: "PUC",
            institution: "Karnataka Pre-University Board",
            year: String(diplomaYear),
          },
        ],
        postgraduateQualifications: [
          {
            degree: "Certificate in Public Service",
            institution: "State Training Institute",
            year: String(gradYear),
          },
        ],
      };
  }
};

const isMissingEducation = (education) =>
  !Array.isArray(education) || education.length === 0;

const isMissingPostgrad = (postgrad) =>
  !Array.isArray(postgrad) || postgrad.length === 0;

const CATEGORY_MODELS = [
  { model: "doctor", roleFallback: "Doctor" },
  { model: "nurse", roleFallback: "Nurse" },
  { model: "pharmacist", roleFallback: "Pharmacist" },
  { model: "labTechnician", roleFallback: "Lab Technician" },
  { model: "radiologyStaff", roleFallback: "Radiology" },
  { model: "supportStaff", roleFallback: "Support Staff" },
  { model: "itHelpdeskStaff", roleFallback: "IT Help Desk" },
  { model: "emtStaff", roleFallback: "EMT" },
  { model: "administrationStaff", roleFallback: "Administration" },
];

const updateEducationForModel = async ({ model, roleFallback }) => {
  const records = await prisma[model].findMany({
    select: {
      id: true,
      role: true,
      education: true,
      postgraduateQualifications: true,
    },
  });

  let updated = 0;
  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    const educationMissing = isMissingEducation(record.education);
    const postgradMissing = isMissingPostgrad(record.postgraduateQualifications);

    if (!educationMissing && !postgradMissing) {
      continue;
    }

    const profile = buildEducationProfile(record.role || roleFallback, i);
    const data = {};
    if (educationMissing) {
      data.education = profile.education;
    }
    if (postgradMissing) {
      data.postgraduateQualifications = profile.postgraduateQualifications;
    }

    await prisma[model].update({
      where: { id: record.id },
      data,
    });
    updated += 1;
  }

  return { model, updated };
};

const seedEducationSafe = async () => {
  const results = [];
  for (const entry of CATEGORY_MODELS) {
    const result = await updateEducationForModel(entry);
    results.push(result);
  }

  results.forEach((result) => {
    console.log(`Updated ${result.updated} records in ${result.model}`);
  });
};

seedEducationSafe()
  .then(() => {
    console.log("Safe education update completed");
  })
  .catch((error) => {
    console.error("Safe education update failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
