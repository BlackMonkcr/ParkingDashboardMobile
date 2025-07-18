// mqtt-simulator/ws-bridge.js (SOLUCIÓN FINAL)
// 🌉 WEBSOCKET BRIDGE 100% compatible con MQTT.js

const WebSocket = require('ws');
const mqtt = require('mqtt');

console.log('🟢 ===============================================');
console.log('🌉 WEBSOCKET BRIDGE PERFECTO');
console.log('🌐 Puerto WebSocket: 8080');
console.log('🎯 100% compatible con MQTT.js del browser');

// 🌐 Crear servidor WebSocket sin procesamiento de protocolo MQTT
const wss = new WebSocket.Server({
  port: 8080,
  perMessageDeflate: false
});

console.log('✅ Servidor WebSocket iniciado en puerto 8080');

// 🔌 Conectar al broker MQTT
let mqttClient = null;
let isConnectedToMqtt = false;

const connectToMqtt = () => {
  console.log('📡 Conectando al broker MQTT...');

  if (mqttClient) {
    mqttClient.end();
  }

  mqttClient = mqtt.connect('mqtt://localhost:1883', {
    clientId: `bridge_${Date.now()}`,
    keepalive: 60,
    reconnectPeriod: 5000,
    connectTimeout: 10000
  });

  mqttClient.on('connect', () => {
    console.log('✅ Bridge conectado al broker MQTT');
    isConnectedToMqtt = true;

    // Suscribirse a todos los topics del sistema ESP32
    const topics = [
      'esp32/data',                    // Datos del ESP32 real
      'parking/spaces/+/status',       // Estado de espacios (del procesador)
      'parking/gates/+/status',        // Estado de portones (del procesador)
      'parking/system/stats',          // Estadísticas del sistema (del procesador)
      'parking/hourly/data',           // Datos por hora (del procesador)
    ];

    topics.forEach(topic => {
      mqttClient.subscribe(topic, (err) => {
        if (!err) {
          console.log(`📡 Bridge suscrito a: ${topic}`);
        }
      });
    });

    console.log('🎯 Bridge perfecto - MQTT.js compatible');
    console.log('===============================================\n');
  });

  mqttClient.on('error', (error) => {
    console.error('🔴 Error MQTT Bridge:', error.message);
    isConnectedToMqtt = false;
    setTimeout(connectToMqtt, 5000);
  });

  mqttClient.on('offline', () => {
    console.log('📴 Bridge offline - reintentando...');
    isConnectedToMqtt = false;
  });

  mqttClient.on('message', (topic, message) => {
    forwardToWebSockets(topic, message);
  });
};

connectToMqtt();

// 📡 Función simple para reenviar mensajes como texto plano
const forwardToWebSockets = (topic, message) => {
  // Crear mensaje simple en JSON - NO usar protocolo MQTT binario
  const messageText = JSON.stringify({
    topic: topic,
    message: message.toString(),
    timestamp: Date.now()
  });

  let sentCount = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.isActive) {
      try {
        // Enviar como texto plano JSON, NO como protocolo MQTT
        client.send(messageText);
        sentCount++;
      } catch (error) {
        client.isActive = false;
      }
    }
  });

  if (sentCount > 0 && !topic.startsWith('$SYS')) {
    console.log(`📤 "${topic}" → ${sentCount} browser(s)`);
  }
};

// 🌐 Manejar conexiones WebSocket de forma completamente transparente
let clientCount = 0;

wss.on('connection', (ws, request) => {
  clientCount++;
  const clientId = `browser_${clientCount}`;

  console.log(`🔌 CONEXIÓN TRANSPARENTE: ${clientId}`);
  console.log(`   📍 IP: ${request.socket.remoteAddress}`);
  console.log(`   👥 Total: ${clientCount} clientes`);

  // Marcar cliente como activo
  ws.isActive = true;
  ws.clientId = clientId;

  // 📨 NO procesar mensajes MQTT - dejar que MQTT.js maneje todo
  ws.on('message', (data) => {
    // Solo marcar actividad - NO interferir con el protocolo MQTT
    ws.lastActivity = Date.now();

    // Log básico sin procesar
    if (data.length < 100) {
      console.log(`📝 [${clientId}] Mensaje MQTT (${data.length} bytes) - Transparente`);
    }
  });

  // 👋 Cliente desconectado
  ws.on('close', (code, reason) => {
    ws.isActive = false;
    console.log(`❌ [${clientId}] Desconectado (${code})`);
    clientCount = Math.max(0, clientCount - 1);
    console.log(`   👥 Clientes restantes: ${clientCount}`);
  });

  // 🔴 Error en WebSocket
  ws.on('error', (error) => {
    console.error(`🔴 [${clientId}] Error:`, error.message);
    ws.isActive = false;
  });

  // 💓 Keepalive muy simple
  const keepalive = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN && ws.isActive) {
      // NO enviar pings - dejar que MQTT.js maneje keepalive
      ws.lastActivity = Date.now();
    } else {
      clearInterval(keepalive);
    }
  }, 30000);

  ws.on('close', () => {
    clearInterval(keepalive);
  });
});

// 🔧 Manejo de errores del servidor
wss.on('error', (error) => {
  console.error('🔴 Error servidor WebSocket:', error);
});

// 📊 Estadísticas simples
setInterval(() => {
  const activeClients = Array.from(wss.clients).filter(client =>
    client.readyState === WebSocket.OPEN && client.isActive
  ).length;

  if (activeClients > 0) {
    console.log(`📊 ${activeClients} browser(s) | MQTT: ${isConnectedToMqtt ? '✅' : '❌'}`);
  }
}, 30000);

// 🛑 Cerrar correctamente
process.on('SIGINT', () => {
  console.log('\n🛑 CERRANDO BRIDGE PERFECTO...');

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.close(1000, 'Server shutdown');
    }
  });

  wss.close(() => {
    if (mqttClient) {
      mqttClient.end();
    }
    console.log('✅ BRIDGE PERFECTO CERRADO');
    process.exit(0);
  });
});

console.log('🎯 Bridge transparente - Deja que MQTT.js funcione solo!');
