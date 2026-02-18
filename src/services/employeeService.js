const prisma = require("./prisma");
const { AppError } = require("../utils/errors");

const formatPeriod = (startedOn, endedOn) => {
  if (!startedOn) return "-";
  const start = new Date(startedOn);
  const end = endedOn ? new Date(endedOn) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-";
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

const calculateYearsFromDate = (date) => {
  if (!date) return 0;
  const diffMs = Date.now() - new Date(date).getTime();
  return Math.max(0, Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000)));
};

const calculateTotalExperienceYears = (assignments) => {
  if (!assignments || assignments.length === 0) return 0;
  const totalMonths = assignments.reduce((sum, entry) => {
    const start = new Date(entry.startedOn);
    const end = entry.endedOn ? new Date(entry.endedOn) : new Date();
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return sum;
    const months =
      end.getFullYear() * 12 +
      end.getMonth() -
      (start.getFullYear() * 12 + start.getMonth());
    return sum + Math.max(0, months);
  }, 0);
  return Math.max(0, Math.floor(totalMonths / 12));
};

const buildSearchWhere = (searchMode, query) => {
  const where = {};
  if (query) {
    if (searchMode === "kgid") {
      where.OR = [
        { empKgid: { startsWith: query, mode: "insensitive" } },
        { empKgid: { contains: query, mode: "insensitive" } },
      ];
    } else {
      where.empName = { contains: query, mode: "insensitive" };
    }
  }
  return where;
};

const buildCategoryWhere = (category) => {
  if (!category) return {};
  return {
    OR: [
      { designationGroup: { equals: category, mode: "insensitive" } },
      { designationSubGroup: { equals: category, mode: "insensitive" } },
      { designation: { equals: category, mode: "insensitive" } },
      { currentPostHeld: { equals: category, mode: "insensitive" } },
    ],
  };
};

const mapAssignment = (entry) => ({
  role: entry.role,
  city: entry.city,
  hospital: entry.hospital,
  position: entry.position,
  district: entry.district || entry.city,
  startedOn: entry.startedOn.toISOString(),
  endedOn: entry.endedOn ? entry.endedOn.toISOString() : null,
  period: entry.period || formatPeriod(entry.startedOn, entry.endedOn),
  type: entry.type,
});

const mapEmployeeList = (employee) => {
  const yearsOfWork = employee.yearsOfWork ?? calculateYearsFromDate(employee.dateOfEntry);
  return {
    id: String(employee.id),
    empName: employee.empName,
    empKgid: employee.empKgid,
    role: employee.designation,
    yearsOfWork,
    totalExperienceYears: yearsOfWork,
    dob: employee.dob,
    dateOfJoining: employee.dateOfJoining,
    dateOfEntry: employee.dateOfEntry,
    currentCity: employee.currentCityTownVillage,
    currentPosition: employee.currentPostHeld,
    currentHospital: employee.currentInstitution,
    currentDesignation: employee.currentDesignation,
    email: employee.email,
    phone: employee.phoneNumber,
    postAppliedFor: employee.postAppliedFor,
    submittedOn: employee.submittedOn,
    objections: employee.objections,
    category: employee.designationGroup,
  };
};

const mapEmployeeDetail = (employee) => {
  const assignments = (employee.assignmentHistory || []).map(mapAssignment);
  const totalExperienceYears = calculateTotalExperienceYears(assignments);

  return {
    id: String(employee.id),
    empName: employee.empName,
    empKgid: employee.empKgid,
    role: employee.designation,
    yearsOfWork: employee.yearsOfWork ?? calculateYearsFromDate(employee.dateOfEntry),
    totalExperienceYears,
    dob: employee.dob,
    dateOfJoining: employee.dateOfJoining,
    dateOfEntry: employee.dateOfEntry,
    gender: employee.gender,
    designation: employee.designation,
    designationGroup: employee.designationGroup,
    designationSubGroup: employee.designationSubGroup,
    currentCity: employee.currentCityTownVillage,
    currentPosition: employee.currentPostHeld,
    currentHospital: employee.currentInstitution,
    currentDesignation: employee.currentDesignation,
    currentPostHeld: employee.currentPostHeld,
    currentPostGroup: employee.currentPostGroup,
    currentPostSubGroup: employee.currentPostSubGroup,
    currentInstitution: employee.currentInstitution,
    currentDistrict: employee.currentDistrict,
    currentTaluk: employee.currentTaluk,
    currentCityTownVillage: employee.currentCityTownVillage,
    currentWorkingSince: employee.currentWorkingSince,
    email: employee.email,
    phone: employee.phoneNumber,
    phoneNumber: employee.phoneNumber,
    telephoneNumber: employee.telephoneNumber,
    address: employee.address,
    pinCode: employee.pinCode,
    officeAddress: employee.officeAddress,
    officePinCode: employee.officePinCode,
    officeEmail: employee.officeEmail,
    officePhoneNumber: employee.officePhoneNumber,
    officeTelephoneNumber: employee.officeTelephoneNumber,
    postAppliedFor: employee.postAppliedFor,
    submittedOn: employee.submittedOn,
    objections: employee.objections,
    probationaryPeriod: employee.probationaryPeriod,
    probationaryPeriodDoc: employee.probationaryPeriodDoc,
    terminallyIll: employee.terminallyIll,
    terminallyIllDoc: employee.terminallyIllDoc,
    pregnantOrChildUnderOne: employee.pregnantOrChildUnderOne,
    pregnantOrChildUnderOneDoc: employee.pregnantOrChildUnderOneDoc,
    retiringWithinTwoYears: employee.retiringWithinTwoYears,
    retiringWithinTwoYearsDoc: employee.retiringWithinTwoYearsDoc,
    childSpouseDisability: employee.childSpouseDisability,
    childSpouseDisabilityDoc: employee.childSpouseDisabilityDoc,
    divorceeWidowWithChild: employee.divorceeWidowWithChild,
    divorceeWidowWithChildDoc: employee.divorceeWidowWithChildDoc,
    spouseGovtServant: employee.spouseGovtServant,
    spouseGovtServantDoc: employee.spouseGovtServantDoc,
    empDeclAgreed: employee.declaration?.empDeclAgreed ?? false,
    empDeclName: employee.declaration?.empDeclName,
    empDeclDate: employee.declaration?.empDeclDate,
    officerDeclAgreed: employee.declaration?.officerDeclAgreed ?? false,
    officerDeclName: employee.declaration?.officerDeclName,
    officerDeclDate: employee.declaration?.officerDeclDate,
    assignmentHistory: assignments,
    pastServices: employee.pastServices || [],
    education: employee.educations || [],
    postgraduateQualifications: employee.postgraduateQualifications || [],
    timeboundPromotions: employee.timeboundPromotions || [],
    administrativeRoles: employee.administrativeRoles || [],
    additionalCharges: employee.additionalCharges || [],
    achievements: employee.achievements || [],
    disciplinaryRecord: employee.disciplinaryRecord || null,
    declaration: employee.declaration || null,
    serviceInformation: employee.serviceInformation || null,
    appointmentDetails: employee.appointmentDetails || null,
    documents: employee.documents || [],
    category: employee.designationGroup,
  };
};

const listEmployees = async ({ category, searchMode, query, page, limit }) => {
  const where = {
    ...buildSearchWhere(searchMode, query),
    ...buildCategoryWhere(category),
  };

  const total = await prisma.employee.count({ where });
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  const data = await prisma.employee.findMany({
    where,
    orderBy: { empName: "asc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  return {
    data: data.map(mapEmployeeList),
    page,
    limit,
    total,
    totalPages,
  };
};

const getSuggestions = async ({ category, searchMode, query, limit }) => {
  if (!query) return [];
  const where = {
    ...buildSearchWhere(searchMode, query),
    ...buildCategoryWhere(category),
  };
  const results = await prisma.employee.findMany({
    where,
    select: {
      id: true,
      empName: true,
      empKgid: true,
      designation: true,
      designationGroup: true,
      designationSubGroup: true,
      currentPostHeld: true,
    },
    orderBy: { empName: "asc" },
    take: limit,
  });
  return results.map((item) => ({ ...item, id: String(item.id) }));
};

const getEmployeeById = async (id) => {
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      assignmentHistory: { orderBy: { startedOn: "asc" } },
      pastServices: true,
      educations: true,
      postgraduateQualifications: true,
      timeboundPromotions: true,
      administrativeRoles: true,
      additionalCharges: true,
      achievements: true,
      disciplinaryRecord: true,
      declaration: true,
      serviceInformation: true,
      appointmentDetails: true,
      documents: true,
    },
  });
  if (!employee) {
    throw new AppError("Employee not found", 404);
  }
  return mapEmployeeDetail(employee);
};

const buildAssignmentRecords = (payload) => {
  const records = [];
  payload.pastServices.forEach((service) => {
    records.push({
      role: service.postHeld,
      city: service.cityTownVillage || service.district,
      hospital: service.institution,
      position: service.postHeld,
      district: service.district,
      startedOn: service.fromDate,
      endedOn: service.toDate,
      period: service.tenure || formatPeriod(service.fromDate, service.toDate),
      type: "past",
    });
  });

  records.push({
    role: payload.designation,
    city: payload.currentCityTownVillage,
    hospital: payload.currentInstitution,
    position: payload.currentPostHeld,
    district: payload.currentDistrict,
    startedOn: payload.currentWorkingSince,
    endedOn: null,
    period: formatPeriod(payload.currentWorkingSince, null),
    type: "current",
  });

  return records;
};

const createEmployee = async (payload) => {
  return prisma.$transaction(async (tx) => {
    const empName = payload.empName.trim().toUpperCase();
    const dateOfEntry = payload.dateOfEntry;
    const dateOfJoining = payload.dateOfJoining || payload.dateOfEntry;
    const yearsOfWork = calculateYearsFromDate(dateOfEntry);

    const employee = await tx.employee.create({
      data: {
        empName,
        empKgid: payload.empKgid,
        designation: payload.designation,
        designationGroup: payload.designationGroup,
        designationSubGroup: payload.designationSubGroup,
        dateOfEntry,
        dateOfJoining,
        gender: payload.gender,
        dob: payload.dob,
        yearsOfWork,
        currentPostHeld: payload.currentPostHeld,
        currentPostGroup: payload.currentPostGroup,
        currentPostSubGroup: payload.currentPostSubGroup,
        currentInstitution: payload.currentInstitution,
        currentDistrict: payload.currentDistrict,
        currentTaluk: payload.currentTaluk,
        currentCityTownVillage: payload.currentCityTownVillage,
        currentWorkingSince: payload.currentWorkingSince,
        currentDesignation: payload.currentPostHeld,
        email: payload.email,
        phoneNumber: payload.phoneNumber,
        telephoneNumber: payload.telephoneNumber || null,
        address: payload.address,
        pinCode: payload.pinCode,
        officeAddress: payload.officeAddress,
        officePinCode: payload.officePinCode,
        officeEmail: payload.officeEmail,
        officePhoneNumber: payload.officePhoneNumber,
        officeTelephoneNumber: payload.officeTelephoneNumber || null,
        postAppliedFor: payload.postAppliedFor || null,
        submittedOn: payload.submittedOn || new Date(),
        objections: payload.objections || null,
        probationaryPeriod: payload.probationaryPeriod,
        probationaryPeriodDoc: payload.probationaryPeriodDoc || null,
        terminallyIll: payload.terminallyIll,
        terminallyIllDoc: payload.terminallyIllDoc || null,
        pregnantOrChildUnderOne: payload.pregnantOrChildUnderOne,
        pregnantOrChildUnderOneDoc: payload.pregnantOrChildUnderOneDoc || null,
        retiringWithinTwoYears: payload.retiringWithinTwoYears,
        retiringWithinTwoYearsDoc: payload.retiringWithinTwoYearsDoc || null,
        childSpouseDisability: payload.childSpouseDisability,
        childSpouseDisabilityDoc: payload.childSpouseDisabilityDoc || null,
        divorceeWidowWithChild: payload.divorceeWidowWithChild,
        divorceeWidowWithChildDoc: payload.divorceeWidowWithChildDoc || null,
        spouseGovtServant: payload.spouseGovtServant,
        spouseGovtServantDoc: payload.spouseGovtServantDoc || null,
      },
    });

    const assignmentRecords = buildAssignmentRecords(payload).map((record) => ({
      ...record,
      employeeId: employee.id,
    }));
    if (assignmentRecords.length > 0) {
      await tx.assignmentHistory.createMany({ data: assignmentRecords });
    }

    if (payload.pastServices.length > 0) {
      await tx.pastService.createMany({
        data: payload.pastServices.map((service) => ({
          ...service,
          employeeId: employee.id,
        })),
      });
    }

    if (payload.education.length > 0) {
      await tx.education.createMany({
        data: payload.education.map((entry) => ({ ...entry, employeeId: employee.id })),
      });
    }

    if (payload.postgraduateQualifications.length > 0) {
      await tx.postgraduateQualification.createMany({
        data: payload.postgraduateQualifications.map((entry) => ({
          ...entry,
          employeeId: employee.id,
        })),
      });
    }

    if (payload.timeboundPromotions.length > 0) {
      await tx.timeboundPromotion.createMany({
        data: payload.timeboundPromotions.map((entry) => ({ ...entry, employeeId: employee.id })),
      });
    }

    if (payload.administrativeRoles.length > 0) {
      await tx.administrativeRole.createMany({
        data: payload.administrativeRoles.map((entry) => ({ ...entry, employeeId: employee.id })),
      });
    }

    if (payload.additionalCharges.length > 0) {
      await tx.additionalCharge.createMany({
        data: payload.additionalCharges.map((entry) => ({ ...entry, employeeId: employee.id })),
      });
    }

    if (payload.achievements.length > 0) {
      await tx.achievement.createMany({
        data: payload.achievements.map((entry) => ({ ...entry, employeeId: employee.id })),
      });
    }

    if (payload.documents.length > 0) {
      await tx.document.createMany({
        data: payload.documents.map((entry) => ({
          name: entry.name,
          sizeKB: entry.sizeKB ?? null,
          uploadedAt: entry.uploadedAt ? new Date(entry.uploadedAt) : null,
          downloadUrl: entry.downloadUrl ?? null,
          employeeId: employee.id,
        })),
      });
    }

    if (payload.disciplinaryRecord) {
      await tx.disciplinaryRecord.create({
        data: { ...payload.disciplinaryRecord, employeeId: employee.id },
      });
    }

    if (payload.serviceInformation) {
      await tx.serviceInformation.create({
        data: { ...payload.serviceInformation, employeeId: employee.id },
      });
    }

    if (payload.appointmentDetails) {
      await tx.appointmentDetails.create({
        data: { ...payload.appointmentDetails, employeeId: employee.id },
      });
    }

    await tx.declaration.create({
      data: {
        employeeId: employee.id,
        empDeclAgreed: payload.empDeclAgreed,
        empDeclName: payload.empDeclName || null,
        empDeclDate: payload.empDeclDate || null,
        officerDeclAgreed: payload.officerDeclAgreed,
        officerDeclName: payload.officerDeclName || null,
        officerDeclDate: payload.officerDeclDate || null,
      },
    });

    return getEmployeeById(employee.id);
  });
};

const updateEmployee = async (id, payload) => {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.employee.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("Employee not found", 404);
    }

    const empName = payload.empName.trim().toUpperCase();
    const dateOfEntry = payload.dateOfEntry;
    const dateOfJoining = payload.dateOfJoining || payload.dateOfEntry;
    const yearsOfWork = calculateYearsFromDate(dateOfEntry);

    await tx.assignmentHistory.deleteMany({ where: { employeeId: id } });
    await tx.pastService.deleteMany({ where: { employeeId: id } });
    await tx.education.deleteMany({ where: { employeeId: id } });
    await tx.postgraduateQualification.deleteMany({ where: { employeeId: id } });
    await tx.timeboundPromotion.deleteMany({ where: { employeeId: id } });
    await tx.administrativeRole.deleteMany({ where: { employeeId: id } });
    await tx.additionalCharge.deleteMany({ where: { employeeId: id } });
    await tx.achievement.deleteMany({ where: { employeeId: id } });
    await tx.document.deleteMany({ where: { employeeId: id } });
    await tx.disciplinaryRecord.deleteMany({ where: { employeeId: id } });
    await tx.serviceInformation.deleteMany({ where: { employeeId: id } });
    await tx.appointmentDetails.deleteMany({ where: { employeeId: id } });
    await tx.declaration.deleteMany({ where: { employeeId: id } });

    await tx.employee.update({
      where: { id },
      data: {
        empName,
        empKgid: payload.empKgid,
        designation: payload.designation,
        designationGroup: payload.designationGroup,
        designationSubGroup: payload.designationSubGroup,
        dateOfEntry,
        dateOfJoining,
        gender: payload.gender,
        dob: payload.dob,
        yearsOfWork,
        currentPostHeld: payload.currentPostHeld,
        currentPostGroup: payload.currentPostGroup,
        currentPostSubGroup: payload.currentPostSubGroup,
        currentInstitution: payload.currentInstitution,
        currentDistrict: payload.currentDistrict,
        currentTaluk: payload.currentTaluk,
        currentCityTownVillage: payload.currentCityTownVillage,
        currentWorkingSince: payload.currentWorkingSince,
        currentDesignation: payload.currentPostHeld,
        email: payload.email,
        phoneNumber: payload.phoneNumber,
        telephoneNumber: payload.telephoneNumber || null,
        address: payload.address,
        pinCode: payload.pinCode,
        officeAddress: payload.officeAddress,
        officePinCode: payload.officePinCode,
        officeEmail: payload.officeEmail,
        officePhoneNumber: payload.officePhoneNumber,
        officeTelephoneNumber: payload.officeTelephoneNumber || null,
        postAppliedFor: payload.postAppliedFor || null,
        submittedOn: payload.submittedOn || existing.submittedOn,
        objections: payload.objections || null,
        probationaryPeriod: payload.probationaryPeriod,
        probationaryPeriodDoc: payload.probationaryPeriodDoc || null,
        terminallyIll: payload.terminallyIll,
        terminallyIllDoc: payload.terminallyIllDoc || null,
        pregnantOrChildUnderOne: payload.pregnantOrChildUnderOne,
        pregnantOrChildUnderOneDoc: payload.pregnantOrChildUnderOneDoc || null,
        retiringWithinTwoYears: payload.retiringWithinTwoYears,
        retiringWithinTwoYearsDoc: payload.retiringWithinTwoYearsDoc || null,
        childSpouseDisability: payload.childSpouseDisability,
        childSpouseDisabilityDoc: payload.childSpouseDisabilityDoc || null,
        divorceeWidowWithChild: payload.divorceeWidowWithChild,
        divorceeWidowWithChildDoc: payload.divorceeWidowWithChildDoc || null,
        spouseGovtServant: payload.spouseGovtServant,
        spouseGovtServantDoc: payload.spouseGovtServantDoc || null,
      },
    });

    const assignmentRecords = buildAssignmentRecords(payload).map((record) => ({
      ...record,
      employeeId: id,
    }));
    if (assignmentRecords.length > 0) {
      await tx.assignmentHistory.createMany({ data: assignmentRecords });
    }

    if (payload.pastServices.length > 0) {
      await tx.pastService.createMany({
        data: payload.pastServices.map((service) => ({ ...service, employeeId: id })),
      });
    }

    if (payload.education.length > 0) {
      await tx.education.createMany({
        data: payload.education.map((entry) => ({ ...entry, employeeId: id })),
      });
    }

    if (payload.postgraduateQualifications.length > 0) {
      await tx.postgraduateQualification.createMany({
        data: payload.postgraduateQualifications.map((entry) => ({
          ...entry,
          employeeId: id,
        })),
      });
    }

    if (payload.timeboundPromotions.length > 0) {
      await tx.timeboundPromotion.createMany({
        data: payload.timeboundPromotions.map((entry) => ({ ...entry, employeeId: id })),
      });
    }

    if (payload.administrativeRoles.length > 0) {
      await tx.administrativeRole.createMany({
        data: payload.administrativeRoles.map((entry) => ({ ...entry, employeeId: id })),
      });
    }

    if (payload.additionalCharges.length > 0) {
      await tx.additionalCharge.createMany({
        data: payload.additionalCharges.map((entry) => ({ ...entry, employeeId: id })),
      });
    }

    if (payload.achievements.length > 0) {
      await tx.achievement.createMany({
        data: payload.achievements.map((entry) => ({ ...entry, employeeId: id })),
      });
    }

    if (payload.documents.length > 0) {
      await tx.document.createMany({
        data: payload.documents.map((entry) => ({
          name: entry.name,
          sizeKB: entry.sizeKB ?? null,
          uploadedAt: entry.uploadedAt ? new Date(entry.uploadedAt) : null,
          downloadUrl: entry.downloadUrl ?? null,
          employeeId: id,
        })),
      });
    }

    if (payload.disciplinaryRecord) {
      await tx.disciplinaryRecord.create({
        data: { ...payload.disciplinaryRecord, employeeId: id },
      });
    }

    if (payload.serviceInformation) {
      await tx.serviceInformation.create({
        data: { ...payload.serviceInformation, employeeId: id },
      });
    }

    if (payload.appointmentDetails) {
      await tx.appointmentDetails.create({
        data: { ...payload.appointmentDetails, employeeId: id },
      });
    }

    await tx.declaration.create({
      data: {
        employeeId: id,
        empDeclAgreed: payload.empDeclAgreed,
        empDeclName: payload.empDeclName || null,
        empDeclDate: payload.empDeclDate || null,
        officerDeclAgreed: payload.officerDeclAgreed,
        officerDeclName: payload.officerDeclName || null,
        officerDeclDate: payload.officerDeclDate || null,
      },
    });

    return getEmployeeById(id);
  });
};

const createTransfer = async (employeeId, payload, userId) => {
  return prisma.$transaction(async (tx) => {
    const employee = await tx.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      throw new AppError("Employee not found", 404);
    }

    const currentAssignment = await tx.assignmentHistory.findFirst({
      where: { employeeId, endedOn: null },
      orderBy: { startedOn: "desc" },
    });

    if (currentAssignment) {
      await tx.assignmentHistory.update({
        where: { id: currentAssignment.id },
        data: {
          endedOn: payload.effectiveFrom,
          period: currentAssignment.period || formatPeriod(currentAssignment.startedOn, payload.effectiveFrom),
          type: currentAssignment.type === "current" ? "past" : currentAssignment.type,
        },
      });
    }

    await tx.assignmentHistory.create({
      data: {
        employeeId,
        role: employee.designation,
        city: payload.toCity,
        hospital: payload.toHospital || employee.currentInstitution,
        position: payload.toPosition,
        district: employee.currentDistrict,
        startedOn: payload.effectiveFrom,
        endedOn: null,
        period: formatPeriod(payload.effectiveFrom, null),
        type: "current",
      },
    });

    await tx.transfer.create({
      data: {
        employeeId,
        fromCity: employee.currentCityTownVillage,
        fromPosition: employee.currentPostHeld,
        toCity: payload.toCity,
        toPosition: payload.toPosition,
        effectiveFrom: payload.effectiveFrom,
        createdByUserId: userId,
      },
    });

    await tx.employee.update({
      where: { id: employeeId },
      data: {
        currentCityTownVillage: payload.toCity,
        currentPostHeld: payload.toPosition,
        currentInstitution: payload.toHospital || employee.currentInstitution,
        currentDesignation: payload.toPosition,
        yearsOfWork: calculateYearsFromDate(employee.dateOfEntry),
      },
    });

    return getEmployeeById(employeeId);
  });
};

module.exports = {
  listEmployees,
  getSuggestions,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  createTransfer,
};
