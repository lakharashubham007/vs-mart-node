const mongoose = require('mongoose');
const User = require('../modules/users/user.model');
require('dotenv').config();

const findSpecificAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/vsmart');
        console.log('Connected to MongoDB');

        const user = await User.findOne({ email: 'admin@vs.com' });
        if (user) {
            console.log('Admin user found:', JSON.stringify(user, null, 2));
        } else {
            console.log('Admin user NOT found by email.');
            // Try searching by part of email
            const partial = await User.find({ email: /admin/i });
            console.log('Partial matches:', partial.map(u => u.email));
        }
        process.exit(0);
    } catch (error) {
        console.error('Error finding user:', error);
        process.exit(1);
    }
};

findSpecificAdmin();
