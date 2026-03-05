
import Internship from "../models/internship.js";
import { getCoordinates } from "../utils/geocode.js";

// Service function to create a new internship
export const createInternship = async (data, organizationId) => {
  let coordinates;

  if (data.location) {
    const coords = await getCoordinates(data.location);
    if (coords) {
      coordinates = {
        type: "Point",
        coordinates: [coords.lng, coords.lat] // GeoJSON: lng first
      };
    }
  }

  const internship = await Internship.create({
    ...data,
    organizationId,
    ...(coordinates && { coordinates }) // only add if geocoding succeeded
  });

  return internship;
};

//without opencage integration
// Service function to create a new internship
/*export const createInternship = async (data, organizationId) => {
  const internship = await Internship.create({
    ...data,
    organizationId,
  });

  return internship;
};*/

// Service function to update an existing internship
export const updateInternship = async (data, internshipId, organizationId) => {
  // Re-geocode only if location is being updated
  if (data.location) {
    const coords = await getCoordinates(data.location);
    if (coords) {
      data.coordinates = {
        type: "Point",
        coordinates: [coords.lng, coords.lat]
      };
    }
  }

  const internship = await Internship.findOneAndUpdate(
    { _id: internshipId, organizationId },
    data,
    { returnDocument: "after" }
  );

  return internship;
};

/*export const updateInternship = async (
  data, 
  internshipId,
  organizationId
) => {
  const internship = await Internship.findOneAndUpdate(
    {_id : internshipId, organizationId},
    data,
    {returnDocument: 'after'}
  );
  return internship;
};**/

//Service function to delete an internship
export const deleteInternship = async (
  internshipId,
   organizationId
  ) => {
  const internship = await Internship.findOneAndDelete(
    {_id : internshipId, organizationId}
  );
  return internship;
};

//Get Single Internship
export const getInternshipByIdService = async (internshipId) => {
  const internship = await Internship.findById(internshipId);
  
  if (!internship) {
    throw new Error("Internship not found");
  }

  return internship;
};

//Get All Internships
export const getMyInternshipsService = async (organizationId, status) => {

  const filter = { organizationId };

  if (status) {
    filter.status = status;
  }

  const internships = await Internship
    .find(filter)
    .sort({ createdAt: -1 });

  const count = await Internship.countDocuments(filter);

  return {
    count,
    internships
  };
};

//Service function for increament view count
export const incrementViewCountService = async (internshipId) => {
  const internship = await Internship.findByIdAndUpdate(
    internshipId,
    { $inc: { viewCount: 1 } },// Increment view count by 1
    { new: true }
  );

  if (!internship) {
    throw new Error("Internship not found");
  }

  return internship;
};

//Dashboard Stats
export const getDashboardStatsService = async (organizationId) => {
  const totalInternships = await Internship.countDocuments({
    organizationId,
  });

  const activeInternships = await Internship.countDocuments({
    organizationId,
    status: "Active",
  });

  const closedInternships = await Internship.countDocuments({
    organizationId,
    status: "Closed",
  });

  const internships = await Internship.find({ organizationId });

  const totalViews = internships.reduce(
    (sum, internship) => sum + internship.viewCount,
    0
  );

  const totalApplicants = internships.reduce(
    (sum, internship) => sum + internship.totalApplicants,
    0
  );

  const acceptedCount = internships.reduce(
    (sum, internship) => sum + internship.acceptedCount,
    0
  );

  const acceptanceRate =
    totalApplicants > 0
      ? ((acceptedCount / totalApplicants) * 100).toFixed(2)
      : 0;

  return {
    totalInternships,
    activeInternships,
    closedInternships,
    totalViews,
    totalApplicants,
    acceptanceRate,
  };
};

//Search functionality for internships
export const searchInternshipsService = async (queryParams) => {
  const {
    keyword,
    skills,
    education,
    status,
    location,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    order = "desc"
  } = queryParams;

  let filter = {};

  // 🔎 Keyword search (title + description)
  if (keyword) {
    filter.$or = [
      { tittle: { $regex: keyword, $options: "i" } },
      { description: { $regex: keyword, $options: "i" } }
    ];
  }

  // 🛠 Skills filter (comma separated)
  if (skills) {
    filter.requiredSkills = { $in: skills.split(",") };
  }

  // 🎓 Education filter
  if (education) {
    filter.requiredEducation = education;
  }

  // 📌 Status filter
  if (status) {
    filter.status = status;
  }

// 📍 Location filter — using $geoWithin instead of $near
if (location) {
  const coords = await getCoordinates(location);

  if (coords) {
    const radiusInRadians = 50 / 6378.1; // 50km converted to radians

    filter.coordinates = {
      $geoWithin: {
        $centerSphere: [
          [coords.lng, coords.lat], // [longitude, latitude]
          radiusInRadians
        ]
      }
    };
  } else {
    // Fallback → plain text match if geocoding fails
    filter.location = { $regex: location, $options: "i" };
  }
}

  // Pagination
  const skip = (page - 1) * limit;

  // Sorting
  const sortOrder = order === "asc" ? 1 : -1;

  const internships = await Internship.find(filter)
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Internship.countDocuments(filter);

  return {
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / limit),
    internships
  };
};