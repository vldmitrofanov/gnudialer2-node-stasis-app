const db = require('../../db');

async function updateBridge({ id, bridgeId, online, available, pause, serverId }) {
    try {
        // Update the bridge record in the database
        const [result] = await db.query(
            `
            UPDATE conf_bridges
            SET 
                bridge_id = ?, 
                online = ?, 
                available = ?, 
                pause = ?, 
                server_id = ?, 
                updated_at = NOW()
            WHERE id = ?
            `,
            [bridgeId, online, available, pause, serverId, id]
        );

        if (result.affectedRows === 0) {
            throw new Error(`No bridge found with ID: ${id}`);
        }

        console.log(`Bridge ID ${id} updated successfully.`);
        return true;
    } catch (err) {
        console.error('Error updating bridge:', err);
        throw err;
    }
}

module.exports = updateBridge;