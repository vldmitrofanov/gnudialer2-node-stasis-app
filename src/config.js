const fs = require('fs');
const path = require('path');

class Config {
    constructor(filename) {
        this.configData = {};
        this.load(filename);
    }

    load(filename) {
        const filePath = path.resolve(__dirname, '..', filename);
        const data = fs.readFileSync(filePath, 'utf-8');
        let currentSection = '';

        data.split('\n').forEach(line => {
            line = line.trim();
            if (!line || line.startsWith('#') || line.startsWith(';')) return;

            if (line.startsWith('[') && line.endsWith(']')) {
                currentSection = line.slice(1, -1);
            } else {
                const delimiterPos = line.indexOf('=');
                if (delimiterPos === -1) return;

                const key = line.slice(0, delimiterPos).trim();
                const value = line.slice(delimiterPos + 1).trim();

                if (currentSection) {
                    this.configData[`${currentSection}.${key}`] = value;
                } else {
                    this.configData[key] = value;
                }
            }
        });
    }

    get(key, defaultValue = '') {
        return this.configData[key] || defaultValue;
    }
}

module.exports = Config;