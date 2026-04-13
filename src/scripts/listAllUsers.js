const mongoose = require('mongoose');
const User = require('../modules/users/user.model');
require('dotenv').config();

const listAllUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/vsmart');
        console.log('Connected to MongoDB');

        const users = await User.find({}).limit(10);
        console.log('Users found:', users.map(u => ({ email: u.email, roleId: u.roleId, role: u.role })));
        process.exit(0);
    } catch (error) {
        console.error('Error listing users:', error);
        process.exit(1);
    }
};

listAllUsers();
