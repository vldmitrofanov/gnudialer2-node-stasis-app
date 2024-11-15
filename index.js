const connectToAri = require('./src/ariClient');
const { handleStasisStart } = require('./src/stasisApp');

// Start the ARI client connection
connectToAri()
    .then((ari) => {
        console.log('ARI client connected')
        ari.on('StasisStart', (event, channel) => {
            const isHuman = parseInt(event.args[0]) === 1;  // First argument
            let args = {};
            try {
                args = JSON.parse(event.args[1]);  // Second argument (appArgs JSON)
            } catch (err) {
                console.error('Failed to parse appArgs JSON:', err);
                return;
            }

            const leadId = args.leadId;
            const queueName = args.queueName;

            console.log(`Channel ${channel.id} started in Stasis app`);
            console.log(`isHuman: ${isHuman}, Lead ID: ${leadId}, Queue Name: ${queueName}`);
        });

        ari.on('ChannelHangupRequest', async (event, channel) => {
            console.log(`Channel ${channel.id} has hung up`);

            try {
                // Retrieve variables associated with the channel
                const leadIdResult = await ari.channels.getChannelVar({ channelId: channel.id, variable: 'LEADID' });
                const campaignResult = await ari.channels.getChannelVar({ channelId: channel.id, variable: 'CAMPAIGN' });
                const dspModeResult = await ari.channels.getChannelVar({ channelId: channel.id, variable: 'DSPMODE' });
                const isTransferResult = await ari.channels.getChannelVar({ channelId: channel.id, variable: 'ISTRANSFER' });
                const leadId = leadIdResult.value;
                const campaign = campaignResult.value;
                const dspMode = dspModeResult.value;
                const isTransfer = isTransferResult.value;

                const hangupCause = event.cause;
                console.log(`Retrieved variables - LEADID: ${leadId}, CAMPAIGN: ${campaign}, DSPMODE: ${dspMode}, ISTRANSFER: ${isTransfer}, Hangup cause: ${hangupCause}`);

                if (!leadId || !campaign) {
                    return;
                }


                // Update your database when a call is hung up
                const [result] = await db.query(
                    'DELETE FROM placed_calls WHERE lead_id = ?, campaign = ?',
                    [leadId, campaign]
                );
                const leadTableName = 'campaign_' + campaign
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
                }
                const [result2] = await db.query(
                    'UPDATE ' + leadTableName + ' SET disposition = ? WHERE id = ?',
                    [dispo, leadId]
                );

                console.log('Database updated successfully for channel:', channel.id);
            } catch (err) {
                console.error('Error retrieving variables or updating database:', err);
            }
        });

    })
    .catch(err => console.error('Failed to start ARI client:', err));

