"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reviewController_1 = require("../controllers/reviewController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Specific routes (must be before generic :productId route)
// My reviews (buyer)
router.get('/my', auth_1.protect, (0, auth_1.authorize)('buyer'), reviewController_1.getMyReviews);
// Seller reviews
router.get('/seller/:sellerId', reviewController_1.getSellerReviews);
router.post('/seller/:sellerId', auth_1.protect, (0, auth_1.authorize)('buyer'), reviewController_1.addSellerReview);
// Mechanic reviews
router.get('/mechanic/:mechanicId', reviewController_1.getMechanicReviews);
router.post('/mechanic/:mechanicId', auth_1.protect, (0, auth_1.authorize)('buyer'), reviewController_1.addMechanicReview);
// Delete review
router.delete('/delete/:id', auth_1.protect, reviewController_1.deleteReview);
// Product reviews (generic route - should be last)
router.post('/:productId', auth_1.protect, (0, auth_1.authorize)('buyer'), reviewController_1.addReview);
router.get('/:productId', reviewController_1.getReviews);
exports.default = router;
