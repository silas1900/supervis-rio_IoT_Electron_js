#include <WiFi.h>
#include <PubSubClient.h>
#include <WiFiClientSecure.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ============================================
// CREDENCIAIS DO WIFI
// ============================================
const char* ssid     = "suaredewifi"; // sua rede
const char* password = "********************"; // senha wifi

// ============================================
// CREDENCIAIS DO HIVEMQ CLOUD
// ============================================
const char* mqtt_broker   = "suacredenciais.s1.eu.hivemq.cloud";//credenciais
const int   mqtt_port     = 8883;
const char* mqtt_username = "********"; // username do broker mqtt
const char* mqtt_password = "**************"; // senhar do seu broker

// ============================================
// DS18B20
// ============================================
#define ONE_WIRE_BUS 4
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// ============================================
// PINOS DAS CARGAS
// ============================================
#define RELE1_PIN       2
#define RELE2_PIN       15
#define MOTOR_PIN       16
#define VENTILADOR_PIN  17

// ============================================
// TÓPICOS MQTT
// ============================================
const char* topic_temp        = "supervisorio/esp32-001/temperatura";

const char* topic_rele1_cmd   = "supervisorio/esp32-001/rele1/cmd";
const char* topic_rele1_state = "supervisorio/esp32-001/rele1/state";

const char* topic_rele2_cmd   = "supervisorio/esp32-001/rele2/cmd";
const char* topic_rele2_state = "supervisorio/esp32-001/rele2/state";

const char* topic_motor_cmd   = "supervisorio/esp32-001/motor/cmd";
const char* topic_motor_state = "supervisorio/esp32-001/motor/state";

const char* topic_vent_cmd    = "supervisorio/esp32-001/ventilador/cmd";
const char* topic_vent_state  = "supervisorio/esp32-001/ventilador/state";

const char* topic_status      = "supervisorio/esp32-001/status";

// ============================================
// ESTADOS ATUAIS
// ============================================
bool estadoRele1 = false;
bool estadoRele2 = false;
bool estadoMotor = false;
bool estadoVent  = false;

WiFiClientSecure espClient;
PubSubClient client(espClient);

// ============================================
// WIFI
// ============================================
void setup_wifi() {

  delay(10);

  Serial.println();
  Serial.print("Conectando à rede: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi conectado");

  Serial.print("Endereço IP: ");
  Serial.println(WiFi.localIP());
}

// ============================================
// CALLBACK - MENSAGENS RECEBIDAS
// ============================================
void callback(char* topic, byte* payload, unsigned int length) {

  char payloadStr[length + 1];

  memcpy(payloadStr, payload, length);
  payloadStr[length] = '\0';

  Serial.print("Mensagem recebida [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(payloadStr);

  bool ligar = (String(payloadStr) == "ON");

  // ==========================================
  // RELÉ 1
  // ==========================================
  if (strcmp(topic, topic_rele1_cmd) == 0) {

    estadoRele1 = ligar;

    digitalWrite(
      RELE1_PIN,
      ligar ? HIGH : LOW
    );

    client.publish(
      topic_rele1_state,
      ligar ? "ON" : "OFF",
      true
    );
  }

  // ==========================================
  // RELÉ 2
  // ==========================================
  else if (strcmp(topic, topic_rele2_cmd) == 0) {

    estadoRele2 = ligar;

    digitalWrite(
      RELE2_PIN,
      ligar ? HIGH : LOW
    );

    client.publish(
      topic_rele2_state,
      ligar ? "ON" : "OFF",
      true
    );
  }

  // ==========================================
  // MOTOR
  // ==========================================
  else if (strcmp(topic, topic_motor_cmd) == 0) {

    estadoMotor = ligar;

    digitalWrite(
      MOTOR_PIN,
      ligar ? HIGH : LOW
    );

    client.publish(
      topic_motor_state,
      ligar ? "ON" : "OFF",
      true
    );
  }

  // ==========================================
  // VENTILADOR
  // ==========================================
  else if (strcmp(topic, topic_vent_cmd) == 0) {

    estadoVent = ligar;

    digitalWrite(
      VENTILADOR_PIN,
      ligar ? HIGH : LOW
    );

    client.publish(
      topic_vent_state,
      ligar ? "ON" : "OFF",
      true
    );
  }
}

// ============================================
// RECONEXÃO MQTT
// ============================================
void reconnect() {

  while (!client.connected()) {

    Serial.print("Conectando ao broker MQTT...");

    // ==================================================
    // LWT
    //
    // Se o ESP32 perder a conexão inesperadamente,
    // o HiveMQ publicará:
    //
    // supervisorio/esp32-001/status = offline
    //
    // O true faz essa mensagem ficar retida.
    // ==================================================

    if (client.connect(
          "ESP32-001",
          mqtt_username,
          mqtt_password,
          topic_status,
          0,
          true,
          "offline"
        )) {

      Serial.println(" conectado");

      // ==================================================
      // PUBLICA ONLINE
      // ==================================================
      client.publish(
        topic_status,
        "online",
        true
      );

      // ==================================================
      // SUBSCRIBE DOS COMANDOS
      // ==================================================
      client.subscribe(topic_rele1_cmd);
      client.subscribe(topic_rele2_cmd);
      client.subscribe(topic_motor_cmd);
      client.subscribe(topic_vent_cmd);

      // ==================================================
      // PUBLICA ESTADOS ATUAIS DAS CARGAS
      // ==================================================
      client.publish(
        topic_rele1_state,
        estadoRele1 ? "ON" : "OFF",
        true
      );

      client.publish(
        topic_rele2_state,
        estadoRele2 ? "ON" : "OFF",
        true
      );

      client.publish(
        topic_motor_state,
        estadoMotor ? "ON" : "OFF",
        true
      );

      client.publish(
        topic_vent_state,
        estadoVent ? "ON" : "OFF",
        true
      );

      Serial.println("Status publicado: ONLINE");
      Serial.println("LWT configurado: OFFLINE");

    } else {

      Serial.print(" falha, rc=");
      Serial.print(client.state());

      Serial.println(
        " tentando novamente em 5 segundos"
      );

      delay(5000);
    }
  }
}

// ============================================
// SETUP
// ============================================
void setup() {

  Serial.begin(115200);

  delay(500);

  // ==========================================
  // PINOS DAS CARGAS
  // ==========================================
  pinMode(RELE1_PIN, OUTPUT);
  pinMode(RELE2_PIN, OUTPUT);
  pinMode(MOTOR_PIN, OUTPUT);
  pinMode(VENTILADOR_PIN, OUTPUT);

  digitalWrite(RELE1_PIN, LOW);
  digitalWrite(RELE2_PIN, LOW);
  digitalWrite(MOTOR_PIN, LOW);
  digitalWrite(VENTILADOR_PIN, LOW);

  // ==========================================
  // DS18B20
  // ==========================================
  sensors.begin();

  // ==========================================
  // WIFI
  // ==========================================
  setup_wifi();

  // ==========================================
  // MQTT
  // ==========================================
  espClient.setInsecure();

  client.setServer(
    mqtt_broker,
    mqtt_port
  );

  client.setCallback(callback);
}

// ============================================
// LOOP
// ============================================
void loop() {

  // ==========================================
  // VERIFICA MQTT
  // ==========================================
  if (!client.connected()) {
    reconnect();
  }

  client.loop();

  // ==========================================
  // PUBLICAÇÃO DA TEMPERATURA
  // ==========================================
  static unsigned long lastPublish = 0;

  if (millis() - lastPublish > 5000) {

    lastPublish = millis();

    sensors.requestTemperatures();

    float tempC =
      sensors.getTempCByIndex(0);

    if (tempC != DEVICE_DISCONNECTED_C) {

      char buf[16];

      dtostrf(
        tempC,
        4,
        2,
        buf
      );

      client.publish(
        topic_temp,
        buf
      );

      Serial.print("Temperatura publicada: ");
      Serial.print(buf);
      Serial.println(" C");

    } else {

      Serial.println(
        "DS18B20 desconectado!"
      );
    }
  }
}