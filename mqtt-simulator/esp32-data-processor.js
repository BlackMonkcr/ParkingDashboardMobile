// mqtt-simulator/esp32-data-processor.js
// 🎯 PROCESADOR DE DATOS ESP32 - Adapta datos reales del ESP32
//
// Este archivo procesa los datos reales del ESP32 y los convierte
// al formato que espera tu aplicación, manteniendo compatibilidad
// con el simulador original pero usando datos reales del dispositivo.

const mqtt = require('mqtt');

// 🔌 Conectar al broker MQTT
console.log('🟢 ===============================================');
console.log('🎯 PROCESADOR DE DATOS ESP32');
console.log('📡 Conectando al broker MQTT...');

const client = mqtt.connect('mqtt://localhost:1883', {
  clientId: `esp32_processor_${Math.random().toString(16).substr(2, 8)}`,
  keepalive: 60,
  reconnectPeriod: 5000
});

// 🚗 Estado actual de los espacios (basado en datos reales del ESP32)
let parkingSpaces = [
  {
    id: 1,
    occupied: false,
    distance: 32,           // Se calculará basado en el estado real
    sensor: 'ESP32-SENSOR-1',
    lastChange: new Date(),
    realData: true          // Indica que viene del ESP32
  },
  {
    id: 2,
    occupied: false,
    distance: 32,
    sensor: 'ESP32-SENSOR-2',
    lastChange: new Date(),
    realData: true
  },
  {
    id: 3,
    occupied: false,
    distance: 32,
    sensor: 'ESP32-SENSOR-3',
    lastChange: new Date(),
    realData: true
  }
];

// 🚪 Estado de los portones (simulado por ahora)
let gateStatus = {
  entry: 'closed',
  exit: 'closed'
};

// 📊 Estadísticas del sistema (calculadas con datos reales)
let systemStats = {
  dailyEntries: 0,            // Se calculará con los cambios reales
  totalVehiclesInside: 0,     // Suma de espacios ocupados reales
  systemUptime: 0,
  lastEntry: new Date(),
  lastExit: new Date(),
  totalChangesToday: 0,       // Nuevas estadísticas
  peakOccupancy: 0,
  averageOccupancyToday: 0
};

// 📈 Datos de ocupación por hora (basados en datos reales)
let hourlyOccupancy = Array(24).fill(0).map((_, hour) => ({
  hour: `${hour.toString().padStart(2, '0')}:00`,
  occupied: 0,
  available: 3,
  timestamp: new Date().toISOString()
}));

// 🕒 Control de tiempo para estadísticas
let hourlyData = {};
let dailyData = {
  startTime: new Date(),
  totalOccupancyMinutes: 0,
  samples: 0
};

// ✅ Cuando nos conectamos al broker
client.on('connect', () => {
  console.log('✅ CONECTADO AL BROKER MQTT');
  console.log('👂 Suscribiéndose a datos del ESP32...');

  // 🔔 Suscribirse al topic donde el ESP32 envía los datos reales
  client.subscribe('esp32/data', (err) => {
    if (err) {
      console.error('❌ Error al suscribirse a esp32/data:', err);
    } else {
      console.log('✅ Suscrito a: esp32/data (topic real del ESP32)');
    }
  });

  // También suscribirse a topics alternativos por compatibilidad
  client.subscribe('esp32/parking/occupancy', (err) => {
    if (!err) {
      console.log('✅ Suscrito también a: esp32/parking/occupancy (backup)');
    }
  });

  client.subscribe('parking/esp32/data', (err) => {
    if (!err) {
      console.log('✅ Suscrito también a: parking/esp32/data (backup)');
    }
  });

  console.log('🎬 Iniciando procesamiento de datos reales...');
  console.log('===============================================\n');

  // 📤 Publicar estado inicial
  publishInitialData();

  // ⏰ Programar tareas periódicas
  setInterval(simulateGateActivity, 8000);       // Portones cada 8 segundos (simulado)
  setInterval(updateHourlyData, 30000);          // Datos por hora cada 30 segundos
  setInterval(publishSystemStats, 5000);         // Estadísticas cada 5 segundos
  setInterval(calculateDailyStats, 60000);       // Estadísticas diarias cada minuto

  console.log('⏰ TEMPORIZADORES CONFIGURADOS:');
  console.log('   📊 Estadísticas: cada 5 segundos');
  console.log('   📈 Datos horarios: cada 30 segundos');
  console.log('   🚪 Portones (simulados): cada 8 segundos');
  console.log('   📋 Estadísticas diarias: cada minuto\n');
});

// 📨 Procesar mensajes del ESP32
client.on('message', (topic, message) => {
  // Verificar si el mensaje viene del ESP32
  if (topic === 'esp32/data' || topic === 'esp32/parking/occupancy' || topic === 'parking/esp32/data') {
    const rawData = message.toString().trim();
    console.log(`📨 DATOS RECIBIDOS DEL ESP32:`);
    console.log(`   📍 Topic: ${topic}`);
    console.log(`   💬 Mensaje: ${rawData}`);
    console.log(`   ⏰ Hora: ${new Date().toLocaleTimeString()}`);

    try {
      // Verificar tipo de mensaje y procesar accordingly
      if (rawData.startsWith('OCC:') && rawData.endsWith(';')) {
        parseESP32Data(rawData);
      } else if (rawData.startsWith('BAR:') && rawData.endsWith(';')) {
        parseBarrierData(rawData);
      } else {
        console.log('⚠️ Formato de mensaje no reconocido:', rawData);
      }
    } catch (error) {
      console.error('❌ Error procesando datos del ESP32:', error.message);
      console.log('   Datos recibidos:', rawData);
    }
  }
});

// 🔍 Validar formato de datos ESP32
function isValidESP32Format(rawData) {
  return rawData.startsWith('OCC:') && rawData.endsWith(';');
}

// 🔢 Extraer pares de datos (id:estado)
function extractSpacePairs(dataSection) {
  const pairs = dataSection.split(':');
  const spacePairs = [];

  for (let i = 0; i < pairs.length - 1; i += 2) {
    const spaceId = parseInt(pairs[i]);
    const occupiedState = parseInt(pairs[i + 1]);

    if (spaceId >= 1 && spaceId <= 3) {
      spacePairs.push({ spaceId, isOccupied: occupiedState === 1 });
    }
  }

  return spacePairs;
}

// 🔄 Procesar cambio de estado de un espacio
function processSpaceChange(spaceId, isOccupied) {
  const spaceIndex = spaceId - 1;
  const space = parkingSpaces[spaceIndex];
  const wasOccupied = space.occupied;

  if (wasOccupied === isOccupied) {
    return null; // Sin cambios
  }

  // Actualizar estado
  space.occupied = isOccupied;
  space.lastChange = new Date();
  space.distance = isOccupied ?
    Math.floor(Math.random() * 10 + 5) :    // 5-15cm si ocupado
    Math.floor(Math.random() * 15 + 25);    // 25-40cm si libre

  console.log(`🚗 CAMBIO DETECTADO: Espacio ${spaceId} ${isOccupied ? 'OCUPADO' : 'LIBRE'}`);

  return { spaceId, wasOccupied, isOccupied, space };
}

// 🚪 Parsear datos de barreras del ESP32 en formato BAR1:0; o BAR2:1;
// 🚪 Parsear datos de barreras del ESP32 en formato BAR:1:0:2:0;
function parseBarrierData(rawData) {
  console.log(`🚪 PROCESANDO DATOS DE BARRERA: ${rawData}`);

  // Extraer datos sin prefijo BAR: y sufijo ;
  const dataSection = rawData.slice(4, -1); // Remove "BAR:" and ";"
  const pairs = dataSection.split(':');

  // Procesar en pares (id:estado)
  for (let i = 0; i < pairs.length - 1; i += 2) {
    const barrierId = parseInt(pairs[i]);
    const barrierState = parseInt(pairs[i + 1]);

    if (barrierId === 1 || barrierId === 2) {
      // Determinar tipo de barrera y estado
      const gateType = barrierId === 1 ? 'entry' : 'exit';
      const isOpen = barrierState === 1;
      const gateTypeName = gateType === 'entry' ? 'ENTRADA' : 'SALIDA';
      const statusText = isOpen ? 'ABIERTA' : 'CERRADA';

      console.log(`🚪 BARRERA ${barrierId} (${gateTypeName}): ${statusText}`);

      // Actualizar estado de la barrera
      const wasOpen = gateStatus[gateType] === 'open';
      gateStatus[gateType] = isOpen ? 'open' : 'closed';

      // Solo publicar si hay cambio
      if (wasOpen !== isOpen) {
        publishGateUpdate(gateType, isOpen);

        // Actualizar estadísticas si es entrada/salida
        if (gateType === 'entry' && isOpen) {
          // Barrera de entrada se abre - posible entrada
          console.log(`   🚗➡️ Posible ENTRADA detectada`);
        } else if (gateType === 'exit' && isOpen) {
          // Barrera de salida se abre - posible salida
          console.log(`   🚗⬅️ Posible SALIDA detectada`);
        }
      } else {
        console.log(`   🔄 Estado sin cambios: ${statusText}`);
      }
    }
  }
}

// 📤 Publicar actualización de portón/barrera
function publishGateUpdate(gateType, isOpen) {
  const payload = {
    status: isOpen ? 'open' : 'closed',
    timestamp: new Date().toISOString(),
    servo_angle: isOpen ? 90 : 0,
    action: isOpen ? 'opening' : 'closing',
    data_source: 'ESP32_REAL'
  };

  client.publish(`parking/gates/${gateType}/status`, JSON.stringify(payload));
  console.log(`   📡 Publicado: parking/gates/${gateType}/status`);
}

// 🔍 Parsear datos del ESP32 en formato OCC:1:1:2:0:3:0;
function parseESP32Data(rawData) {
  if (!isValidESP32Format(rawData)) {
    console.log('⚠️  Formato de datos no reconocido:', rawData);
    return;
  }

  // Extraer sección de datos (sin OCC: y ;)
  const dataSection = rawData.slice(4, -1);
  const spacePairs = extractSpacePairs(dataSection);

  // Procesar cambios
  const changes = [];
  spacePairs.forEach(({ spaceId, isOccupied }) => {
    const change = processSpaceChange(spaceId, isOccupied);
    if (change) {
      changes.push(change);
    }
  });

  // Publicar cambios y actualizar estadísticas
  if (changes.length > 0) {
    changes.forEach(change => {
      publishSpaceUpdate(change.space);
      updateStatsForChange(change);
    });

    publishSystemStats();
    systemStats.totalChangesToday++;
    console.log(`📊 Total de cambios hoy: ${systemStats.totalChangesToday}`);
  } else {
    console.log('🔄 Datos recibidos sin cambios de estado');
  }
}

// 📤 Publicar actualización de un espacio específico
function publishSpaceUpdate(space) {
  const payload = {
    occupied: space.occupied,
    distance: space.distance,
    sensor: space.sensor,
    timestamp: space.lastChange.toISOString(),
    battery: 85 + Math.random() * 10,  // Simular batería
    change_detected: true,
    data_source: 'ESP32_REAL',
    realData: space.realData
  };

  client.publish(`parking/spaces/${space.id}/status`, JSON.stringify(payload));
  console.log(`   📡 Publicado: parking/spaces/${space.id}/status`);
}

// 📊 Actualizar estadísticas cuando hay cambio
function updateStatsForChange(change) {
  if (!change.wasOccupied && change.isOccupied) {
    // Vehículo entró
    systemStats.dailyEntries++;
    systemStats.lastEntry = new Date();
    console.log(`   🚗➡️  ENTRADA registrada (Total del día: ${systemStats.dailyEntries})`);
  } else if (change.wasOccupied && !change.isOccupied) {
    // Vehículo salió
    systemStats.lastExit = new Date();
    console.log(`   🚗⬅️  SALIDA registrada`);
  }

  // Actualizar total actual
  systemStats.totalVehiclesInside = parkingSpaces.filter(s => s.occupied).length;

  // Actualizar pico de ocupación
  if (systemStats.totalVehiclesInside > systemStats.peakOccupancy) {
    systemStats.peakOccupancy = systemStats.totalVehiclesInside;
    console.log(`   📈 NUEVO PICO de ocupación: ${systemStats.peakOccupancy}/3`);
  }
}

// 📤 Publicar todos los datos iniciales
function publishInitialData() {
  console.log('📤 PUBLICANDO ESTADO INICIAL...');

  // Estado de cada espacio de estacionamiento
  parkingSpaces.forEach(space => {
    publishSpaceUpdate(space);
    console.log(`   🚗 Espacio ${space.id}: ${space.occupied ? 'OCUPADO' : 'LIBRE'} (${space.distance}cm)`);
  });

  // Estado de portones (simulado)
  publishGateStatus('entry');
  publishGateStatus('exit');

  // Estadísticas y datos por hora
  publishSystemStats();
  client.publish('parking/analytics/hourly', JSON.stringify(hourlyOccupancy));

  console.log('✅ Estado inicial publicado\n');
}

// 🚪 Publicar estado de portón
function publishGateStatus(gateType) {
  client.publish(`parking/gates/${gateType}/status`, JSON.stringify({
    status: gateStatus[gateType],
    timestamp: new Date().toISOString(),
    servo_angle: gateStatus[gateType] === 'closed' ? 0 : 90,
    simulated: true  // Indicar que es simulado
  }));

  console.log(`   🚪 Portón ${gateType}: ${gateStatus[gateType].toUpperCase()}`);
}

// 🚪 Simular actividad de portones (como antes, simulado)
function simulateGateActivity() {
  // 20% probabilidad de actividad en portones
  if (Math.random() < 0.2) {
    const isEntryGate = Math.random() < 0.5;
    const gateType = isEntryGate ? 'entry' : 'exit';

    console.log(`🚪 SIMULANDO PORTÓN DE ${gateType.toUpperCase()}...`);
    simulateGateSequence(gateType);
  }
}

// 🔄 Secuencia completa de apertura/cierre de portón (simulado)
function simulateGateSequence(gateType) {
  // Fase 1: Abriendo
  gateStatus[gateType] = 'opening';
  client.publish(`parking/gates/${gateType}/status`, JSON.stringify({
    status: gateStatus[gateType],
    timestamp: new Date().toISOString(),
    servo_angle: 45,
    action: 'opening',
    simulated: true
  }));

  console.log(`   📡 ${gateType}: ABRIENDO... (simulado)`);

  // Fase 2: Abierto
  setTimeout(() => {
    gateStatus[gateType] = 'open';
    client.publish(`parking/gates/${gateType}/status`, JSON.stringify({
      status: gateStatus[gateType],
      timestamp: new Date().toISOString(),
      servo_angle: 90,
      action: 'opened',
      simulated: true
    }));

    console.log(`   📡 ${gateType}: ABIERTO (simulado)`);

    // Fase 3: Cerrando
    setTimeout(() => {
      gateStatus[gateType] = 'closing';
      client.publish(`parking/gates/${gateType}/status`, JSON.stringify({
        status: gateStatus[gateType],
        timestamp: new Date().toISOString(),
        servo_angle: 45,
        action: 'closing',
        simulated: true
      }));

      console.log(`   📡 ${gateType}: CERRANDO... (simulado)`);

      // Fase 4: Cerrado
      setTimeout(() => {
        gateStatus[gateType] = 'closed';
        client.publish(`parking/gates/${gateType}/status`, JSON.stringify({
          status: gateStatus[gateType],
          timestamp: new Date().toISOString(),
          servo_angle: 0,
          action: 'closed',
          simulated: true
        }));

        console.log(`   📡 ${gateType}: CERRADO (simulado)`);

      }, 2000);
    }, 4000);
  }, 2000);
}

// 📊 Publicar estadísticas del sistema
function publishSystemStats() {
  const occupiedSpaces = parkingSpaces.filter(space => space.occupied).length;
  const availableSpaces = parkingSpaces.length - occupiedSpaces;
  const occupancyRate = Math.round((occupiedSpaces / parkingSpaces.length) * 100);

  const stats = {
    totalSpaces: parkingSpaces.length,
    occupiedSpaces: occupiedSpaces,
    availableSpaces: availableSpaces,
    dailyEntries: systemStats.dailyEntries,
    occupancyRate: occupancyRate,
    systemUptime: Math.floor((Date.now() - systemStats.systemUptime) / 1000),
    lastEntry: systemStats.lastEntry.toISOString(),
    lastExit: systemStats.lastExit.toISOString(),
    timestamp: new Date().toISOString(),
    // Nuevas estadísticas calculadas
    totalChangesToday: systemStats.totalChangesToday,
    peakOccupancy: systemStats.peakOccupancy,
    averageOccupancyToday: systemStats.averageOccupancyToday,
    dataSource: 'ESP32_REAL'
  };

  client.publish('parking/stats/summary', JSON.stringify(stats));
}

// 📈 Actualizar datos de ocupación por hora
function updateHourlyData() {
  const currentHour = new Date().getHours();
  const occupied = parkingSpaces.filter(space => space.occupied).length;
  const available = parkingSpaces.length - occupied;

  // Actualizar la hora current
  hourlyOccupancy[currentHour] = {
    hour: `${currentHour.toString().padStart(2, '0')}:00`,
    occupied: occupied,
    available: available,
    timestamp: new Date().toISOString(),
    dataSource: 'ESP32_REAL'
  };

  client.publish('parking/analytics/hourly', JSON.stringify(hourlyOccupancy));
  console.log(`📈 DATOS ACTUALIZADOS para las ${currentHour}:00 - Ocupados: ${occupied}/${parkingSpaces.length}`);
}

// 📊 Calcular estadísticas diarias
function calculateDailyStats() {
  const currentOccupancy = parkingSpaces.filter(s => s.occupied).length;
  dailyData.totalOccupancyMinutes += currentOccupancy;
  dailyData.samples++;

  // Calcular promedio de ocupación del día
  systemStats.averageOccupancyToday = Math.round(
    (dailyData.totalOccupancyMinutes / dailyData.samples / parkingSpaces.length) * 100
  );

  console.log(`📊 ESTADÍSTICAS DIARIAS actualizadas:`);
  console.log(`   📈 Promedio ocupación: ${systemStats.averageOccupancyToday}%`);
  console.log(`   🏔️  Pico ocupación: ${systemStats.peakOccupancy}/${parkingSpaces.length}`);
  console.log(`   🔄 Total cambios: ${systemStats.totalChangesToday}`);
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
  console.log('\n🛑 CERRANDO PROCESADOR ESP32...');
  console.log('📊 ESTADÍSTICAS FINALES:');
  console.log(`   🚗 Entradas del día: ${systemStats.dailyEntries}`);
  console.log(`   🅿️  Espacios ocupados: ${parkingSpaces.filter(s => s.occupied).length}/${parkingSpaces.length}`);
  console.log(`   🔄 Total cambios: ${systemStats.totalChangesToday}`);
  console.log(`   📈 Promedio ocupación: ${systemStats.averageOccupancyToday}%`);
  console.log(`   🏔️  Pico ocupación: ${systemStats.peakOccupancy}/${parkingSpaces.length}`);

  client.end();
  console.log('✅ PROCESADOR CERRADO CORRECTAMENTE');
  console.log('👋 ¡Hasta luego!');
  process.exit(0);
});

// 🚀 Inicializar tiempo de inicio del sistema
systemStats.systemUptime = Date.now();

console.log('🎯 PROCESADOR ESP32 CONFIGURADO:');
console.log(`   🚗 ${parkingSpaces.length} espacios de estacionamiento`);
console.log(`   📡 Escuchando: esp32/parking/occupancy`);
console.log(`   📡 Escuchando: parking/esp32/data`);
console.log(`   🚪 2 portones (simulados)`);
console.log(`   📊 Estadísticas avanzadas habilitadas`);
console.log(`   💾 Formato esperado: OCC:1:1:2:0:3:0;`);
console.log('\n⏳ Esperando conexión al broker...\n');
