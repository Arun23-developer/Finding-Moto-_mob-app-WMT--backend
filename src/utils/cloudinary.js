"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadImageBuffer = void 0;
const cloudinary_1 = require("cloudinary");
const config_1 = __importDefault(require("../config"));
const isConfigured = Boolean(config_1.default.cloudinaryCloudName && config_1.default.cloudinaryApiKey && config_1.default.cloudinaryApiSecret);
if (isConfigured) {
    cloudinary_1.v2.config({
        cloud_name: config_1.default.cloudinaryCloudName,
        api_key: config_1.default.cloudinaryApiKey,
        api_secret: config_1.default.cloudinaryApiSecret,
        secure: true,
    });
}
const uploadImageBuffer = (buffer, folder) => {
    if (!isConfigured) {
        return Promise.reject(new Error('Cloudinary is not configured'));
    }
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary_1.v2.uploader.upload_stream({
            folder,
            resource_type: 'image',
            transformation: [{ fetch_format: 'auto', quality: 'auto' }],
        }, (error, result) => {
            if (error) {
                reject(error);
                return;
            }
            const secureUrl = result?.secure_url;
            if (!secureUrl) {
                reject(new Error('Cloudinary upload did not return a secure URL'));
                return;
            }
            resolve(secureUrl);
        });
        uploadStream.end(buffer);
    });
};
exports.uploadImageBuffer = uploadImageBuffer;
