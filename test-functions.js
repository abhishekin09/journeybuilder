// Test functions for API Journey Builder Extension

// Express.js API endpoints
const express = require('express');
const app = express();

function processLiveChallenges(req, res) {
    // This function processes live challenges
    const challengeData = req.body;
    
    // Database operations
    const user = User.findOne({ id: challengeData.userId });
    const challenge = Challenge.create({
        title: challengeData.title,
        description: challengeData.description,
        userId: challengeData.userId
    });
    
    // Cache operations
    redis.set(`challenge:${challenge.id}`, JSON.stringify(challenge));
    cache.del('active_challenges');
    
    // Message queue operations
    kafka.publish('challenge_created', challenge);
    
    // Call other functions
    validateChallenge(challenge);
    notifyUsers(challenge);
    updateLeaderboard(challenge);
    
    res.json({ success: true, challengeId: challenge.id });
}

function validateChallenge(challenge) {
    // Validation logic
    if (!challenge.title || !challenge.description) {
        throw new Error('Invalid challenge data');
    }
    
    // Database check
    const existingChallenge = Challenge.findOne({ title: challenge.title });
    if (existingChallenge) {
        throw new Error('Challenge already exists');
    }
    
    return true;
}

function notifyUsers(challenge) {
    // Get all users
    const users = User.find({ active: true });
    
    // Send notifications
    users.forEach(user => {
        sendNotification(user, challenge);
    });
    
    // Update cache
    cache.set(`notifications:${challenge.id}`, users.length);
}

function updateLeaderboard(challenge) {
    // Database operations
    const leaderboard = Leaderboard.findOne({ type: 'challenges' });
    leaderboard.updateOne({ $inc: { totalChallenges: 1 } });
    
    // Cache update
    redis.del('leaderboard_cache');
    
    return leaderboard;
}

function sendNotification(user, challenge) {
    // Message queue
    sqs.send('notifications', {
        userId: user.id,
        type: 'challenge_created',
        challengeId: challenge.id
    });
}

// API Routes
app.get('/api/challenges', processLiveChallenges);
app.post('/api/challenges', processLiveChallenges);
app.put('/api/challenges/:id', updateChallenge);
app.delete('/api/challenges/:id', deleteChallenge);

function updateChallenge(req, res) {
    const challengeId = req.params.id;
    const updateData = req.body;
    
    // Database operation
    const challenge = Challenge.updateOne({ id: challengeId }, updateData);
    
    // Cache invalidation
    redis.del(`challenge:${challengeId}`);
    
    res.json({ success: true, challenge });
}

function deleteChallenge(req, res) {
    const challengeId = req.params.id;
    
    // Database operation
    Challenge.deleteOne({ id: challengeId });
    
    // Cache cleanup
    redis.del(`challenge:${challengeId}`);
    cache.del('active_challenges');
    
    // Notify users
    kafka.publish('challenge_deleted', { challengeId });
    
    res.json({ success: true });
}

module.exports = {
    processLiveChallenges,
    validateChallenge,
    notifyUsers,
    updateLeaderboard,
    sendNotification,
    updateChallenge,
    deleteChallenge
}; 