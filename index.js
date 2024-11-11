const connectToAri = require('./src/ariClient');
const { handleStasisStart } = require('./src/stasisApp');

// Start the ARI client connection
connectToAri()
    .then(() => console.log('ARI client connected'))
    .catch(err => console.error('Failed to start ARI client:', err));

// Listen for StasisStart events and call the handler
connectToAri.on('StasisStart', (event, channel) => {
    handleStasisStart(channel);
});