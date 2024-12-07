import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Product description is required']
    },
    price: {
        type: Number,
        required: [true, 'Product price is required'],
        min: 0
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    images: [{
        url: String,
        public_id: String
    }],
    quantity: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'outOfStock'],
        default: 'active'
    },
    discount: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    finalPrice: {
        type: Number,
        min: 0
    },
    sku: {
        type: String,
        unique: true,
        required: true
    },
    features: [String],
    ratings: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        review: String,
        date: {
            type: Date,
            default: Date.now
        }
    }],
    averageRating: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Calculate final price before saving
productSchema.pre('save', function(next) {
    if (this.discount > 0) {
        this.finalPrice = this.price - (this.price * (this.discount / 100));
    } else {
        this.finalPrice = this.price;
    }
    next();
});

// Update average rating when a new rating is added
productSchema.methods.updateAverageRating = function() {
    if (this.ratings.length === 0) {
        this.averageRating = 0;
    } else {
        const sum = this.ratings.reduce((acc, item) => acc + item.rating, 0);
        this.averageRating = sum / this.ratings.length;
    }
    return this.save();
};

const Product = mongoose.model('Product', productSchema);
export default Product;
