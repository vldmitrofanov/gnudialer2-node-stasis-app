async function getBridgeIdByName(ari, bridgeName) {
    try {
        // Fetch all bridges managed by ARI
        const bridges = await ari.bridges.list();

        // Look for the bridge with the matching name
        const bridge = bridges.find(b => b.name === bridgeName);

        if (bridge) {
            console.log(`Found bridge with name "${bridgeName}" and ID "${bridge.id}"`);
            return bridge.id;
        } else {
            console.log(`No bridge found with the name "${bridgeName}"`);
            return null;
        }
    } catch (err) {
        console.error('Error fetching bridges:', err);
        throw err;
    }
}