const express = require("express");
const cors = require("cors");
const httpStatus = require("http-status").status;
const ApiError = require("./utils/ApiError");
const helmet = require("helmet");
const authRoutes = require('./modules/auth/auth.routes');
const publicRoutes = require('./routes/v1/public');
const privateRoutes = require('./routes/v1/private');
const adminRoutes = require('./routes/v1/admin');

const app = express();

// enable cors
app.use(cors());
app.options(/.*/, cors());

// Health check route for network discovery
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Configure Helmet with custom CSP and CORS settings
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
        contentSecurityPolicy: {
            directives: {
                ...helmet.contentSecurityPolicy.getDefaultDirectives(),
                "img-src": ["'self'", "data:", "*"],
                "frame-ancestors": ["*"],
            },
        },
    })
);

app.use('/uploads', express.static('uploads'));

//parse json request body
app.use(express.json());
//parse urlencoded request body
app.use(express.urlencoded({ extended: true }));


// Use public routes for /v1
app.use('/v1/public', publicRoutes); // Public routes

// Auth and Private routes for /v1
app.use('/v1/auth', authRoutes); // Auth routes (login, etc)
app.use('/v1/private', privateRoutes); // Private routes
app.use('/v1/admin', adminRoutes); // Admin Analytics routes

//Api routes
app.use((req, res, next) => {
    next(new ApiError(httpStatus.NOT_FOUND, "Not found"));
});

// handle error
app.use((err, req, res, next) => {
    let { statusCode, message } = err;
    if (!statusCode || typeof statusCode !== 'number') statusCode = 500;

    res.locals.errorMessage = err.message;

    const response = {
        code: statusCode,
        message,
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    };

    if (process.env.NODE_ENV === "development") {
        console.error(err);
    }

    res.status(statusCode).send(response);
});

module.exports = app;
