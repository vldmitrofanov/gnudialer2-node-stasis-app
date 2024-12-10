const db = require('../../db');

async function getInboundByNumber(number, serverId) {
    let query = "SELECT * FROM inbounds "         
                "WHERE inbounds.did_number = ? AND inbounds.server_id = ? "
                "ORDER BY inbounds.updated_at ASC LIMIT 1"
    const [rows] = await db.query(query,
        [number,serverId]
    );
    if (rows.length > 0) {
        console.log(`Found a record in inbounds for number ${number}: ${rows[0].id}`);
        return rows[0];
    } else {
        console.error(`No inbound records found for number: ${number}`);
        return null;
    }
}

module.exports = getInboundByNumber