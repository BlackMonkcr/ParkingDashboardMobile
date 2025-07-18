// mqtt-simulator/system-monitor.js
// 🔍 MONITOR DEL SISTEMA ESP32
//
// Este archivo monitorea que todos los componentes estén funcionando
// y proporciona información de estado del sistema

const mqtt = require('mqtt');

console.log('🔍 ===============================================');
console.log('🔍 MONITOR DEL SISTEMA ESP32');
console.log('📡 Conectando al broker MQTT...');

const client = mqtt.connect('mqtt://localhost:1883', {
  clientId: `system_monitor_${Math.random().toString(16).substr(2, 8)}`,
  keepalive: 60,
  reconnectPeriod: 2000
});

// 📊 Estado del sistema
let systemState = {
  broker: { connected: false, lastSeen: null },
  esp32Processor: { active: false, lastSeen: null },
  esp32Device: { active: false, lastMessage: null, lastSeen: null },
  webSocketBridge: { active: false, lastSeen: null }
};

// 📋 Estadísticas de mensajes
let messageStats = {
  esp32Messages: 0,
  processedSpaces: 0,
  systemStats: 0,
  hourlyData: 0,
  gateUpdates: 0
};

client.on('connect', () => {
  console.log('✅ MONITOR CONECTADO AL BROKER MQTT');
  systemState.broker.connected = true;
  systemState.broker.lastSeen = new Date();

  // 👂 Suscribirse a todos los topics relevantes
  const topics = [
    'esp32/data',                    // Datos del ESP32 real
    'parking/spaces/+/status',       // Estado de espacios
    'parking/system/stats',          // Estadísticas del sistema
    'parking/hourly/data',           // Datos por hora
    'parking/gates/+/status',        // Estado de portones
    '$SYS/broker/clients/connected', // Clientes conectados (si disponible)
  ];

  topics.forEach(topic => {
    client.subscribe(topic, (err) => {
      if (!err) {
        console.log(`✅ Monitoreando: ${topic}`);
      }
    });
  });

  console.log('🎬 Monitor iniciado - presiona Ctrl+C para salir\n');

  // 📊 Mostrar estadísticas cada 10 segundos
  setInterval(showSystemStatus, 10000);

  // 🔔 Mostrar resumen inicial
  setTimeout(showSystemStatus, 2000);
});

// 📨 Procesar mensajes
client.on('message', (topic, message) => {
  const now = new Date();
  const messageStr = message.toString();

  if (topic === 'esp32/data') {
    // Datos del ESP32 real
    systemState.esp32Device.active = true;
    systemState.esp32Device.lastMessage = messageStr;
    systemState.esp32Device.lastSeen = now;
    messageStats.esp32Messages++;

    console.log(`📥 ESP32: ${messageStr} (${now.toLocaleTimeString()})`);

  } else if (topic.startsWith('parking/spaces/')) {
    // Datos procesados de espacios
    systemState.esp32Processor.active = true;
    systemState.esp32Processor.lastSeen = now;
    messageStats.processedSpaces++;

    const spaceId = topic.split('/')[2];
    const data = JSON.parse(messageStr);
    console.log(`🚗 Espacio ${spaceId}: ${data.occupied ? 'OCUPADO' : 'LIBRE'} (${now.toLocaleTimeString()})`);

  } else if (topic === 'parking/system/stats') {
    // Estadísticas del sistema
    messageStats.systemStats++;

  } else if (topic === 'parking/hourly/data') {
    // Datos por hora
    messageStats.hourlyData++;

  } else if (topic.startsWith('parking/gates/')) {
    // Estado de portones
    messageStats.gateUpdates++;
    const gateType = topic.split('/')[2];
    const data = JSON.parse(messageStr);
    console.log(`🚪 Portón ${gateType}: ${data.status} (${now.toLocaleTimeString()})`);
  }
});

// 📊 Mostrar estado del sistema
function showSystemStatus() {
  const now = new Date();

  console.log('\n🔍 ===============================================');
  console.log('📊 ESTADO DEL SISTEMA ESP32');
  console.log('===============================================');

  // Estado de componentes
  console.log('🏗️  COMPONENTES:');
  console.log(`   📡 Broker MQTT: ${systemState.broker.connected ? '🟢 CONECTADO' : '🔴 DESCONECTADO'}`);
  console.log(`   🎯 Procesador ESP32: ${systemState.esp32Processor.active ? '🟢 ACTIVO' : '🔴 INACTIVO'}`);
  console.log(`   📱 Dispositivo ESP32: ${systemState.esp32Device.active ? '🟢 ENVIANDO DATOS' : '🔴 SIN DATOS'}`);

  if (systemState.esp32Device.lastMessage) {
    console.log(`      💬 Último mensaje: ${systemState.esp32Device.lastMessage}`);
  }

  // Estadísticas de mensajes
  console.log('\n📈 ESTADÍSTICAS DE MENSAJES:');
  console.log(`   📥 Mensajes ESP32: ${messageStats.esp32Messages}`);
  console.log(`   🚗 Espacios procesados: ${messageStats.processedSpaces}`);
  console.log(`   📊 Estadísticas del sistema: ${messageStats.systemStats}`);
  console.log(`   📈 Datos por hora: ${messageStats.hourlyData}`);
  console.log(`   🚪 Actualizaciones de portones: ${messageStats.gateUpdates}`);

  // Tiempo desde última actividad
  if (systemState.esp32Device.lastSeen) {
    const timeSinceLastESP32 = (now - systemState.esp32Device.lastSeen) / 1000;
    console.log(`\n⏰ ÚLTIMA ACTIVIDAD ESP32: hace ${timeSinceLastESP32.toFixed(1)} segundos`);

    if (timeSinceLastESP32 > 30) {
      console.log('   ⚠️  WARNING: Sin datos del ESP32 por más de 30 segundos');
    }
  }

  console.log(`\n🕐 Actualizado: ${now.toLocaleTimeString()}`);
  console.log('===============================================\n');
}

// ❌ Manejo de errores
client.on('error', (error) => {
  console.error('❌ Error de conexión:', error);
  systemState.broker.connected = false;
});

client.on('close', () => {
  console.log('🔌 Conexión al broker cerrada');
  systemState.broker.connected = false;
});

// 🛑 Manejo de cierre limpio
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando monitor del sistema...');
  client.end();
  process.exit(0);
});

console.log('\n💡 INSTRUCCIONES DEL MONITOR:');
console.log('   🔍 Este monitor verifica que todos los componentes funcionen');
console.log('   📊 Muestra estadísticas cada 10 segundos');
console.log('   ⚠️  Alerta si no hay datos del ESP32 por >30 segundos');
console.log('   🛑 Presiona Ctrl+C para salir\n');
