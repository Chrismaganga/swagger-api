import { validationResult } from 'express-validator';
import User from '../models/User.js';

export const register = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Email already registered'
            });
        }

        const user = new User(req.body);
        const token = await user.generateAuthToken();
        
        res.status(201).json({
            success: true,
            data: { user, token }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

export const login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user || !(await user.checkPassword(password))) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        const token = await user.generateAuthToken();
        
        res.json({
            success: true,
            data: { user, token }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

export const getProfile = async (req, res) => {
    try {
        res.json({
            success: true,
            data: req.user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const updates = Object.keys(req.body);
        const allowedUpdates = ['name', 'email'];
        const isValidOperation = updates.every(update => allowedUpdates.includes(update));

        if (!isValidOperation) {
            return res.status(400).json({
                success: false,
                error: 'Invalid updates'
            });
        }

        updates.forEach(update => req.user[update] = req.body[update]);
        await req.user.save();

        res.json({
            success: true,
            data: req.user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
