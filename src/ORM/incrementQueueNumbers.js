const db = require('../db');

async function incrementQueueNumbers(campaignName, updates) {
    try {
        if (!Array.isArray(updates) || updates.length === 0) {
            throw new Error('Updates must be a non-empty array of objects with param and val.');
        }

        // Build the SQL query dynamically for increments
        const setClauses = updates.map(update => `${update.param} = ${update.param} + ?`).join(', ');
        const values = updates.map(update => update.val);

        // Add the campaign name to the parameters
        values.push(campaignName);

        const query = `
            UPDATE queue_operations
            JOIN queues ON queue_operations.queue_id = queues.id
            JOIN campaigns ON queues.campaign_id = campaigns.id
            SET ${setClauses}, queue_operations.updated_at = NOW()
            WHERE campaigns.code = ?
        `;

        // Execute the query
        const [result] = await db.query(query, values);

        if (result.affectedRows === 0) {
            throw new Error(`No queue operations found for campaign code: ${campaignName}`);
        }

        console.log(`Queue operations updated successfully for campaign "${campaignName}" with increments:`, updates);
        return true;
    } catch (err) {
        console.error('Error updating queue operations:', err);
        throw err;
    }
}

module.exports = incrementQueueNumbers;