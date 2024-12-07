import { Router } from 'express';
import { body } from 'express-validator';
import {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    addProductRating,
    uploadProductImages,
    deleteProductImage,
    updateProductImages
} from '../controllers/productController.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - price
 *         - category
 *         - quantity
 *         - sku
 *       properties:
 *         name:
 *           type: string
 *           description: Product name
 *         description:
 *           type: string
 *           description: Product description
 *         price:
 *           type: number
 *           description: Product price
 *         category:
 *           type: string
 *           description: Category ID
 *         images:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *               public_id:
 *                 type: string
 *         quantity:
 *           type: number
 *           description: Available quantity
 *         status:
 *           type: string
 *           enum: [active, inactive, outOfStock]
 *         discount:
 *           type: number
 *           description: Discount percentage
 *         sku:
 *           type: string
 *           description: Stock keeping unit
 */

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     security:
 *       - bearerAuth: []
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               category:
 *                 type: string
 *               quantity:
 *                 type: number
 *               sku:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Product created successfully
 */
router.post('/',
    authenticate,
    authorizeAdmin,
    upload.array('images', 5),
    [
        body('name').trim().notEmpty().withMessage('Product name is required'),
        body('description').trim().notEmpty().withMessage('Description is required'),
        body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
        body('category').isMongoId().withMessage('Valid category ID is required'),
        body('quantity').isInt({ min: 0 }).withMessage('Valid quantity is required'),
        body('sku').trim().notEmpty().withMessage('SKU is required')
    ],
    createProduct
);

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price
 *     responses:
 *       200:
 *         description: List of products
 */
router.get('/', getAllProducts);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 */
router.get('/:id', getProductById);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update product
 *     security:
 *       - bearerAuth: []
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       200:
 *         description: Product updated successfully
 */
router.put('/:id', authenticate, authorizeAdmin, updateProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete product
 *     security:
 *       - bearerAuth: []
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted successfully
 */
router.delete('/:id', authenticate, authorizeAdmin, deleteProduct);

/**
 * @swagger
 * /api/products/{id}/images:
 *   post:
 *     summary: Upload product images
 *     security:
 *       - bearerAuth: []
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Images uploaded successfully
 */
router.post('/:id/images',
    authenticate,
    authorizeAdmin,
    upload.array('images', 5),
    uploadProductImages
);

/**
 * @swagger
 * /api/products/{id}/images/{imageId}:
 *   delete:
 *     summary: Delete a product image
 *     security:
 *       - bearerAuth: []
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Image deleted successfully
 */
router.delete('/:id/images/:imageId',
    authenticate,
    authorizeAdmin,
    deleteProductImage
);

/**
 * @swagger
 * /api/products/{id}/images:
 *   put:
 *     summary: Update product images (delete existing and/or add new)
 *     security:
 *       - bearerAuth: []
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               imagesToDelete:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Images updated successfully
 */
router.put('/:id/images',
    authenticate,
    authorizeAdmin,
    upload.array('images', 5),
    updateProductImages
);

/**
 * @swagger
 * /api/products/{id}/ratings:
 *   post:
 *     summary: Add product rating
 *     security:
 *       - bearerAuth: []
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               review:
 *                 type: string
 *     responses:
 *       200:
 *         description: Rating added successfully
 */
router.post('/:id/ratings',
    authenticate,
    [
        body('rating').isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
        body('review').optional().trim().isLength({ min: 10 }).withMessage('Review must be at least 10 characters')
    ],
    addProductRating
);

export default router;
