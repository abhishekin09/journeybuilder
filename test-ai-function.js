// Sample function for testing AI-powered journey analysis
function processUserRegistration(userData) {
    // Input validation
    validateUserData(userData);
    
    // Check if user exists
    const existingUser = findUserByEmail(userData.email);
    if (existingUser) {
        throw new Error('User already exists');
    }
    
    // Hash password
    const hashedPassword = hashPassword(userData.password);
    
    // Save to database
    const user = createUser({
        ...userData,
        password: hashedPassword
    });
    
    // Cache user data
    cacheUserData(user.id, user);
    
    // Send welcome email
    sendWelcomeEmail(user.email, user.name);
    
    // Log registration event
    logEvent('user_registration', { userId: user.id });
    
    // Publish registration event to message queue
    publishEvent('user.registered', { userId: user.id, email: user.email });
    
    return user;
}

// Supporting functions to demonstrate call hierarchy
function validateUserData(data) {
    if (!data.email || !data.password) {
        throw new Error('Email and password required');
    }
    validateEmail(data.email);
    validatePassword(data.password);
}

function findUserByEmail(email) {
    return db.users.findOne({ email: email });
}

function hashPassword(password) {
    return bcrypt.hash(password, 10);
}

function createUser(userData) {
    return db.users.insertOne(userData);
}

function cacheUserData(userId, userData) {
    redis.set(`user:${userId}`, JSON.stringify(userData), 'EX', 3600);
}

function sendWelcomeEmail(email, name) {
    emailService.send({
        to: email,
        subject: 'Welcome!',
        template: 'welcome',
        data: { name }
    });
}

function logEvent(event, data) {
    logger.info(event, data);
}

function publishEvent(eventType, payload) {
    messageQueue.publish(eventType, payload);
}

// Functions that call processUserRegistration (upstream)
function handleRegistrationRequest(req, res) {
    try {
        const user = processUserRegistration(req.body);
        res.status(201).json({ success: true, user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

function registerUserFromAdmin(adminData) {
    return processUserRegistration(adminData);
}

// API endpoints that would call these functions
app.post('/api/register', handleRegistrationRequest);
app.post('/api/admin/users', (req, res) => {
    const user = registerUserFromAdmin(req.body);
    res.json(user);
}); 