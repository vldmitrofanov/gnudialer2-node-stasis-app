const createOrFindBridge = require('./ORM/Bridge/createOrFindBridge');
const getAgentBridgeIdByQueueId = require('./ORM/Bridge/getAgentBridgeIdByQueueId');
const updateBridge = require('./ORM/Bridge/updateBridge');
const getInboundByNumber = require('./ORM/Inbound/getInboundByNumber');

const runAgentJoinBridge = async ({
    ari,
    event,
    channel,
    serverId
}) => {
    try {
        // Retrieve the EXTEN variable to get the dialed number
        const dialedNumber = await ari.channels.getChannelVar({
            channelId: channel.id,
            variable: 'EXTEN'
        });
        const inbound = await getInboundByNumber(dialedNumber, serverId);
        if (inbound['routable_type'] === 'App\\Models\\Queue') {
            console.log('This is a Queue model.');
            let availableBridgeName = getAgentBridgeIdByQueueId(inbound['routable_id'])

            if (!availableBridgeName) {
                // here we run loop
                // and wait for available agent
            }

            const bridges = await ari.bridges.list();
            let ariBridge = bridges.find((bridge) => bridge.name === availableBridgeName);

            if (!ariBridge) {
                // Create a new ARI bridge
                ariBridge = await ari.bridges.create({
                    type: 'mixing',
                    name: availableBridgeName,
                });
            }
            await ari.bridges.addChannel({
                bridgeId: ariBridge.id,
                channel: channel.id,
            });
            await updateBridge({
                id: availableBridgeName,
                bridgeId: ariBridge.id,
                online: 1,
                available: 1,
                pause: 0,
                serverId: serverId
            })
            //console.log(`Database updated for bridge ID: ${availableBridgeName}`);
        }

    } catch (err) {
        console.error('Error in runAgentJoinBridge:', err);
    }
}
module.exports = runAgentJoinBridge;