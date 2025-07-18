// mqtt-simulator/esp32-test-simulator.js
// 🧪 SIMULADOR DE PRUEBA ESP32 - Para probar el procesador
//
// Este archivo simula el ESP32 enviando datos en el formato real
// que recibes: OCC:1:1:2:0:3:0;
// Úsalo para probar el procesador mientras configuras la conexión real

const mqtt = require('mqtt');

console.log('🟢 ===============================================');
console.log('🧪 SIMULADOR DE PRUEBA ESP32');
console.log('📡 Conectando al broker MQTT...');

const client = mqtt.connect('mqtt://localhost:1883', {
  clientId: 'ESP32Client',  // Mismo cliente ID que aparece en tus logs
  keepalive: 60,
  reconnectPeriod: 2000
});

// 🎲 Diferentes escenarios de prueba (formato exacto del ESP32)
const parkingScenarios = [
  'OCC:1:1:2:0:3:0;',  // Solo espacio 1 ocupado
  'OCC:1:0:2:1:3:0;',  // Solo espacio 2 ocupado
  'OCC:1:0:2:0:3:1;',  // Solo espacio 3 ocupado
  'OCC:1:1:2:1:3:0;',  // Espacios 1 y 2 ocupados
  'OCC:1:1:2:1:3:1;',  // Todos ocupados
  'OCC:1:0:2:0:3:0;',  // Todos libres
];

// 🚪 Escenarios de barreras (nuevo formato: BAR:1:0:2:0;)
const barrierScenarios = [
  'BAR:1:0:2:0;',  // Ambas cerradas
  'BAR:1:1:2:0;',  // Entrada abierta, salida cerrada
  'BAR:1:0:2:1;',  // Entrada cerrada, salida abierta
  'BAR:1:1:2:1;',  // Ambas abiertas
];

let currentParkingScenario = 0;
let currentBarrierScenario = 0;

// ✅ Cuando nos conectamos
client.on('connect', () => {
  console.log('✅ CONECTADO AL BROKER MQTT');
  console.log('🎬 Simulando datos exactos del ESP32...');
  console.log('===============================================\n');

  // 📤 Enviar datos de estacionamiento cada 5 segundos
  setInterval(() => {
    const message = parkingScenarios[currentParkingScenario];

    console.log(`[P${currentParkingScenario}] 📨 MENSAJE ESTACIONAMIENTO:`);
    console.log(`[P${currentParkingScenario}]    📍 Topic: esp32/data`);
    console.log(`[P${currentParkingScenario}]    💬 Mensaje: ${message}`);
    console.log(`[P${currentParkingScenario}]    👤 Cliente: ESP32Client`);
    console.log(`[P${currentParkingScenario}]    ⏰ Hora: ${new Date().toLocaleTimeString()}\n`);

    // Publicar en el mismo topic que usa tu ESP32 real
    client.publish('esp32/data', message);

    // Cambiar al siguiente escenario de estacionamiento
    currentParkingScenario = (currentParkingScenario + 1) % parkingScenarios.length;

  }, 5000); // Cada 5 segundos

  // 🚪 Enviar datos de barreras cada 7 segundos (diferente timing)
  setInterval(() => {
    const message = barrierScenarios[currentBarrierScenario];

    console.log(`[B${currentBarrierScenario}] 📨 MENSAJE BARRERA:`);
    console.log(`[B${currentBarrierScenario}]    📍 Topic: esp32/data`);
    console.log(`[B${currentBarrierScenario}]    💬 Mensaje: ${message}`);
    console.log(`[B${currentBarrierScenario}]    👤 Cliente: ESP32Client`);
    console.log(`[B${currentBarrierScenario}]    ⏰ Hora: ${new Date().toLocaleTimeString()}\n`);

    // Publicar en el mismo topic que usa tu ESP32 real
    client.publish('esp32/data', message);

    // Cambiar al siguiente escenario de barrera
    currentBarrierScenario = (currentBarrierScenario + 1) % barrierScenarios.length;

  }, 7000); // Cada 7 segundos

  console.log('⏰ ENVIANDO DATOS:');
  console.log('   🚗 Estacionamiento: cada 5 segundos');
  console.log('   🚪 Barreras: cada 7 segundos');
  console.log('   📡 Topic: esp32/data (igual que ESP32 real)');
  console.log('   📋 Formatos: OCC:1:X:2:Y:3:Z; y BAR1:X; BAR2:Y;');
  console.log('   🎭 Cicla entre todos los escenarios\n');
});

// 📤 Enviar datos en formato ESP32
function sendESP32Data() {
  // Construir mensaje en formato: OCC:1:X:2:Y:3:Z;
  const message = `OCC:1:${currentStates[0]}:2:${currentStates[1]}:3:${currentStates[2]};`;

  client.publish('esp32/parking/occupancy', message);

  const timestamp = new Date().toLocaleTimeString();
  console.log(`📡 [${timestamp}] ENVIADO: ${message}`);

  // Mostrar estado actual de forma visual
  const statusDisplay = currentStates.map((state, index) =>
    `E${index + 1}:${state === 1 ? '🚗' : '🅿️'}`
  ).join(' ');
  console.log(`   📊 Estado: ${statusDisplay}`);
}

// ❌ Manejo de errores
client.on('error', (error) => {
  console.error('🔴 ERROR MQTT:', error.message);
});

client.on('offline', () => {
  console.log('📴 DESCONECTADO del broker MQTT');
});

// 🛑 Cerrar correctamente
process.on('SIGINT', () => {
  console.log('\n🛑 CERRANDO SIMULADOR DE PRUEBA ESP32...');
  console.log('📊 RESUMEN FINAL:');

  const finalStatus = currentStates.map((state, index) =>
    `   🅿️  Espacio ${index + 1}: ${state === 1 ? 'OCUPADO 🚗' : 'LIBRE ⬜'}`
  ).join('\n');

  console.log(finalStatus);

  client.end();
  console.log('✅ SIMULADOR CERRADO CORRECTAMENTE');
  console.log('👋 ¡Hasta luego!');
  process.exit(0);
});

console.log('🎯 SIMULADOR DE PRUEBA CONFIGURADO:');
console.log('   📡 Simula mensajes del ESP32 real');
console.log('   🔄 Cambios aleatorios de estado');
console.log('   📋 Formato: OCC:1:X:2:Y:3:Z;');
console.log('   ⏰ Envío automático cada 3 segundos');
console.log('\n⏳ Esperando conexión...\n');
