const db = require('../db');
async function getAgentBridgeId(campaign, serverId) {
    let query = "SELECT conf_bridges.id FROM conf_bridges "
    query +="LEFT JOIN agent_queue ON conf_bridges.agent_id = agent_queue.agent_id "
                "LEFT JOIN queues ON agent_queue.queue_id = queues.id "
                "LEFT JOIN campaigns ON queues.campaign_id = campaigns.id "
                "WHERE campaigns.code = ? AND conf_bridges.server_id = ? "
                "AND online = 1 AND available = 1 AND pause = 0 ORDER BY conf_bridges.updated_at ASC LIMIT 1"
    const [rows] = await db.query(query,
        [campaign,serverId]
    );
    if (rows.length > 0) {
        console.log(`Found bridge ID for campaign ${campaign}: ${rows[0].bridge_id}`);
        return rows[0].bridge_id;
    } else {
        console.error(`No available agents found for campaign: ${campaign}`);
        return null;
    }
}
module.exports = getAgentBridgeId;