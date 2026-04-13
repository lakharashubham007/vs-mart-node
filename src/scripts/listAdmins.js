const mongoose = require('mongoose');
const User = require('../modules/users/user.model');
require('dotenv').config();

const listAdmins = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/vsmart');
        console.log('Connected to MongoDB');

        const admins = await User.find({ roleId: { $exists: true } });
        console.log('Admins found:', admins.map(u => ({ email: u.email, role: u.roleId })));
        process.exit(0);
    } catch (error) {
        console.error('Error listing admins:', error);
        process.exit(1);
    }
};

listAdmins();
