const AriClient = require('ari-client');
const Config = require('./config');
const config = new Config('/etc/gnudialer.conf');

async function connectToAri() {
    try {
        const ari = await AriClient.connect(
            `http://${config.get('ARI.host')}:${config.get('ARI.port')}`,
            config.get('ARI.username'),
            config.get('ARI.password')
        );

        const appName = config.get('ARI.app');
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

        ari.start(appName);
    } catch (err) {
        console.error('Failed to connect to ARI:', err);
    }
}

module.exports = connectToAri;