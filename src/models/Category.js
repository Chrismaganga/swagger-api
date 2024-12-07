import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        unique: true,
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Category description is required']
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    image: {
        url: String,
        public_id: String
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, {
    timestamps: true
});

// Create slug before saving
categorySchema.pre('save', function(next) {
    this.slug = this.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-');
    next();
});

const Category = mongoose.model('Category', categorySchema);
export default Category;
