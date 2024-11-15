const AriClient = require('ari-client');
const Config = require('./config');
const config = new Config('/etc/gnudialer.conf');


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

        ari.start(appName);

        return ari
    } catch (err) {
        console.error('Failed to connect to ARI:', err);
    }
}

module.exports = connectToAri;