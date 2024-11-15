const connectToAri = require('./src/ariClient');
const { handleStasisStart } = require('./src/stasisApp');
const channelVariables = new Map();
const db = require('./src/db');
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
                    case 'CONGESTION':
                        dispo = -5;
                        break;
                    case 'NO_ANSWER':
                        dispo = -2;
                        break;
                    case 'BUSY':
                        dispo = -4;
                        break;
                    case 'UNKNOWN':
                        dispo = -1
                        break;
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

