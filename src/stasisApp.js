const db = require('./db');

async function handleStasisStart(channel) {
    console.log(`Handling StasisStart for channel: ${channel.id}`);
    try {
        // Example: Update a record in the database
        const [result] = await db.query('UPDATE calls SET status = ? WHERE call_id = ?', ['answered', channel.id]);
        console.log('Database updated:', result);
    } catch (err) {
        console.error('Database error:', err);
    }
}

module.exports = { handleStasisStart };