//const util = require('util');

async function getBridgeByName(ari, bridgeName) {
    try {
        // Fetch all bridges managed by ARI
        const bridges = await ari.bridges.list();
        //console.log(`Retrieved bridges: ${util.inspect(bridges, { depth: 2, colors: true })}`);
        // Look for the bridge with the matching name
        const bridge = bridges.find(b => b.name && b.name.trim() === String(bridgeName).trim());

        if (bridge) {
            //const userCount = bridge.channels ? bridge.channels.length : 0;

            // Check if the number of users (channels) matches the criteria
            //if (maxUsers !== null && userCount !== maxUsers) {
            //    console.log(
            //        `Bridge "${bridgeName}" found, but it has ${userCount} users. Expected: ${maxUsers}.`
            //    );
            //   return null;
            //}
            console.log(`Found bridge with name "${bridgeName}" and ID "${bridge.id}"`);
            return bridge;
        } else {
            console.log(`No bridge found with the name "${bridgeName}"`);
            return null;
        }
    } catch (err) {
        console.error('Error fetching bridges:', err);
        throw err;
    }
}
module.exports = getBridgeByName;