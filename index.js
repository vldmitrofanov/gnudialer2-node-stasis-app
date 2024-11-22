const connectToAri = require('./src/ariClient');
const { handleStasisStart } = require('./src/stasisApp');
const getAgentBridgeId = require('./src/ORM/getAgentBridgeId')
const channelVariables = new Map();
let applicationType;
const db = require('./src/db');
const Config = require('./src/config');
const config = new Config('/etc/gnudialer.conf');
let SERVERID = config.get('asterisk.server_id')
const getBridgeByName = require('./src/ARI/getBridgeByName')
const getBridgeByAgentId = require('./src/ORM/getBridgeByAgentId')
const runAgentJoinBridge = require('./src/runAgentJoinBridge')
const patchBridge = require('./src/ORM/patchBridge')
const incrementQueueNumbers = require('./src/ORM/incrementQueueNumbers')
const getChannelVariables = require('./src/getChannelVariables');
// Start the ARI client connection
connectToAri()
    .then((ari) => {
        console.log('ARI client connected')
        ari.on('StasisStart', async (event, channel) => {
            applicationType = event.args[0]
            console.log('starting aplication type ', applicationType)
            switch (applicationType) {
                case 'agent_bridge':
                    const agentId = event.args[1];
                    SERVERID = event.args[2];
                    runAgentJoinBridge({
                        ari: ari,
                        event: event,
                        channel: channel,
                        agentId: agentId,
                        serverId: SERVERID
                    })
                    break;
                default:
                    const isHuman = parseInt(event.args[1]) === 1;  // First argument
                    console.log('Is Human: ' + isHuman)
                    try {
                        const variablesToFetch = ['LEADID', 'CAMPAIGN', 'DSPMODE', 'ISTRANSFER', 'AGENTID', 'METHOD'];
                        const variables = await getChannelVariables(ari, channel.id, variablesToFetch);

                        console.log('Storing variables for channel:', channel.id, variables);

                        // Store variables in the global Map
                        channelVariables.set(channel.id, variables);
                    } catch (err) {
                        console.error('Error retrieving variables during StasisStart:', err);
                    }
                    break;
            }

        });

        ari.on('ChannelStateChange', async (event, channel) => {
            console.log('ON ChannelStateChange is channel.state', channel.state, ' | application: ', applicationType)
            if (applicationType === 'agent_bridge') {

            } else {
                if (channel.state === 'Up') {
                    console.log(`Channel ${channel.id} answered.`);
                    try {
                        const variablesToFetch = ['LEADID', 'CAMPAIGN', 'DSPMODE', 'ISTRANSFER', 'AGENTID', 'METHOD'];
                        const variables = await getChannelVariables(ari, channel.id, variablesToFetch);

                        console.log('Storing variables for channel:', channel.id, variables);

                        // Store variables in the global Map
                        channelVariables.set(channel.id, variables);
                    } catch (err) {
                        console.error('Error retrieving variables during ChannelStateChange:', err);
                    }
                    const variables = channelVariables.get(channel.id);
                    const { leadid, campaign, dspmode, istransfer, agentid, method } = variables;
                    if (method === 'auto') {
                        if (campaign && leadid) {
                            const [result] = await db.query(
                                'UPDATE placed_calls SET answered = 1 WHERE leadid = ? AND campaign = ?',
                                [leadid, campaign]
                            );
                        }
                        if (campaign) {
                            let bridgeFound = false;
                            try {
                                // Attempt to find or retry finding a bridge
                                while (!bridgeFound) {
                                    // Fetch the agent's bridge ID
                                    const bridgeName = await getAgentBridgeId(campaign, SERVERID);
                                    if (!bridgeName) {
                                        console.error(`No bridge found for campaign: ${campaign}. Hanging up.`);
                                        incrementQueueNumbers(campaign, [{ param: 'abandons', val: 1 }])
                                        await channel.hangup();
                                        return;
                                    }
                                    const bridge = await getBridgeByName(ari, bridgeName)
                                    if (bridge) {
                                        const userCount = bridge.channels ? bridge.channels.length : 0;
                                        if (userCount !== 1) {
                                            console.log(
                                                `Bridge "${bridgeName}" found, but it has ${userCount} users. Expected: 1.`
                                            );
                                            await patchBridge(bridgeName, [{ param: 'available', val: 0 }])
                                        }
                                        const bridgeId = bridge.id
                                        if (bridgeId) {
                                            try {
                                                console.log(`Bridge ID for "${bridgeName}":`, bridgeId);

                                                // Add a channel to the bridge if needed
                                                await ari.bridges.addChannel({
                                                    bridgeId: bridgeId,
                                                    channel: channel.id // Replace with the channel ID
                                                });
                                                await patchBridge(bridgeName, [{ param: 'available', val: 0 }])
                                                console.log(`Channel added to bridge "${bridgeName}"`);
                                                bridgeFound = true;
                                            } catch (err) {
                                                console.error(`Error adding channel to bridge "${bridgeName}":`, err);
                                                // Mark the bridge as problematic
                                                await patchBridge(bridgeName, [{ param: 'available', val: 0 }, { param: 'pause', val: 1 }]);
                                                console.log(`Marked bridge "${bridgeName}" as unavailable.`);
                                            }
                                        } else {
                                            console.error(`No valid bridge found with the name "${bridgeName}".`);
                                        }
                                    } else {
                                        await patchBridge(bridgeName, [{ param: 'available', val: 0 }])
                                    }
                                }
                            } catch (err) {
                                console.error('Error finding or assigning bridge:', err);
                                incrementQueueNumbers(campaign, [{ param: 'abandons', val: 1 }])
                                await channel.hangup();
                            }
                            /*
                            try {
                                await channel.setChannelVar({ variable: 'CONF_BRIDGE_ID', value: bridgeId });
                                await channel.continueInDialplan({
                                    context: 'join_confbridge', // Defined in your dialplan
                                    extension: 's', // The bridge ID passed to the ConfBridge application
                                    priority: 1
                                });
                                console.log(`Channel ${channel.id} redirected to ConfBridge with ID ${bridgeId}`);
                            } catch (err) {
                                console.error(`Error redirecting channel to ConfBridge: ${err.message}`);
                            }
                                */
                        }
                    } else if (method == 'manual') {
                        console.log('manual dial')
                        if (agentid) {
                            const bridge = await getBridgeByAgentId(agentid, SERVERID)
                            try {
                                console.log(`Bridge ID for "${bridge.name}":`, bridge.id);

                                await ari.bridges.addChannel({
                                    bridgeId: bridge.id,
                                    channel: channel.id
                                });
                            } catch (err) {
                                console.error(`Error adding channel to bridge "${bridge.name}":`, err);
                            }
                        } else {
                            console.log('ERROR: no agent ID was caught in manual dial method')
                        }
                    }
                }
            }
        });

        ari.on('ChannelHangupRequest', async (event, channel) => {
            console.log(`Channel ${channel.id} has hung up`);

            try {
                const variables = channelVariables.get(channel.id);

                if (!variables) {
                    console.error(`No stored variables found for channel: ${channel.id}`);
                    return;
                }

                console.log('Retrieved variables from global Map:', variables);

                const { leadid, campaign, dspmode, istransfer } = variables;

                if (!leadid || !campaign) {
                    console.error('Missing required variables: LEADID or CAMPAIGN');
                    return;
                }
                // Update your database when a call is hung up
                const [result] = await db.query(
                    'DELETE FROM placed_calls WHERE leadid = ? AND campaign = ?',
                    [leadid, campaign]
                );
                const leadTableName = 'campaign_' + campaign
                const hangupCause = event.cause || 'UNKNOWN';
                console.log('Hangup cause:', hangupCause);
                let dispo = null;
                switch (hangupCause) {
                    case 1:
                        // bad number
                        dispo = -7;
                        break;
                    case 'CONGESTION':
                        dispo = -5;
                        break;
                    case 19:
                        //no answer
                        dispo = -2;
                        break;
                    case 17:
                        // BUSY
                        dispo = -4;
                        break;
                    case 'UNKNOWN':
                        dispo = -1
                        break;
                }
                if (channel.state === 'Up') {
                    console.log('The call was answered.', channel.state);
                } else {
                    console.log('The call was not answered.', channel.state);
                    dispo = -2
                }
                if (dispo !== null) {
                    const [result2] = await db.query(
                        'UPDATE ' + leadTableName + ' SET disposition = ? WHERE id = ?',
                        [dispo, leadid]
                    );

                    console.log('Database updated successfully for channel:', channel.id);
                }
            } catch (err) {
                console.error('Error retrieving variables or updating database:', err);
            }
        });

        ari.on('ChannelEnteredBridge', async (event) => {
            const bridgeId = event.bridge.id;
            const channelId = event.channel.id;

            console.log(`Channel ${channelId} joined bridge ${bridgeId}`);

            // Check participant count in the bridge
            const bridge = await ari.bridges.get({ bridgeId });
            if (bridge.channels.length === 1) {
                console.log(`Only one participant in bridge ${bridgeId}. Playing notification...`);

                // Play a beep or message to the channel
                await ari.channels.play({
                    channelId,
                    media: 'sound:conf-onlyperson',
                });
            }
        });

        ari.on('ChannelLeftBridge', async (event) => {
            const bridgeId = event.bridge.id;
            const channelId = event.channel.id;

            console.log(`Channel ${channelId} left bridge ${bridgeId}`);
        });

    })
    .catch(err => console.error('Failed to start ARI client:', err));


/*

HANGUP CAUSES

1	Unallocated number
3	No route to destination
6	Channel unacceptable
16	Normal clearing
17	User busy
18	No user responding
19	No answer from user
20	Subscriber absent
21	Call rejected
22	Number changed
26	Non-selected user clearing
27	Destination out of order
28	Invalid number format
31	Normal, unspecified
34	No circuit/channel available
38	Network out of order
41	Temporary failure
42	Switching equipment congestion
43	Access information discarded
44	Requested circuit/channel not available
47	Resource unavailable, unspecified
49	Quality of service unavailable
50	Requested facility not subscribed
52	Outgoing calls barred within CUG
54	Incoming calls barred within CUG
57	Bearer capability not authorized
58	Bearer capability not presently available
65	Bearer capability not implemented
79	Service or option not implemented, unspecified
87	User not member of CUG
88	Incompatible destination
95	Invalid message, unspecified
96	Mandatory information element missing
97	Message type non-existent or not implemented
98	Message not compatible with call state
99	Information element nonexistent or not implemented
100	Invalid information element contents
101	Message not implemented, unspecified
102	Recovery on timer expiry
111	Protocol error, unspecified


*/