const db = require('../db');
async function getBridgeByAgentId(agentId, serverId) {
    let query = "SELECT * FROM conf_bridges "         
                "WHERE conf_bridges.agent_id = ? AND conf_bridges.server_id = ? "
                "ORDER BY conf_bridges.updated_at ASC LIMIT 1"
    const [rows] = await db.query(query,
        [agentId,serverId]
    );
    if (rows.length > 0) {
        console.log(`Found bridge ID for AgentID ${agentId}: ${rows[0].id}`);
        return rows[0];
    } else {
        console.error(`No bridge found for AgentID: ${agentId}`);
        return null;
    }
}
module.exports = getBridgeByAgentId;