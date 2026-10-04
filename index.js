const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store').default;

const store = new Store();
const mqtt = require('mqtt');

let mqttClient = null;


function createWindow() {

    const win = new BrowserWindow({
        

        width: 1400,
        height: 850,

        minWidth: 1100,
        minHeight: 700,
        icon: path.join(__dirname, 'icone.png'),

        webPreferences: {

            contextIsolation: true,

            nodeIntegration: false,

            preload: __dirname + '/preload.js'

        }

    });

    win.loadFile('index.html');

}


// ==============================
// OBTER CONFIGURAÇÃO
// ==============================

ipcMain.handle('mqtt:get-config', () => {

    return store.get('mqtt', {

        host: '',

        port: 8883,

        username: '',

        password: '',

        protocol: 'mqtts',

        useTLS: true,

        caCertificate: ''

    });

});


// ==============================
// SALVAR CONFIGURAÇÃO
// ==============================

// ==============================
// SALVAR CONFIGURAÇÃO
// ==============================
ipcMain.handle('mqtt:save-config', (event, config) => {
    store.set('mqtt', config);

    console.log('Configuração MQTT salva.');

    conectarMQTT();

    return {
        success: true
    };
});

// ==============================
// LIMPAR CONFIGURAÇÃO
// ==============================

ipcMain.handle('mqtt:clear-config', () => {

    store.delete('mqtt');

    return {
        success: true
    };

});


// ==============================
// SELECIONAR CERTIFICADO
// ==============================

ipcMain.handle('mqtt:select-certificate', async () => {

    const result = await dialog.showOpenDialog({

        properties: ['openFile'],

        filters: [

            {
                name: 'Certificados',
                extensions: ['crt', 'pem', 'cer']
            }

        ]

    });


    if (
        result.canceled ||
        result.filePaths.length === 0
    ) {

        return '';

    }


    return result.filePaths[0];

});

// ==============================
// CONEXÃO MQTT
// ==============================

function conectarMQTT() {

    const config = store.get('mqtt');

    if (!config || !config.host) {
        console.log('MQTT: configuração não encontrada.');
        return;
    }

    // Evita criar duas conexões
    if (mqttClient) {
        mqttClient.end();
        mqttClient = null;
    }

    const brokerURL = `${config.protocol}://${config.host}:${config.port}`;

    console.log('Conectando ao MQTT...');
    console.log('Broker:', brokerURL);

    mqttClient = mqtt.connect(brokerURL, {
        username: config.username,
        password: config.password,
        rejectUnauthorized: false,
        clientId: 'electron-supervisorio'
    });

    mqttClient.on('connect', () => {

        console.log('=================================');
        console.log('Electron conectado ao HiveMQ!');
        console.log('=================================');
        BrowserWindow.getAllWindows().forEach((window) => {

        window.webContents.send('mqtt:connection', {
                connected: true
            });

        });

        mqttClient.subscribe('supervisorio/esp32-001/temperatura');
        mqttClient.subscribe('supervisorio/esp32-001/tensao');
        mqttClient.subscribe('supervisorio/esp32-001/corrente');
        mqttClient.subscribe('supervisorio/esp32-001/potencia');

        mqttClient.subscribe('supervisorio/esp32-001/status');

        mqttClient.subscribe('supervisorio/esp32-001/rele1/state');
        mqttClient.subscribe('supervisorio/esp32-001/rele2/state');
        mqttClient.subscribe('supervisorio/esp32-001/motor/state');
        mqttClient.subscribe('supervisorio/esp32-001/ventilador/state');

    });

    mqttClient.on('message', (topic, message) => {

        const valor = message.toString();

        console.log('MQTT recebido:');
        console.log('Tópico:', topic);
        console.log('Valor:', valor);

        // Envia o dado para a interface
        BrowserWindow.getAllWindows().forEach((window) => {

            window.webContents.send('mqtt:message', {
                topic: topic,
                value: valor
            });

        });

    });
    mqttClient.on('error', (error) => {
        console.error('Erro MQTT:', error.message);
    });

    mqttClient.on('close', () => {

        console.log('MQTT desconectado.');

        BrowserWindow.getAllWindows().forEach((window) => {

            window.webContents.send('mqtt:connection', {
                connected: false
            });

        });

    });
}
// ==============================
// PUBLICAR COMANDO MQTT
// ==============================

ipcMain.handle('mqtt:publish', (event, topic, message) => {

    if (!mqttClient) {
        console.log('MQTT não conectado.');
        return {
            success: false,
            error: 'MQTT não conectado.'
        };
    }

    if (!mqttClient.connected) {
        console.log('MQTT não está conectado.');
        return {
            success: false,
            error: 'MQTT não está conectado.'
        };
    }

    mqttClient.publish(topic, message, (error) => {

        if (error) {

            console.error(
                'Erro ao publicar MQTT:',
                error.message
            );

        } else {

            console.log('MQTT publicado:');
            console.log('Tópico:', topic);
            console.log('Valor:', message);

        }

    });

    return {
        success: true
    };

});
// ==============================
// INICIAR ELECTRON
// ==============================

app.whenReady().then(() => {

    createWindow();

    conectarMQTT();

});

app.on('window-all-closed', () => {

    if (process.platform !== 'darwin') {

        app.quit();

    }

});