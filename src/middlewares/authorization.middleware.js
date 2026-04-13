const models = require("../models");

const Authorization = async (req, res, next) => {
    try {
        // Step 1 - Use pre-populated role from Authentication middleware
        const role = req.user.roleId;

        if (!role || !role.permissionIds || role.permissionIds.length === 0) {
            // Special case: Allow Super Admin to bypass permission checks if permissions aren't explicitly assigned
            if (role && role.name === 'Super Admin') {
                return next();
            }

            return res.status(401).json({
                success: false,
                message: `You do not have sufficient permissions to perform this action. Please contact your administrator for permissions.`
            });
        }

        // Master bypass for Super Admin
        if (role.name === 'Super Admin') {
            return next();
        }

        // Step 2 - Extract the action segment of the URL
        // Remove query parameters
        const urlPath = req.originalUrl.split('?')[0];
        const segments = urlPath.split('/').filter(segment => segment.length > 0);

        // URL is typically /v1/private/[module_name]/[action]
        // We want the module_name to check against permitted routes (e.g., 'terms', 'privacy', 'products')
        let actionSegment = segments.length > 2 ? segments[2] : segments[segments.length - 1];

        // Failsafe: if the segment is somehow an ID (unlikely at index 2, but just in case)
        if (actionSegment.match(/^[0-9a-fA-F]{24}$/) && segments.length > 3) {
            actionSegment = segments[3];
        }

        // Step 3 - Get all permitted routes for the user role
        const permittedRoutes = role.permissionIds.map(permission => permission.route);

        // Step 4 - Check if the current action segment is authorized
        if (permittedRoutes.includes(actionSegment)) {
            next();
        } else {
            return res.status(403).json({
                success: false,
                message: `You are not authorized for this action! (${actionSegment})`,
            });
        }

    } catch (error) {
        console.error('Authorization error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};


module.exports = Authorization;
