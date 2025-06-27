// mqtt-simulator/publisher.js
// 🎯 SIMULADOR DE SENSORES ARDUINO - Simula HC-SR04 y SG90
//
// ¿Qué simula este archivo?
// - 3 sensores ultrasónicos HC-SR04 (detección de vehículos)
// - 2 servomotores SG90 (portones de entrada y salida)
// - Datos realistas que cambiarían en tu Arduino real
// - Estadísticas y métricas del sistema

const mqtt = require('mqtt');

// 🔌 Conectar al broker MQTT
console.log('🟢 ===============================================');
console.log('🎯 SIMULADOR DE SENSORES ARDUINO');
console.log('📡 Conectando al broker MQTT...');

const client = mqtt.connect('mqtt://localhost:1883', {
  clientId: `arduino_simulator_${Math.random().toString(16).substr(2, 8)}`,
  keepalive: 60,
  reconnectPeriod: 5000
});

// 🚗 Estado simulado de los espacios de estacionamiento
let parkingSpaces = [
  {
    id: 1,
    occupied: false,
    distance: 32,           // Distancia en cm del sensor HC-SR04
    sensor: 'HC-SR04-1',
    lastChange: new Date()
  },
  {
    id: 2,
    occupied: true,
    distance: 8,            // Auto cerca = ocupado
    sensor: 'HC-SR04-2',
    lastChange: new Date()
  },
  {
    id: 3,
    occupied: false,
    distance: 28,
    sensor: 'HC-SR04-3',
    lastChange: new Date()
  }
];

// 🚪 Estado de los portones (servomotores SG90)
let gateStatus = {
  entry: 'closed',    // Estados: closed, opening, open, closing
  exit: 'closed'
};

// 📊 Estadísticas del sistema
let systemStats = {
  dailyEntries: 12,           // Vehículos que entraron hoy
  totalVehiclesInside: 1,     // Vehículos actualmente dentro
  systemUptime: 0,            // Tiempo que lleva funcionando el sistema
  lastEntry: new Date(),
  lastExit: new Date()
};

// 📈 Datos de ocupación por hora (para el gráfico)
let hourlyOccupancy = Array(24).fill(0).map((_, hour) => ({
  hour: `${hour.toString().padStart(2, '0')}:00`,
  occupied: Math.floor(Math.random() * 3),
  available: 3 - Math.floor(Math.random() * 3)
}));

// ✅ Cuando nos conectamos al broker
client.on('connect', () => {
  console.log('✅ CONECTADO AL BROKER MQTT');
  console.log('🎬 Iniciando simulación de sensores...');
  console.log('===============================================\n');

  // 📤 Publicar estado inicial
  publishInitialData();

  // ⏰ Programar actualizaciones periódicas
  setInterval(simulateSensorChanges, 4000);      // Sensores cada 4 segundos
  setInterval(simulateGateActivity, 7000);       // Portones cada 7 segundos
  setInterval(updateHourlyData, 45000);          // Datos por hora cada 45 segundos
  setInterval(publishSystemStats, 10000);        // Estadísticas cada 10 segundos

  console.log('⏰ TEMPORIZADORES CONFIGURADOS:');
  console.log('   🔄 Sensores: cada 4 segundos');
  console.log('   🚪 Portones: cada 7 segundos');
  console.log('   📊 Estadísticas: cada 10 segundos');
  console.log('   📈 Datos horarios: cada 45 segundos\n');
});

// 📤 Publicar todos los datos iniciales
function publishInitialData() {
  console.log('📤 PUBLICANDO ESTADO INICIAL...');

  // Estado de cada espacio de estacionamiento
  parkingSpaces.forEach(space => {
    const payload = {
      occupied: space.occupied,
      distance: space.distance,
      sensor: space.sensor,
      timestamp: space.lastChange.toISOString(),
      battery: 85 + Math.random() * 10  // Simular batería del sensor
    };

    client.publish(`parking/spaces/${space.id}/status`, JSON.stringify(payload));
    console.log(`   🚗 Espacio ${space.id}: ${space.occupied ? 'OCUPADO' : 'LIBRE'} (${space.distance}cm)`);
  });

  // Estado de portones
  client.publish('parking/gates/entry/status', JSON.stringify({
    status: gateStatus.entry,
    timestamp: new Date().toISOString(),
    servo_angle: gateStatus.entry === 'closed' ? 0 : 90
  }));

  client.publish('parking/gates/exit/status', JSON.stringify({
    status: gateStatus.exit,
    timestamp: new Date().toISOString(),
    servo_angle: gateStatus.exit === 'closed' ? 0 : 90
  }));

  console.log(`   🚪 Portón entrada: ${gateStatus.entry.toUpperCase()}`);
  console.log(`   🚪 Portón salida: ${gateStatus.exit.toUpperCase()}`);

  // Estadísticas y datos por hora
  publishSystemStats();
  client.publish('parking/analytics/hourly', JSON.stringify(hourlyOccupancy));

  console.log('✅ Estado inicial publicado\n');
}

// 🔄 Simular cambios en los sensores HC-SR04
function simulateSensorChanges() {
  // 25% probabilidad de que algún sensor cambie
  if (Math.random() < 0.25) {
    const randomSpaceIndex = Math.floor(Math.random() * parkingSpaces.length);
    const space = parkingSpaces[randomSpaceIndex];

    // Cambiar estado del espacio
    const wasOccupied = space.occupied;
    space.occupied = !space.occupied;
    space.lastChange = new Date();

    // Ajustar distancia según el nuevo estado
    if (space.occupied) {
      // Vehículo presente: distancia corta (5-15 cm)
      space.distance = Math.floor(Math.random() * 10 + 5);
    } else {
      // Espacio libre: distancia larga (25-40 cm)
      space.distance = Math.floor(Math.random() * 15 + 25);
    }

    // 📡 Publicar el cambio
    const payload = {
      occupied: space.occupied,
      distance: space.distance,
      sensor: space.sensor,
      timestamp: space.lastChange.toISOString(),
      battery: 85 + Math.random() * 10,
      change_detected: true,
      previous_state: wasOccupied
    };

    client.publish(`parking/spaces/${space.id}/status`, JSON.stringify(payload));

    // 📊 Actualizar estadísticas
    if (!wasOccupied && space.occupied) {
      // Vehículo entró
      systemStats.dailyEntries++;
      systemStats.totalVehiclesInside++;
      systemStats.lastEntry = new Date();
      console.log(`🚗➡️  VEHÍCULO ENTRÓ en espacio ${space.id} (${space.distance}cm)`);
    } else if (wasOccupied && !space.occupied) {
      // Vehículo salió
      systemStats.totalVehiclesInside = Math.max(0, systemStats.totalVehiclesInside - 1);
      systemStats.lastExit = new Date();
      console.log(`🚗⬅️  VEHÍCULO SALIÓ del espacio ${space.id} (${space.distance}cm)`);
    }

    // Publicar estadísticas actualizadas
    publishSystemStats();
  }
}

// 🚪 Simular actividad de portones (servomotores SG90)
function simulateGateActivity() {
  // 30% probabilidad de actividad en portones
  if (Math.random() < 0.3) {
    const isEntryGate = Math.random() < 0.5;
    const gateType = isEntryGate ? 'entry' : 'exit';

    console.log(`🚪 ACTIVANDO PORTÓN DE ${gateType.toUpperCase()}...`);

    // Secuencia de apertura del portón
    simulateGateSequence(gateType);
  }
}

// 🔄 Secuencia completa de apertura/cierre de portón
function simulateGateSequence(gateType) {
  // Fase 1: Abriendo (servo de 0° a 90°)
  gateStatus[gateType] = 'opening';
  client.publish(`parking/gates/${gateType}/status`, JSON.stringify({
    status: gateStatus[gateType],
    timestamp: new Date().toISOString(),
    servo_angle: 45,  // Posición intermedia
    action: 'opening'
  }));

  console.log(`   📡 ${gateType}: ABRIENDO... (servo → 45°)`);

  // Fase 2: Abierto (servo en 90°)
  setTimeout(() => {
    gateStatus[gateType] = 'open';
    client.publish(`parking/gates/${gateType}/status`, JSON.stringify({
      status: gateStatus[gateType],
      timestamp: new Date().toISOString(),
      servo_angle: 90,  // Completamente abierto
      action: 'opened'
    }));

    console.log(`   📡 ${gateType}: ABIERTO (servo → 90°)`);

    // Fase 3: Cerrando después de 4 segundos
    setTimeout(() => {
      gateStatus[gateType] = 'closing';
      client.publish(`parking/gates/${gateType}/status`, JSON.stringify({
        status: gateStatus[gateType],
        timestamp: new Date().toISOString(),
        servo_angle: 45,  // Posición intermedia
        action: 'closing'
      }));

      console.log(`   📡 ${gateType}: CERRANDO... (servo → 45°)`);

      // Fase 4: Cerrado (servo en 0°)
      setTimeout(() => {
        gateStatus[gateType] = 'closed';
        client.publish(`parking/gates/${gateType}/status`, JSON.stringify({
          status: gateStatus[gateType],
          timestamp: new Date().toISOString(),
          servo_angle: 0,   // Completamente cerrado
          action: 'closed'
        }));

        console.log(`   📡 ${gateType}: CERRADO (servo → 0°)`);

      }, 2000);  // 2 segundos cerrando
    }, 4000);    // 4 segundos abierto
  }, 2000);      // 2 segundos abriendo
}

// 📊 Publicar estadísticas del sistema
function publishSystemStats() {
  const occupiedSpaces = parkingSpaces.filter(space => space.occupied).length;
  const availableSpaces = parkingSpaces.length - occupiedSpaces;

  const stats = {
    totalSpaces: parkingSpaces.length,
    occupiedSpaces: occupiedSpaces,
    availableSpaces: availableSpaces,
    dailyEntries: systemStats.dailyEntries,
    occupancyRate: Math.round((occupiedSpaces / parkingSpaces.length) * 100),
    systemUptime: Math.floor((Date.now() - systemStats.systemUptime) / 1000),
    lastEntry: systemStats.lastEntry.toISOString(),
    lastExit: systemStats.lastExit.toISOString(),
    timestamp: new Date().toISOString()
  };

  client.publish('parking/stats/summary', JSON.stringify(stats));
}

// 📈 Actualizar datos de ocupación por hora
function updateHourlyData() {
  const currentHour = new Date().getHours();
  const occupied = parkingSpaces.filter(space => space.occupied).length;
  const available = parkingSpaces.length - occupied;

  // Actualizar la hora actual
  hourlyOccupancy[currentHour] = {
    hour: `${currentHour.toString().padStart(2, '0')}:00`,
    occupied: occupied,
    available: available,
    timestamp: new Date().toISOString()
  };

  client.publish('parking/analytics/hourly', JSON.stringify(hourlyOccupancy));
  console.log(`📈 DATOS ACTUALIZADOS para las ${currentHour}:00 - Ocupados: ${occupied}/${parkingSpaces.length}`);
}

// ❌ Manejo de errores
client.on('error', (error) => {
  console.error('🔴 ERROR MQTT:', error.message);
  console.log('💡 Verifica que el broker esté corriendo: node broker.js');
});

client.on('offline', () => {
  console.log('📴 DESCONECTADO del broker MQTT');
});

client.on('reconnect', () => {
  console.log('🔄 RECONECTANDO al broker MQTT...');
});

// 🛑 Cerrar correctamente cuando se termina el programa
process.on('SIGINT', () => {
  console.log('\n🛑 CERRANDO SIMULADOR DE SENSORES...');
  console.log('📊 ESTADÍSTICAS FINALES:');
  console.log(`   🚗 Entradas del día: ${systemStats.dailyEntries}`);
  console.log(`   🅿️  Espacios ocupados: ${parkingSpaces.filter(s => s.occupied).length}/${parkingSpaces.length}`);
  console.log(`   ⏰ Tiempo funcionando: ${Math.floor((Date.now() - Date.now()) / 1000)} segundos`);

  client.end();
  console.log('✅ SIMULADOR CERRADO CORRECTAMENTE');
  console.log('👋 ¡Hasta luego!');
  process.exit(0);
});

// 🚀 Inicializar tiempo de inicio del sistema
systemStats.systemUptime = Date.now();

console.log('🎯 SIMULADOR CONFIGURADO:');
console.log(`   🚗 ${parkingSpaces.length} espacios de estacionamiento`);
console.log(`   🚪 2 portones (entrada y salida)`);
console.log(`   📡 Topics MQTT configurados`);
console.log(`   ⏰ Actualizaciones automáticas programadas`);
console.log('\n⏳ Esperando conexión al broker...\n');
