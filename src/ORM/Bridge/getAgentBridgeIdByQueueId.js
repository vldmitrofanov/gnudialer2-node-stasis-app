const db = require('../../db');
async function getAgentBridgeIdByQueueId(queueId) {
    let query = "SELECT conf_bridges.id FROM conf_bridges "
    query +="LEFT JOIN agent_queue ON conf_bridges.agent_id = agent_queue.agent_id "
                "LEFT JOIN queues ON agent_queue.queue_id = queues.id "
                "WHERE agent_queue.queue_id = ? "
                "AND conf_bridges.online = 1 AND conf_bridges.available = 1 "
                "AND conf_bridges.pause = 0 ORDER BY conf_bridges.updated_at ASC LIMIT 1"
    const [rows] = await db.query(query,
        [queueId]
    );
    if (rows.length > 0) {
        console.log(`Found bridge ID for campaign ${campaign}: ${rows[0].id}`);
        return rows[0].id;
    } else {
        console.error(`No available agents found for campaign: ${campaign}`);
        return null;
    }
}
module.exports = getAgentBridgeIdByQueueId;