import { validationResult } from 'express-validator';
import Product from '../models/Product.js';
import cloudinary from '../config/cloudinary.js';

export const createProduct = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const product = new Product(req.body);
        await product.save();
        
        res.status(201).json({
            success: true,
            data: product
        });
    } catch (error) {
        if (error.code === 11000) { // Duplicate key error
            return res.status(400).json({
                success: false,
                error: 'Product with this SKU already exists'
            });
        }
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

export const getAllProducts = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            category,
            minPrice,
            maxPrice,
            status,
            sort = '-createdAt'
        } = req.query;

        const query = {};

        if (category) query.category = category;
        if (status) query.status = status;
        if (minPrice || maxPrice) {
            query.finalPrice = {};
            if (minPrice) query.finalPrice.$gte = Number(minPrice);
            if (maxPrice) query.finalPrice.$lte = Number(maxPrice);
        }

        const products = await Product.find(query)
            .populate('category', 'name')
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Product.countDocuments(query);

        res.status(200).json({
            success: true,
            data: products,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

export const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('category', 'name')
            .populate('ratings.user', 'name');

        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        res.status(200).json({
            success: true,
            data: product
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

export const updateProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        res.status(200).json({
            success: true,
            data: product
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        // Delete images from cloudinary
        for (const image of product.images) {
            if (image.public_id) {
                await cloudinary.uploader.destroy(image.public_id);
            }
        }

        await product.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

export const uploadProductImages = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Please upload at least one image'
            });
        }

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        const uploadPromises = req.files.map(file => {
            return new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'products',
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve({
                            url: result.secure_url,
                            public_id: result.public_id
                        });
                    }
                );

                uploadStream.end(file.buffer);
            });
        });

        const uploadedImages = await Promise.all(uploadPromises);
        product.images.push(...uploadedImages);
        await product.save();

        res.status(200).json({
            success: true,
            data: product
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

export const addProductRating = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        // Check if user has already rated
        const existingRatingIndex = product.ratings.findIndex(
            rating => rating.user.toString() === req.user._id.toString()
        );

        if (existingRatingIndex >= 0) {
            // Update existing rating
            product.ratings[existingRatingIndex] = {
                user: req.user._id,
                rating: req.body.rating,
                review: req.body.review,
                date: Date.now()
            };
        } else {
            // Add new rating
            product.ratings.push({
                user: req.user._id,
                rating: req.body.rating,
                review: req.body.review
            });
        }

        await product.updateAverageRating();

        res.status(200).json({
            success: true,
            data: product
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
