const createOrFindBridge = require('../src/ORM/createOrFindBridge')
const updateBridge = require('../src/ORM/updateBridge')

const runAgentJoinBridge = async ({
    ari,
    event,
    channel,
    agentId,
    serverId
}) => {
    try {
        const bridgeName = await createOrFindBridge(agentId, serverId);
        const bridges = await ari.bridges.list();
        let ariBridge = bridges.find((bridge) => bridge.name === bridgeName);

        if (!ariBridge) {
            // Create a new ARI bridge
            ariBridge = await ari.bridges.create({
                type: 'mixing',
                name: bridgeName,
            });
        }
        await ari.bridges.addChannel({
            bridgeId: ariBridge.id,
            channel: channel.id,
        });
        await updateBridge({
            id: bridgeName,
            bridgeId: ariBridge.id,
            online: 1,
            available: 1,
            pause: 0,
            serverId: serverId
        })
        //console.log(`Database updated for bridge ID: ${bridgeName}`);
    } catch (err) {
        console.error('Error in runAgentJoinBridge:', err);
    }
}
module.exports = runAgentJoinBridge;