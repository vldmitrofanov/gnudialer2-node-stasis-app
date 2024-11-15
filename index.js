const connectToAri = require('./src/ariClient');
const { handleStasisStart } = require('./src/stasisApp');
const getAgentBridgeId = require('./src/ORM/getAgentBridgeId')
const channelVariables = new Map();
const db = require('./src/db');
const Config = require('./src/config');
const config = new Config('/etc/gnudialer.conf');
const serverId = config.get('asterisk.server_id')
// Start the ARI client connection
connectToAri()
    .then((ari) => {
        console.log('ARI client connected')
        ari.on('StasisStart', async (event, channel) => {
            const isHuman = parseInt(event.args[0]) === 1;  // First argument
            console.log('Is Human: ' + isHuman)
            //let args = {};
            //try {
            //    args = JSON.parse(event.args[1]);  // Second argument (appArgs JSON)
            //} catch (err) {
            //    console.error('Failed to parse appArgs JSON:', err);
            //    return;
            //}

            //const leadId = args.leadId;
            //const queueName = args.queueName;

            //console.log(`Channel ${channel.id} started in Stasis app`);
            //console.log(`isHuman: ${isHuman}, Lead ID: ${leadId}, Queue Name: ${queueName}`);
            try {
                const leadIdResult = await ari.channels.getChannelVar({ channelId: channel.id, variable: 'LEADID' });
                const campaignResult = await ari.channels.getChannelVar({ channelId: channel.id, variable: 'CAMPAIGN' });
                const dspModeResult = await ari.channels.getChannelVar({ channelId: channel.id, variable: 'DSPMODE' });
                const isTransferResult = await ari.channels.getChannelVar({ channelId: channel.id, variable: 'ISTRANSFER' });

                const variables = {
                    leadId: leadIdResult.value,
                    campaign: campaignResult.value,
                    dspMode: dspModeResult.value,
                    isTransfer: isTransferResult.value,
                };

                console.log('Storing variables for channel:', channel.id, variables);

                // Store variables in the global Map
                channelVariables.set(channel.id, variables);
            } catch (err) {
                console.error('Error retrieving variables during StasisStart:', err);
            }
        });

        ari.on('ChannelStateChange', async (event, channel) => {
            console.log('ON ChannelStateChange is channel.state', channel.state)
            if (channel.state === 'Up') {
                console.log(`Channel ${channel.id} answered.`);

                const variables = channelVariables.get(channel.id);
                const { leadId, campaign, dspMode, isTransfer } = variables;
                if (campaign) {
                    // Fetch the agent's bridge ID
                    const bridgeId = await getAgentBridgeId(campaign, serverId);
                    if (!bridgeId) {
                        // ADD ABANDONED
                        console.error(`No bridge found for campaign: ${campaign}. Hanging up.`);
                        await channel.hangup();
                        return;
                    }

                    // Add the callee's channel to the bridge
                    try {
                        const bridge = ari.bridges.get({ bridgeId });
                        await bridge.addChannel({ channel: channel.id });
                        console.log(`Added channel ${channel.id} to bridge ${bridgeId}`);
                    } catch (err) {
                        console.error(`Error adding channel to bridge ${bridgeId}:`, err);
                        await channel.hangup();
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

                const { leadId, campaign, dspMode, isTransfer } = variables;

                if (!leadId || !campaign) {
                    console.error('Missing required variables: LEADID or CAMPAIGN');
                    return;
                }
                // Update your database when a call is hung up
                const [result] = await db.query(
                    'DELETE FROM placed_calls WHERE leadid = ? AND campaign = ?',
                    [leadId, campaign]
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
                        [dispo, leadId]
                    );

                    console.log('Database updated successfully for channel:', channel.id);
                }
            } catch (err) {
                console.error('Error retrieving variables or updating database:', err);
            }
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