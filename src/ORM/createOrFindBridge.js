const db = require('../db');
async function createOrFindBridge(agentId, serverId) {
    try {
        // Check if a bridge already exists in the database
        const [existingBridge] = await db.query(
            'SELECT * FROM conf_bridges WHERE agent_id = ? AND server_id = ? LIMIT 1',
            [agentId, serverId]
        );

        let bridgeRecord = existingBridge || null;

        if (!bridgeRecord || bridgeRecord.length===0) {
            // No bridge found, create a new entry in the database
            const [insertResult] = await db.query(
                'INSERT INTO conf_bridges (agent_id, server_id, online, available, pause, created_at, updated_at) VALUES (?, ?, 0, 1, 0, NOW(), NOW())',
                [agentId, serverId]
            );

            // Fetch the newly created bridge record
            const [newBridgeRecord] = await db.query(
                'SELECT * FROM conf_bridges WHERE id = ? LIMIT 1',
                [insertResult.insertId]
            );
            bridgeRecord = newBridgeRecord;
        }
        console.log('bridgeRecord', bridgeRecord)

        const bridgeName = bridgeRecord[0].id.toString();

        return bridgeName;

  
    } catch (err) {
        console.error('Error in createOrFindBridge:', err);
        throw err;
    }
}

module.exports = createOrFindBridge;