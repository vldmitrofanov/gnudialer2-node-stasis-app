async function getChannelVariables(ari, channelId, variablesToFetch) {
    try {
        const variables = {};

        // Fetch each variable and handle undefined or missing values
        for (const variable of variablesToFetch) {
            try {
                const result = await ari.channels.getChannelVar({ channelId, variable });
                variables[variable.toLowerCase()] = result.value || ''; // Use variable name as key
            } catch (error) {
                console.warn(`Variable "${variable}" not found or could not be retrieved for channel ${channelId}`);
                variables[variable.toLowerCase()] = ''; // Default to an empty string
            }
        }

        return variables;
    } catch (err) {
        console.error(`Error retrieving variables for channel ${channelId}:`, err);
        throw err;
    }
}

module.exports = getChannelVariables;