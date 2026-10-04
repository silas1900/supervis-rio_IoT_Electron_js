const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mqttConfig', {

    get: () => {
        return ipcRenderer.invoke('mqtt:get-config');
    },

    save: (config) => {
        return ipcRenderer.invoke('mqtt:save-config', config);
    },

    clear: () => {
        return ipcRenderer.invoke('mqtt:clear-config');
    },

    selectCertificate: () => {
        return ipcRenderer.invoke('mqtt:select-certificate');
    }

});

// ==============================
// MQTT - DADOS DO SUPERVISÓRIO
// ==============================

contextBridge.exposeInMainWorld('mqtt', {

    onMessage: (callback) => {
        ipcRenderer.on('mqtt:message', (event, data) => {
            callback(data);
        });
    },

    onConnection: (callback) => {
        ipcRenderer.on('mqtt:connection', (event, data) => {
            callback(data);
        });
    },

    publish: (topic, message) => {
        return ipcRenderer.invoke('mqtt:publish', topic, message);
    }

});