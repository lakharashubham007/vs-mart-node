const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const Authentication = require('../../middlewares/auth.middleware');
const Authorization = require('../../middlewares/authorization.middleware');
const upload = require('../../middlewares/upload.middleware');

// All routes are protected by Authentication & Authorization
router.post('/create-admin', Authentication, Authorization, upload.single('profileImage'), adminController.createAdmin);
router.get('/get-admins', Authentication, Authorization, adminController.getAdmins);
router.get('/get-admin/:id', Authentication, Authorization, adminController.getAdminById);
router.put('/update-admin/:id', Authentication, Authorization, upload.single('profileImage'), adminController.updateAdmin);
router.delete('/delete-admin/:id', Authentication, Authorization, adminController.deleteAdmin);

module.exports = router;
