"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    const error = { ...err };
    error.message = err.message;
    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = 'Resource not found';
        error.message = message;
        error.statusCode = 404;
    }
    // Mongoose duplicate key
    if (err.code === 11000) {
        const message = 'Duplicate field value entered';
        error.message = message;
        error.statusCode = 400;
    }
    // Mongoose validation error
    if (err.name === 'ValidationError' && err.errors) {
        const message = Object.values(err.errors).map(val => val.message);
        error.message = message.join(', ');
        error.statusCode = 400;
    }
    res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Server Error'
    });
};
exports.errorHandler = errorHandler;
