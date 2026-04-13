let io;

const init = (socketIo) => {
    io = socketIo;

    io.on('connection', (socket) => {
        console.log('Admin/Client connected to WebSocket:', socket.id);

        socket.on('join_admin', async (adminId) => {
            console.log(`🔌 [SocketService] Processing join_admin for ID: ${adminId}`);
            if (!adminId) {
                console.log('❌ [SocketService] join_admin failed: No adminId provided');
                return;
            }

            try {
                const Admin = require('../modules/admins/admin.model');
                const admin = await Admin.findById(adminId).populate('roleId');
                
                if (!admin) {
                    console.log(`❌ [SocketService] join_admin rejected: No admin found with ID ${adminId}`);
                    return;
                }
                if (!admin.roleId) {
                    console.log(`❌ [SocketService] join_admin rejected: Admin ${admin.name} has no role assigned`);
                    return;
                }

                const allowedRoles = ['Super Admin', 'Admin'];
                if (allowedRoles.includes(admin.roleId.name)) {
                    socket.join('admin_room');
                    console.log(`✅ [SocketService] Success: ${admin.name} (${admin.roleId.name}) joined admin_room`);
                } else {
                    console.log(`🚫 [SocketService] Rejected: ${admin.name} has insufficient role: ${admin.roleId.name}`);
                }
            } catch (err) {
                console.error('🔥 [SocketService] join_admin Error:', err.message);
            }
        });

        // Add user to their private room
        socket.on('join_user', async (userId) => {
            if (userId) {
                socket.join(`user_${userId}`);
                
                try {
                    const DeliveryBoy = require('../modules/deliveryBoy/deliveryBoy.model');
                    const Admin = require('../modules/admins/admin.model');

                    const boy = await DeliveryBoy.findById(userId);
                    if (boy) {
                        console.log(`✅ [SocketService] Delivery Boy: ${boy.firstName} joined for assignments (Socket: ${socket.id})`);
                        return;
                    }

                    const admin = await Admin.findById(userId).populate('roleId');
                    if (admin) {
                        console.log(`✅ [SocketService] Staff: ${admin.name} (${admin.roleId?.name || 'No Role'}) joined personal room`);
                        return;
                    }

                    console.log(`📡 [SocketService] User ${userId} joined personal room`);
                } catch (err) {
                    console.log(`📡 [SocketService] Socket ${socket.id} joined user_${userId}`);
                }
            }
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected from WebSocket');
        });
    });
};

const broadcastNewOrder = (order) => {
    if (io) {
        io.to('admin_room').emit('new_order', order);
        console.log('Broadcasted new order to admin_room');
    }
};

const emitToUser = (userId, event, data) => {
    if (io) {
        io.to(`user_${userId}`).emit(event, data);
        console.log(`Emitted ${event} to user_${userId}`);
    }
};

const broadcastToAdmin = (event, data) => {
    if (io) {
        io.to('admin_room').emit(event, data);
        console.log(`Broadcasted ${event} to admin_room`);
    }
};

module.exports = {
    init,
    broadcastNewOrder,
    emitToUser,
    broadcastToAdmin
};
