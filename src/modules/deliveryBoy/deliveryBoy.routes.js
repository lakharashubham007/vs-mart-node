const express = require('express');
const deliveryBoyController = require('./deliveryBoy.controller');
const deliveryAssignmentController = require('./deliveryAssignment.controller');
const upload = require('../../middlewares/upload.middleware');
const Authentication = require('../../middlewares/auth.middleware');
const Authorization = require('../../middlewares/authorization.middleware');

const router = express.Router();

// Assignment Routes
router.get('/assignments', Authentication, deliveryAssignmentController.getAssignments);
router.get('/assignments/stats', Authentication, deliveryAssignmentController.getStats);
router.get('/assignments/:id', Authentication, deliveryAssignmentController.getAssignmentById);
router.post('/assign-delivery', Authentication, deliveryAssignmentController.assignDelivery);
router.patch('/assignments/:id/status', Authentication, deliveryAssignmentController.updateAssignmentStatus);

// CRUD Routes
router.post('/create', upload.single('profileImage'), Authentication, deliveryBoyController.createDeliveryBoy);
router.get('/list', Authentication, deliveryBoyController.getDeliveryBoys);
router.get('/:id', Authentication, deliveryBoyController.getDeliveryBoyById);
router.put('/update/:id', upload.single('profileImage'), Authentication, deliveryBoyController.updateDeliveryBoy);
router.delete('/delete/:id', Authentication, deliveryBoyController.deleteDeliveryBoy);
router.patch('/toggle-status/:id', Authentication, deliveryBoyController.toggleStatus);
router.patch('/update-fcm-token/:id', Authentication, deliveryBoyController.updateFcmToken);

module.exports = router;
