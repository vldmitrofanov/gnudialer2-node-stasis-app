const AriClient = require('ari-client');
const Config = require('./config');
const config = new Config('/etc/gnudialer.conf');
const db = require('./db');

async function connectToAri() {
    try {
        const ariPort = config.get('ari.ari_port') || 8088;
        const ariHost = config.get('asterisk.master_host');
        const ariUser = config.get('ari.ari_username');
        const ariSecret = config.get('ari.ari_password');
        const ari = await AriClient.connect(
            `http://${ariHost}:${ariPort}`,
            ariUser,
            ariSecret
        );
        console.log(`http://${ariHost}:${ariPort}`);
        const appName = config.get('ari.app_name') || 'gnudialer_stasis_app';
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
                const leadId = await channel.getChannelVar('LEADID');
                const campaign = await channel.getChannelVar('CAMPAIGN');
                const dspMode = await channel.getChannelVar('DSPMODE');
                const isTransfer = await channel.getChannelVar('ISTRANSFER');
                const hangupCause = event.cause;
                if(!leadId || !campaign) {
                    return;
                }      
                console.log(`Retrieved variables - LEADID: ${leadId}, CAMPAIGN: ${campaign}, DSPMODE: ${dspMode}, ISTRANSFER: ${isTransfer}`);
        
                // Update your database when a call is hung up
                const [result] = await db.query(
                    'DELETE FROM placed_calls WHERE lead_id = ?, campaign = ?',
                    [leadId, campaign]
                );
                const leadTableName = 'campaign_' + campaign
                let dispo = null;
                switch(hangupCause) {
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

        ari.start(appName);
    } catch (err) {
        console.error('Failed to connect to ARI:', err);
    }
}

module.exports = connectToAri;