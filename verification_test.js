/**
 * verification_test.js
 * 
 * Verifying that all functions are exported and don't have syntax errors.
 */

const notificationService = require('./src/services/notification.service');
const socketService = require('./src/utils/socketService');

console.log('Testing exports...');

if (typeof notificationService.notifyAllAdmins === 'function') {
    console.log('✅ notificationService.notifyAllAdmins exists');
} else {
    console.error('❌ notificationService.notifyAllAdmins is MISSING');
}

if (typeof socketService.broadcastNewOrder === 'function') {
    console.log('✅ socketService.broadcastNewOrder exists');
} else {
    console.error('❌ socketService.broadcastNewOrder is MISSING');
}

if (typeof socketService.broadcastToAdmin === 'function') {
    console.log('✅ socketService.broadcastToAdmin exists');
} else {
    console.error('❌ socketService.broadcastToAdmin is MISSING');
}

console.log('Verification check complete (Syntax/Export level).');
