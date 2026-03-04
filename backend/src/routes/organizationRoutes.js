import express from "express";
<<<<<<< HEAD
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
=======
import { protect, authorizeRoles } from "../middlewear/authMiddleware.js";
>>>>>>> 92be4607cb51a4f989312801a582250f183951c4
import {
  createOrganizationProfile,
  getOrganizationProfileById,
  getOrganizationProfiles,
  updateOrganizationProfile,
  uploadOrganizationDocument,
  deleteOrganizationProfile,
} from "../controllers/organizationController.js";

const router = express.Router();

// Create organization profile - organization users only
router.post(
  "/organizations",
  protect,
  authorizeRoles("organization"),
  createOrganizationProfile
);

// Get single organization profile
router.get(
  "/organizations/:id",
  protect,
  authorizeRoles("organization", "admin"),
  getOrganizationProfileById
);

// Get organization profiles list
router.get(
  "/organizations",
  protect,
  authorizeRoles("organization", "admin"),
  getOrganizationProfiles
);

// Update organization profile
router.put(
  "/organizations/:id",
  protect,
  authorizeRoles("organization", "admin"),
  updateOrganizationProfile
);

// Upload organization documents (logo, verification papers)
router.post(
  "/organizations/:id/documents",
  protect,
  authorizeRoles("organization", "admin"),
  uploadOrganizationDocument
);

// Delete organization profile
router.delete(
  "/organizations/:id",
  protect,
  authorizeRoles("organization", "admin"),
  deleteOrganizationProfile
);

export default router;
<<<<<<< HEAD
=======

>>>>>>> 92be4607cb51a4f989312801a582250f183951c4
