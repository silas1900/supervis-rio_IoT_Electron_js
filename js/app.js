// ==============================
// CARGAS
// ==============================

let loads = {

    relay1: false,
    relay2: false,
    motor: false,
    fan: false

};


// ==============================
// GRÁFICO
// ==============================

const ctx = document
    .getElementById('temperatureChart')
    .getContext('2d');


const temperatureChart = new Chart(ctx, {

    type: 'line',

    data: {

        labels: [],

        datasets: [{

            label: 'Temperatura (°C)',

            data: [],

            borderWidth: 2,

            pointRadius: 0,

            tension: 0.4,
           
            borderColor: '#109ff1',

            fill: false 

        }]

    },

    options: {

        responsive: true,

        maintainAspectRatio: false,

        animation: false,

        plugins: {

            legend: {

                display: true,

                labels: {

                    usePointStyle: true,

                    pointStyle: 'line'

                }

            }

        },

        scales: {

            y: {

                beginAtZero: false

            }

        }

    }

});


// ==============================
// MQTT - MONITORAMENTO
// ==============================

window.mqtt.onConnection((data) => {

    const connectionStatus =
        document.getElementById('connection-status');

    const statusDot =
        document.querySelector('.status-dot');

    if (data.connected) {

        connectionStatus.textContent =
            'CONECTADO';

        connectionStatus.classList.remove('disconnected');
        connectionStatus.classList.add('connected');

        statusDot.classList.remove('disconnected');
        statusDot.classList.add('connected');

    } else {

        connectionStatus.textContent =
            'DESCONECTADO';

        connectionStatus.classList.remove('connected');
        connectionStatus.classList.add('disconnected');

        statusDot.classList.remove('connected');
        statusDot.classList.add('disconnected');

    }

});

window.mqtt.onMessage((data) => {

    const topic = data.topic;
    const value = data.value;

    // ==============================
    // TEMPERATURA
    // ==============================

    if (
        topic ===
        'supervisorio/esp32-001/temperatura'
    ) {

        const temperature =
            Number(value);

        if (!Number.isNaN(temperature)) {

            document.getElementById('temperature')
                .textContent =
                temperature.toFixed(1);


            temperatureChart.data.labels.push('');

            temperatureChart.data.datasets[0]
                .data.push(temperature);

            if (
                temperatureChart.data.labels.length > 30
            ) {

                temperatureChart.data.labels.shift();

                temperatureChart.data.datasets[0]
                    .data.shift();

            }

            temperatureChart.update();
        }
    }
     // ==============================
    // STATUS DO ESP32
    // ==============================

    if (
        topic ===
        'supervisorio/esp32-001/status'
    ) {

        const esp32Status =
            document.getElementById('esp32-status');

        const esp32Dot =
            document.querySelector('.esp32-status-dot');

        if (value.toLowerCase() === 'online') {

            esp32Status.textContent =
                'ESP32 ONLINE';

            esp32Status.classList.remove(
                'disconnected'
            );

            esp32Status.classList.add(
                'connected'
            );

            esp32Dot.classList.remove(
                'disconnected'
            );

            esp32Dot.classList.add(
                'connected'
            );

        } else {

            esp32Status.textContent =
                'ESP32 OFFLINE';

            esp32Status.classList.remove(
                'connected'
            );

            esp32Status.classList.add(
                'disconnected'
            );

            esp32Dot.classList.remove(
                'connected'
            );

            esp32Dot.classList.add(
                'disconnected'
            );
        }
    }
    
    // ==============================
    // TENSÃO
    // ==============================
    if (topic === 'supervisorio/esp32-001/tensao') {
        const voltage = Number(value);

        if (!Number.isNaN(voltage)) {
            document.getElementById('voltage').textContent =
                voltage.toFixed(2);
        }
    }

    // ==============================
    // CORRENTE
    // ==============================
    if (topic === 'supervisorio/esp32-001/corrente') {
        const current = Number(value);

        if (!Number.isNaN(current)) {
            document.getElementById('current').textContent =
                current.toFixed(2);
        }
    }

    // ==============================
    // POTÊNCIA
    // ==============================
    if (topic === 'supervisorio/esp32-001/potencia') {
        const power = Number(value);

        if (!Number.isNaN(power)) {
            document.getElementById('power').textContent =
                power.toFixed(2);
        }
    }
    // ==============================
    // RELÉ 1
    // ==============================

    if (
        topic ===
        'supervisorio/esp32-001/rele1/state'
    ) {

        atualizarCarga(
            'relay1',
            value
        );

    }

    // ==============================
    // RELÉ 2
    // ==============================

    if (
        topic ===
        'supervisorio/esp32-001/rele2/state'
    ) {

        atualizarCarga(
            'relay2',
            value
        );

    }

    // ==============================
    // MOTOR
    // ==============================

    if (
        topic ===
        'supervisorio/esp32-001/motor/state'
    ) {

        atualizarCarga(
            'motor',
            value
        );

    }

    // ==============================
    // VENTILADOR
    // ==============================

    if (
        topic ===
        'supervisorio/esp32-001/ventilador/state'
    ) {

        atualizarCarga(
            'fan',
            value
        );

    }

    

});

// ==============================
// CONTROLE DAS CARGAS
// ==============================

async function toggleLoad(load) {

    const topics = {

        relay1:
            'supervisorio/esp32-001/rele1/cmd',

        relay2:
            'supervisorio/esp32-001/rele2/cmd',

        motor:
            'supervisorio/esp32-001/motor/cmd',

        fan:
            'supervisorio/esp32-001/ventilador/cmd'

    };

    if (!topics[load]) {
        return;
    }

    const novoEstado =
        loads[load]
            ? 'OFF'
            : 'ON';

    console.log(
        'Enviando comando:',
        load,
        novoEstado
    );

    await window.mqtt.publish(
        topics[load],
        novoEstado
    );
}
// ==============================
// ATUALIZAR ESTADO DA CARGA
// ==============================

function atualizarCarga(load, value) {
    const estado = value.toUpperCase() === 'ON';

    loads[load] = estado;

    const status = document.getElementById(`${load}-status`);
    const loadCard = status.parentElement.parentElement;
    const button = loadCard.querySelector('button');

    if (estado) {
        // CARGA LIGADA
        status.textContent = 'LIGADO';

        button.textContent = 'DESLIGAR';
        button.classList.remove('off');
        button.classList.add('on');

        loadCard.classList.add('load-on');

    } else {
        // CARGA DESLIGADA
        status.textContent = 'DESLIGADO';

        button.textContent = 'LIGAR';
        button.classList.remove('on');
        button.classList.add('off');

        loadCard.classList.remove('load-on');
    }
}
// ==============================
// CONFIGURAÇÃO MQTT
// ==============================

const configModal =
    document.getElementById('config-modal');


const btnConfig =
    document.getElementById('btn-config');


const btnCloseConfig =
    document.getElementById('btn-close-config');


const btnSaveConfig =
    document.getElementById('btn-save-config');


const btnClearConfig =
    document.getElementById('btn-clear-config');


const btnCertificate =
    document.getElementById('btn-certificate');


const btnTestMqtt =
    document.getElementById('btn-test-mqtt');


const configMessage =
    document.getElementById('config-message');


// ==============================
// ABRIR CONFIGURAÇÃO
// ==============================

btnConfig.addEventListener('click', async () => {

    configModal.classList.remove('hidden');

    await loadMqttConfig();

});


// ==============================
// FECHAR CONFIGURAÇÃO
// ==============================

btnCloseConfig.addEventListener('click', () => {

    configModal.classList.add('hidden');

});


// ==============================
// CARREGAR CONFIGURAÇÃO
// ==============================

async function loadMqttConfig() {

    const config =
        await window.mqttConfig.get();


    document.getElementById('mqtt-host')
        .value =
        config.host || '';


    document.getElementById('mqtt-port')
        .value =
        config.port || 8883;


    document.getElementById('mqtt-username')
        .value =
        config.username || '';


    document.getElementById('mqtt-password')
        .value =
        config.password || '';


    document.getElementById('mqtt-protocol')
        .value =
        config.protocol || 'mqtts';


    document.getElementById('mqtt-tls')
        .checked =
        config.useTLS !== false;


    document.getElementById('mqtt-certificate')
        .value =
        config.caCertificate || '';

}


// ==============================
// SALVAR
// ==============================

btnSaveConfig.addEventListener('click', async () => {

    const config = {

        host:
            document.getElementById('mqtt-host')
                .value
                .trim(),

        port:
            Number(
                document.getElementById('mqtt-port')
                    .value
            ),

        username:
            document.getElementById('mqtt-username')
                .value
                .trim(),

        password:
            document.getElementById('mqtt-password')
                .value,

        protocol:
            document.getElementById('mqtt-protocol')
                .value,

        useTLS:
            document.getElementById('mqtt-tls')
                .checked,

        caCertificate:
            document.getElementById('mqtt-certificate')
                .value

    };


    await window.mqttConfig.save(config);


    showConfigMessage(
        'Configuração salva com sucesso.',
        'success'
    );

});


// ==============================
// LIMPAR
// ==============================

btnClearConfig.addEventListener('click', async () => {

    await window.mqttConfig.clear();


    document.getElementById('mqtt-host')
        .value = '';


    document.getElementById('mqtt-port')
        .value = 8883;


    document.getElementById('mqtt-username')
        .value = '';


    document.getElementById('mqtt-password')
        .value = '';


    document.getElementById('mqtt-protocol')
        .value = 'mqtts';


    document.getElementById('mqtt-tls')
        .checked = true;


    document.getElementById('mqtt-certificate')
        .value = '';


    showConfigMessage(
        'Configuração removida.',
        'success'
    );

});


// ==============================
// CERTIFICADO
// ==============================

btnCertificate.addEventListener('click', async () => {

    const path =
        await window.mqttConfig
            .selectCertificate();


    if (path) {

        document.getElementById(
            'mqtt-certificate'
        ).value = path;

    }

});


// ==============================
// TESTAR MQTT
// ==============================

btnTestMqtt.addEventListener('click', () => {

    showConfigMessage(
        'O teste MQTT será implementado na próxima etapa.',
        'info'
    );

});


// ==============================
// MENSAGEM
// ==============================

function showConfigMessage(message, type) {

    configMessage.textContent =
        message;

    configMessage.className =
        `config-message ${type}`;

}