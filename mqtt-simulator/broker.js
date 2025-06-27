// mqtt-simulator/broker.js (VERSIÓN ARREGLADA)
// 🏗️ BROKER MQTT usando Aedes (más moderno que Mosca)

const aedes = require('aedes')();
const net = require('net');

// 🚀 Crear servidor TCP para MQTT
const server = net.createServer(aedes.handle);
const port = 1883;

// 📡 Iniciar el servidor
server.listen(port, () => {
  console.log('🟢 ===============================================');
  console.log('🚀 BROKER MQTT INICIADO CORRECTAMENTE');
  console.log(`📡 Puerto: ${port}`);
  console.log(`🌐 Dirección: mqtt://localhost:${port}`);
  console.log('💡 Los dispositivos ya pueden conectarse...');
  console.log('===============================================');
});

// 👤 Cuando un cliente se conecta
aedes.on('client', (client) => {
  console.log('✅ CLIENTE CONECTADO:', client.id);
  console.log(`   📅 Hora: ${new Date().toLocaleTimeString()}`);
});

// 👋 Cuando un cliente se desconecta
aedes.on('clientDisconnect', (client) => {
  console.log('❌ CLIENTE DESCONECTADO:', client.id);
  console.log(`   📅 Hora: ${new Date().toLocaleTimeString()}`);
});

// 📤 Cuando alguien publica un mensaje
aedes.on('publish', (packet, client) => {
  // Solo mostrar mensajes de clientes reales (no del sistema)
  if (client && packet.topic && !packet.topic.startsWith('$SYS')) {
    const clientId = client.id || 'desconocido';
    const topic = packet.topic;
    const message = packet.payload.toString();

    console.log('📨 MENSAJE PUBLICADO:');
    console.log(`   📍 Topic: ${topic}`);
    console.log(`   💬 Mensaje: ${message}`);
    console.log(`   👤 Cliente: ${clientId}`);
    console.log(`   ⏰ Hora: ${new Date().toLocaleTimeString()}`);
    console.log('   ─────────────────────────────────────');
  }
});

// 🔔 Cuando alguien se suscribe a un topic
aedes.on('subscribe', (subscriptions, client) => {
  if (client) {
    subscriptions.forEach(sub => {
      if (!sub.topic.startsWith('$SYS')) {
        console.log('🔔 NUEVA SUSCRIPCIÓN:');
        console.log(`   📍 Topic: ${sub.topic}`);
        console.log(`   👤 Cliente: ${client.id}`);
        console.log(`   ⏰ Hora: ${new Date().toLocaleTimeString()}`);
      }
    });
  }
});

// ❌ Manejo de errores
aedes.on('error', (error) => {
  console.log('🔴 ERROR EN EL BROKER:', error.message);
});

server.on('error', (error) => {
  console.log('🔴 ERROR EN EL SERVIDOR:', error.message);
});

// 🛑 Cerrar el broker correctamente
process.on('SIGINT', () => {
  console.log('\n🛑 CERRANDO BROKER MQTT...');
  console.log('⏳ Esperando que terminen las conexiones...');

  aedes.close(() => {
    server.close(() => {
      console.log('✅ BROKER CERRADO CORRECTAMENTE');
      console.log('👋 ¡Hasta luego!');
      process.exit(0);
    });
  });
});

// 📋 Información adicional
console.log('\n📋 INFORMACIÓN DEL BROKER:');
console.log('   🔧 Motor: Aedes (moderno y rápido)');
console.log('   💾 Persistencia: Memoria');
console.log('   🔒 Seguridad: Sin autenticación (desarrollo)');
console.log('   📚 Topics esperados:');
console.log('      • parking/spaces/+/status');
console.log('      • parking/gates/+/status');
console.log('      • parking/stats/summary');
console.log('      • parking/analytics/hourly');
console.log('\n⏳ Esperando conexiones...\n');
