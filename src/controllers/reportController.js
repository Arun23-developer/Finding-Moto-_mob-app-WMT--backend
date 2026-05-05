"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminBlockReportedAccount = exports.adminUpdateReportStatus = exports.adminGetReport = exports.adminListReports = exports.createReport = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Report_1 = __importDefault(require("../models/Report"));
const User_1 = __importDefault(require("../models/User"));
const Product_1 = __importDefault(require("../models/Product"));
const Service_1 = __importDefault(require("../models/Service"));
const Delivery_1 = __importDefault(require("../models/Delivery"));
const Order_1 = __importDefault(require("../models/Order"));
const notifications_1 = require("../utils/notifications");
const isObjectId = (value) => mongoose_1.default.Types.ObjectId.isValid(value);
// @desc    Create a marketplace report
// @route   POST /api/reports
// @access  Private
const createReport = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const reporterRole = req.user.role;
        if (!['buyer', 'seller', 'mechanic', 'delivery_agent'].includes(reporterRole)) {
            res.status(403).json({ message: 'Your account is not allowed to submit reports' });
            return;
        }
        const { category, targetId, reason } = req.body;
        if (!category || !targetId || !reason?.trim()) {
            res.status(400).json({ message: 'category, targetId and reason are required' });
            return;
        }
        if (!['ACCOUNT', 'PRODUCT', 'SERVICE', 'DELIVERY'].includes(category)) {
            res.status(400).json({ message: 'Invalid report category' });
            return;
        }
        // Role-based permissions
        if (reporterRole === 'buyer') {
            if (!['ACCOUNT', 'PRODUCT', 'SERVICE'].includes(category)) {
                res.status(403).json({ message: 'Buyers can only report accounts, products, or services' });
                return;
            }
        }
        if (reporterRole === 'seller' || reporterRole === 'mechanic') {
            if (!['ACCOUNT', 'DELIVERY'].includes(category)) {
                res.status(403).json({ message: 'Sellers and mechanics can only report delivery agents or delivery behavior' });
                return;
            }
        }
        if (reporterRole === 'delivery_agent' && category !== 'ACCOUNT') {
            res.status(403).json({ message: 'Delivery agents can only report accounts' });
            return;
        }
        if (!isObjectId(targetId)) {
            res.status(400).json({ message: 'Invalid targetId' });
            return;
        }
        const trimmedReason = reason.trim().slice(0, 500);
        let reportedUserId = null;
        let reportedProductId = null;
        let reportedServiceId = null;
        let reportedDeliveryId = null;
        if (category === 'ACCOUNT') {
            const targetUser = await User_1.default.findById(targetId);
            if (!targetUser) {
                res.status(404).json({ message: 'Reported account not found' });
                return;
            }
            if (!['buyer', 'seller', 'mechanic', 'delivery_agent'].includes(targetUser.role)) {
                res.status(400).json({ message: 'Only buyer, seller, mechanic, or delivery agent accounts can be reported' });
                return;
            }
            // Role-based target enforcement
            if (reporterRole === 'buyer') {
                // buyer can report seller/mechanic/delivery_agent (already checked)
            }
            else if (reporterRole === 'seller' || reporterRole === 'mechanic') {
                // seller/mechanic can only report delivery agent accounts
                if (targetUser.role !== 'delivery_agent') {
                    res.status(403).json({ message: 'You can only report delivery agent accounts' });
                    return;
                }
            }
            else if (reporterRole === 'delivery_agent') {
                if (!['buyer', 'seller', 'mechanic'].includes(targetUser.role)) {
                    res.status(403).json({ message: 'Delivery agents can report buyer, seller, or mechanic accounts only' });
                    return;
                }
            }
            reportedUserId = targetUser._id;
        }
        if (category === 'PRODUCT') {
            if (reporterRole !== 'buyer') {
                res.status(403).json({ message: 'Only buyers can report products' });
                return;
            }
            const product = await Product_1.default.findById(targetId);
            if (!product) {
                res.status(404).json({ message: 'Reported product not found' });
                return;
            }
            const sellerUser = await User_1.default.findById(product.seller).select('role');
            if (!sellerUser || !['seller', 'mechanic'].includes(sellerUser.role)) {
                res.status(400).json({ message: 'Only seller or mechanic products can be reported' });
                return;
            }
            reportedUserId = product.seller;
            reportedProductId = product._id;
        }
        if (category === 'SERVICE') {
            if (reporterRole !== 'buyer') {
                res.status(403).json({ message: 'Only buyers can report services' });
                return;
            }
            const service = await Service_1.default.findById(targetId);
            if (!service) {
                res.status(404).json({ message: 'Reported service not found' });
                return;
            }
            const mechanicUser = await User_1.default.findById(service.mechanic).select('role');
            if (!mechanicUser || mechanicUser.role !== 'mechanic') {
                res.status(400).json({ message: 'Only mechanic services can be reported' });
                return;
            }
            reportedUserId = service.mechanic;
            reportedServiceId = service._id;
        }
        if (category === 'DELIVERY') {
            if (reporterRole !== 'seller' && reporterRole !== 'mechanic') {
                res.status(403).json({ message: 'Only sellers and mechanics can report delivery behavior' });
                return;
            }
            const delivery = await Delivery_1.default.findById(targetId);
            if (!delivery) {
                res.status(404).json({ message: 'Reported delivery not found' });
                return;
            }
            // Must be related to the underlying order (unless admin, which is not allowed to create reports here)
            const order = await Order_1.default.findById(delivery.orderId).select('seller');
            if (!order || order.seller.toString() !== req.user._id.toString()) {
                res.status(403).json({ message: 'You can only report deliveries for your own orders' });
                return;
            }
            reportedUserId = delivery.agentId;
            reportedDeliveryId = delivery._id;
        }
        if (!reportedUserId) {
            res.status(400).json({ message: 'Unable to determine reported user' });
            return;
        }
        if (reportedUserId.toString() === req.user._id.toString()) {
            res.status(400).json({ message: 'You cannot report your own account' });
            return;
        }
        const report = await Report_1.default.create({
            category,
            reason: trimmedReason,
            reportedBy: req.user._id,
            reportedUser: reportedUserId,
            reportedProduct: reportedProductId,
            reportedService: reportedServiceId,
            reportedDelivery: reportedDeliveryId,
        });
        await (0, notifications_1.notifyRole)('admin', {
            category: reporterRole === 'buyer' ? 'COMPLAINT' : 'REPORT',
            title: `New ${category.toLowerCase()} report`,
            message: `${req.user.role} submitted a report: ${trimmedReason}`,
            link: '/admin/reports',
            metadata: {
                source: 'report',
                reportId: report._id,
                category,
                reporterRole,
                reportedUserId,
            },
        });
        res.status(201).json({
            success: true,
            message: 'Report submitted successfully',
            report,
        });
    }
    catch (error) {
        console.error('createReport error:', error);
        res.status(500).json({ message: 'Failed to submit report' });
    }
};
exports.createReport = createReport;
// @desc    Admin: list reports
// @route   GET /api/admin/reports
// @access  Private/Admin
const adminListReports = async (req, res) => {
    try {
        const { category, status, reportedUserRole } = req.query;
        const filter = {};
        if (category)
            filter.category = category;
        if (status)
            filter.status = status;
        let reportedUserIds;
        if (reportedUserRole) {
            const users = await User_1.default.find({ role: reportedUserRole }).select('_id');
            reportedUserIds = users.map((u) => u._id);
            filter.reportedUser = { $in: reportedUserIds };
        }
        const reports = await Report_1.default.find(filter)
            .sort({ createdAt: -1 })
            .populate('reportedUser', 'firstName lastName fullName email role isActive approvalStatus')
            .populate('reportedBy', 'firstName lastName fullName email role')
            .populate('reviewedBy', 'firstName lastName fullName email role')
            .populate('reportedProduct', 'name price')
            .populate('reportedService', 'name price duration')
            .populate({ path: 'reportedDelivery', select: 'orderId agentId status createdAt', populate: { path: 'agentId', select: 'fullName email role' } });
        res.json({ success: true, data: reports });
    }
    catch (error) {
        console.error('adminListReports error:', error);
        res.status(500).json({ message: 'Failed to load reports' });
    }
};
exports.adminListReports = adminListReports;
// @desc    Admin: get report
// @route   GET /api/admin/reports/:reportId
// @access  Private/Admin
const adminGetReport = async (req, res) => {
    try {
        const { reportId } = req.params;
        if (!isObjectId(reportId)) {
            res.status(400).json({ message: 'Invalid report id' });
            return;
        }
        const report = await Report_1.default.findById(reportId)
            .populate('reportedUser', 'firstName lastName fullName email role isActive approvalStatus phone address')
            .populate('reportedBy', 'firstName lastName fullName email role')
            .populate('reviewedBy', 'firstName lastName fullName email role')
            .populate('reportedProduct', 'name price description')
            .populate('reportedService', 'name price duration description')
            .populate({ path: 'reportedDelivery', select: 'orderId agentId status statusHistory createdAt', populate: { path: 'agentId', select: 'fullName email role' } });
        if (!report) {
            res.status(404).json({ message: 'Report not found' });
            return;
        }
        res.json({ success: true, data: report });
    }
    catch (error) {
        console.error('adminGetReport error:', error);
        res.status(500).json({ message: 'Failed to load report' });
    }
};
exports.adminGetReport = adminGetReport;
// @desc    Admin: update report status
// @route   PUT /api/admin/reports/:reportId/status
// @access  Private/Admin
const adminUpdateReportStatus = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const { reportId } = req.params;
        const { status, adminNotes } = req.body;
        if (!isObjectId(reportId)) {
            res.status(400).json({ message: 'Invalid report id' });
            return;
        }
        if (!status || !['RESOLVED', 'REJECTED'].includes(status)) {
            res.status(400).json({ message: 'Invalid status. Use RESOLVED or REJECTED.' });
            return;
        }
        const report = await Report_1.default.findById(reportId);
        if (!report) {
            res.status(404).json({ message: 'Report not found' });
            return;
        }
        report.status = status;
        report.adminAction = status === 'RESOLVED' ? 'RESOLVED' : 'REJECTED';
        report.reviewedBy = req.user._id;
        report.reviewedAt = new Date();
        if (typeof adminNotes === 'string')
            report.adminNotes = adminNotes.trim().slice(0, 1000);
        await report.save();
        res.json({ success: true, message: 'Report updated', data: report });
    }
    catch (error) {
        console.error('adminUpdateReportStatus error:', error);
        res.status(500).json({ message: 'Failed to update report' });
    }
};
exports.adminUpdateReportStatus = adminUpdateReportStatus;
// @desc    Admin: block reported user account from report
// @route   PUT /api/admin/reports/:reportId/block
// @access  Private/Admin
const adminBlockReportedAccount = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const { reportId } = req.params;
        if (!isObjectId(reportId)) {
            res.status(400).json({ message: 'Invalid report id' });
            return;
        }
        const report = await Report_1.default.findById(reportId);
        if (!report) {
            res.status(404).json({ message: 'Report not found' });
            return;
        }
        const user = await User_1.default.findById(report.reportedUser);
        if (!user) {
            res.status(404).json({ message: 'Reported user not found' });
            return;
        }
        user.isActive = false;
        user.active_status = 'DISABLED';
        if (user.role === 'delivery_agent') {
            user.agent_status = 'DISABLED';
        }
        await user.save();
        report.status = 'RESOLVED';
        report.adminAction = 'BLOCKED_ACCOUNT';
        report.reviewedBy = req.user._id;
        report.reviewedAt = new Date();
        await report.save();
        res.json({
            success: true,
            message: 'Account blocked and report resolved',
            data: { report, user: { _id: user._id, isActive: user.isActive, role: user.role } },
        });
    }
    catch (error) {
        console.error('adminBlockReportedAccount error:', error);
        res.status(500).json({ message: 'Failed to block account' });
    }
};
exports.adminBlockReportedAccount = adminBlockReportedAccount;
