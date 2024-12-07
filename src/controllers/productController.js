import { validationResult } from 'express-validator';
import Product from '../models/Product.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';

export const createProduct = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const product = new Product(req.body);
        
        // Handle image uploads if files are present
        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(file => uploadToCloudinary(file.buffer));
            const uploadedImages = await Promise.all(uploadPromises);
            
            product.images = uploadedImages.map(image => ({
                url: image.secure_url,
                public_id: image.public_id
            }));
        }

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
                await deleteFromCloudinary(image.public_id);
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

        // Upload new images
        const uploadPromises = req.files.map(file => uploadToCloudinary(file.buffer));
        const uploadedImages = await Promise.all(uploadPromises);
        
        const newImages = uploadedImages.map(image => ({
            url: image.secure_url,
            public_id: image.public_id
        }));

        // Add new images to product
        product.images.push(...newImages);
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

export const deleteProductImage = async (req, res) => {
    try {
        const { id, imageId } = req.params;

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        // Find the image to delete
        const imageToDelete = product.images.find(img => img._id.toString() === imageId);
        if (!imageToDelete) {
            return res.status(404).json({
                success: false,
                error: 'Image not found'
            });
        }

        // Delete from Cloudinary
        if (imageToDelete.public_id) {
            await deleteFromCloudinary(imageToDelete.public_id);
        }

        // Remove image from product
        product.images = product.images.filter(img => img._id.toString() !== imageId);
        await product.save();

        res.status(200).json({
            success: true,
            message: 'Image deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

export const updateProductImages = async (req, res) => {
    try {
        const { id } = req.params;
        const { imagesToDelete } = req.body;

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        // Delete specified images
        if (imagesToDelete && imagesToDelete.length > 0) {
            const deletePromises = imagesToDelete.map(async (imageId) => {
                const image = product.images.find(img => img._id.toString() === imageId);
                if (image && image.public_id) {
                    await deleteFromCloudinary(image.public_id);
                }
            });
            await Promise.all(deletePromises);
            product.images = product.images.filter(img => !imagesToDelete.includes(img._id.toString()));
        }

        // Upload new images if any
        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(file => uploadToCloudinary(file.buffer));
            const uploadedImages = await Promise.all(uploadPromises);
            
            const newImages = uploadedImages.map(image => ({
                url: image.secure_url,
                public_id: image.public_id
            }));

            product.images.push(...newImages);
        }

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
