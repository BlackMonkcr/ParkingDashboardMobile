import { useEffect, useRef, useState } from 'react';

export interface ParkingSpace {
  id: number;
  occupied: boolean;
  distance: number;
  sensor: string;
  timestamp: string;
  battery?: number;
  change_detected?: boolean;
  previous_state?: boolean;
}

export interface GateStatus {
  status: 'closed' | 'opening' | 'open' | 'closing';
  timestamp: string;
  servo_angle: number;
  action?: string;
}

export interface SystemStats {
  totalSpaces: number;
  occupiedSpaces: number;
  availableSpaces: number;
  dailyEntries: number;
  occupancyRate: number;
  systemUptime: number;
  lastEntry: string;
  lastExit: string;
  timestamp: string;
}

export interface HourlyData {
  hour: string;
  occupied: number;
  available: number;
  timestamp?: string;
}

export interface MqttData {
  parkingSpaces: ParkingSpace[];
  gates: {
    entry: GateStatus;
    exit: GateStatus;
  };
  systemStats: SystemStats;
  hourlyData: HourlyData[];
  isConnected: boolean;
  lastUpdate: Date;
}

// 🔍 Función para validar formato ESP32
const isValidESP32Format = (rawData: string): boolean => {
  return rawData.startsWith('OCC:') && rawData.endsWith(';');
};

// 🚪 Función para validar formato de barreras
const isValidBarrierFormat = (rawData: string): boolean => {
  return (rawData.startsWith('BAR1:') || rawData.startsWith('BAR2:')) && rawData.endsWith(';');
};

// 🚪 Función para procesar datos de barreras
const processBarrierData = (rawData: string): {gateType: 'entry' | 'exit', isOpen: boolean} | null => {
  if (!isValidBarrierFormat(rawData)) {
    return null;
  }

  const dataSection = rawData.slice(0, -1); // Remove ";"
  const [barrierType, stateStr] = dataSection.split(':');
  const state = parseInt(stateStr);

  const gateType = barrierType === 'BAR1' ? 'entry' : 'exit';
  const isOpen = state === 1;

  return { gateType, isOpen };
};

// 🔧 Función para extraer pares de datos ESP32
const extractESP32Pairs = (dataSection: string): Array<{spaceId: number, isOccupied: boolean}> => {
  const pairs = dataSection.split(':');
  const result: Array<{spaceId: number, isOccupied: boolean}> = [];

  for (let i = 0; i < pairs.length - 1; i += 2) {
    const spaceId = parseInt(pairs[i]);
    const occupiedState = parseInt(pairs[i + 1]);

    if (spaceId >= 1 && spaceId <= 3) {
      result.push({ spaceId, isOccupied: occupiedState === 1 });
    }
  }

  return result;
};

// 🚗 Función para actualizar un espacio específico
const updateParkingSpace = (space: ParkingSpace, isOccupied: boolean): ParkingSpace => {
  return {
    ...space,
    occupied: isOccupied,
    timestamp: new Date().toISOString(),
    distance: isOccupied ? Math.floor(Math.random() * 10 + 5) : Math.floor(Math.random() * 15 + 25),
    change_detected: space.occupied !== isOccupied,
    previous_state: space.occupied,
  };
};

// 📊 Función para calcular estadísticas
const calculateStats = (spaces: ParkingSpace[], currentStats: SystemStats, changes: Array<{wasOccupied: boolean, isOccupied: boolean}>): SystemStats => {
  const totalOccupied = spaces.filter(space => space.occupied).length;
  const totalAvailable = 3 - totalOccupied;
  const occupancyRate = Math.round((totalOccupied / 3) * 100);

  let newEntries = currentStats.dailyEntries;
  changes.forEach(change => {
    if (!change.wasOccupied && change.isOccupied) {
      newEntries++;
    }
  });

  const hasNewEntry = changes.some(c => !c.wasOccupied && c.isOccupied);
  const hasNewExit = changes.some(c => c.wasOccupied && !c.isOccupied);

  return {
    ...currentStats,
    occupiedSpaces: totalOccupied,
    availableSpaces: totalAvailable,
    occupancyRate: occupancyRate,
    dailyEntries: newEntries,
    timestamp: new Date().toISOString(),
    lastEntry: hasNewEntry ? new Date().toISOString() : currentStats.lastEntry,
    lastExit: hasNewExit ? new Date().toISOString() : currentStats.lastExit,
  };
};

const WEBSOCKET_URL = 'ws://localhost:8080';

export const useMqttWebSocket = () => {
  const [data, setData] = useState<MqttData>({
    parkingSpaces: [
      { id: 1, occupied: false, distance: 32, sensor: 'ESP32-SENSOR-1', timestamp: new Date().toISOString(), battery: 85 },
      { id: 2, occupied: false, distance: 32, sensor: 'ESP32-SENSOR-2', timestamp: new Date().toISOString(), battery: 87 },
      { id: 3, occupied: false, distance: 32, sensor: 'ESP32-SENSOR-3', timestamp: new Date().toISOString(), battery: 89 },
    ],
    gates: {
      entry: { status: 'closed', timestamp: new Date().toISOString(), servo_angle: 0 },
      exit: { status: 'closed', timestamp: new Date().toISOString(), servo_angle: 0 },
    },
    systemStats: {
      totalSpaces: 3,
      occupiedSpaces: 0,
      availableSpaces: 3,
      dailyEntries: 0,
      occupancyRate: 0,
      systemUptime: 0,
      lastEntry: new Date().toISOString(),
      lastExit: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    },
    hourlyData: Array(24).fill(0).map((_, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      occupied: 0,
      available: 3,
      timestamp: new Date().toISOString(),
    })),
    isConnected: false,
    lastUpdate: new Date(),
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  const processMessage = (topic: string, parsedPayload: any) => {
    setData(prev => {
      const newData = { ...prev };

      // � Procesar datos RAW del ESP32 directamente
      if (topic === 'esp32/data') {
        const rawData = typeof parsedPayload === 'string' ? parsedPayload : parsedPayload.toString();
        console.log('📡 Procesando datos ESP32 RAW:', rawData);

        try {
          processESP32RawData(rawData, newData);
        } catch (error) {
          console.error('❌ Error procesando datos ESP32:', error);
        }

        newData.lastUpdate = new Date();
        return newData;
      }

      // �🚗 Actualizar espacios de estacionamiento (del procesador ESP32)
      if (topic.startsWith('parking/spaces/') && topic.endsWith('/status')) {
        const spaceId = parseInt(topic.split('/')[2]);
        const spaceIndex = newData.parkingSpaces.findIndex(space => space.id === spaceId);

        if (spaceIndex !== -1) {
          newData.parkingSpaces[spaceIndex] = {
            id: spaceId,
            occupied: parsedPayload.occupied,
            distance: parsedPayload.distance,
            sensor: parsedPayload.sensor,
            timestamp: parsedPayload.timestamp,
            battery: parsedPayload.battery,
            change_detected: parsedPayload.change_detected,
            previous_state: newData.parkingSpaces[spaceIndex].occupied,
          };

          console.log(`🚗 Espacio ${spaceId} actualizado: ${parsedPayload.occupied ? 'OCUPADO' : 'LIBRE'}`);
        }
      }

      // 🚪 Actualizar portones (del procesador ESP32)
      if (topic.startsWith('parking/gates/') && topic.endsWith('/status')) {
        const gateType = topic.split('/')[2] as 'entry' | 'exit';
        newData.gates[gateType] = {
          status: parsedPayload.status,
          timestamp: parsedPayload.timestamp,
          servo_angle: parsedPayload.servo_angle,
          action: parsedPayload.action,
        };

        console.log(`🚪 Portón ${gateType}: ${parsedPayload.status}`);
      }

      // 📊 Actualizar estadísticas del sistema (del procesador ESP32)
      if (topic === 'parking/system/stats') {
        newData.systemStats = {
          totalSpaces: parsedPayload.totalSpaces || 3,
          occupiedSpaces: parsedPayload.occupiedSpaces || 0,
          availableSpaces: parsedPayload.availableSpaces || 3,
          dailyEntries: parsedPayload.dailyEntries || 0,
          occupancyRate: parsedPayload.occupancyRate || 0,
          systemUptime: parsedPayload.systemUptime || 0,
          lastEntry: parsedPayload.lastEntry || new Date().toISOString(),
          lastExit: parsedPayload.lastExit || new Date().toISOString(),
          timestamp: parsedPayload.timestamp || new Date().toISOString(),
        };

        console.log(`📊 Estadísticas actualizadas: ${parsedPayload.occupiedSpaces}/${parsedPayload.totalSpaces} ocupados`);
      }

      // 📈 Actualizar datos por hora (del procesador ESP32)
      if (topic === 'parking/hourly/data') {
        if (Array.isArray(parsedPayload)) {
          newData.hourlyData = parsedPayload;
        }

        console.log('📈 Datos horarios actualizados');
      }

      newData.lastUpdate = new Date();
      return newData;
    });
  };

  // 🔍 Función para procesar datos RAW del ESP32 (formato: OCC:1:1:2:0:3:0;)
  const processESP32RawData = (rawData: string, newData: MqttData) => {
    // Verificar formato básico
    if (!rawData.startsWith('OCC:') || !rawData.endsWith(';')) {
      console.log('⚠️ Formato de datos ESP32 no reconocido:', rawData);
      return;
    }

    // Extraer datos sin prefijo y sufijo
    const dataSection = rawData.slice(4, -1); // Remove "OCC:" and ";"
    const pairs = dataSection.split(':');

    // Procesar en pares (id:estado)
    const changes: Array<{spaceId: number, isOccupied: boolean, wasOccupied: boolean}> = [];

    for (let i = 0; i < pairs.length - 1; i += 2) {
      const spaceId = parseInt(pairs[i]);
      const occupiedState = parseInt(pairs[i + 1]);

      if (spaceId >= 1 && spaceId <= 3) {
        const spaceIndex = spaceId - 1;
        const wasOccupied = newData.parkingSpaces[spaceIndex].occupied;
        const isOccupied = occupiedState === 1;

        // Actualizar el espacio directamente
        newData.parkingSpaces[spaceIndex] = {
          ...newData.parkingSpaces[spaceIndex],
          occupied: isOccupied,
          timestamp: new Date().toISOString(),
          distance: isOccupied ? Math.floor(Math.random() * 10 + 5) : Math.floor(Math.random() * 15 + 25),
          change_detected: wasOccupied !== isOccupied,
          previous_state: wasOccupied,
        };

        if (wasOccupied !== isOccupied) {
          changes.push({ spaceId, isOccupied, wasOccupied });
          console.log(`� ESP32 - Espacio ${spaceId}: ${isOccupied ? 'OCUPADO' : 'LIBRE'}`);
        }
      }
    }

    // Actualizar estadísticas del sistema basadas en los cambios
    const totalOccupied = newData.parkingSpaces.filter(space => space.occupied).length;
    const totalAvailable = 3 - totalOccupied;
    const occupancyRate = Math.round((totalOccupied / 3) * 100);

    // Actualizar entradas diarias si hay nuevas ocupaciones
    let newEntries = newData.systemStats.dailyEntries;
    changes.forEach(change => {
      if (!change.wasOccupied && change.isOccupied) {
        newEntries++;
      }
    });

    newData.systemStats = {
      ...newData.systemStats,
      occupiedSpaces: totalOccupied,
      availableSpaces: totalAvailable,
      occupancyRate: occupancyRate,
      dailyEntries: newEntries,
      timestamp: new Date().toISOString(),
      lastEntry: changes.some(c => !c.wasOccupied && c.isOccupied) ? new Date().toISOString() : newData.systemStats.lastEntry,
      lastExit: changes.some(c => c.wasOccupied && !c.isOccupied) ? new Date().toISOString() : newData.systemStats.lastExit,
    };

    console.log(`📊 ESP32 - Ocupación actualizada: ${totalOccupied}/3 (${occupancyRate}%)`);
  };

  const scheduleReconnect = () => {
    if (connectionAttempts < 10) {
      const delay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000);
      console.log(`🔄 Reconectando en ${delay / 1000}s (intento ${connectionAttempts + 1}/10)`);

      reconnectTimeoutRef.current = setTimeout(() => {
        setConnectionAttempts(prev => prev + 1);
        connect();
      }, delay);
    }
  };

  const connect = () => {
    try {
      console.log('🔌 Conectando a WebSocket ESP32:', WEBSOCKET_URL);
      console.log('📡 Esperando datos reales del dispositivo ESP32...');
      wsRef.current = new WebSocket(WEBSOCKET_URL);

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket conectado al sistema ESP32');
        console.log('📡 Escuchando datos reales del ESP32...');
        setData(prev => ({ ...prev, isConnected: true, lastUpdate: new Date() }));
        setConnectionAttempts(0);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const parsedEvent = JSON.parse(event.data);
          const { topic, message: payload } = parsedEvent;

          console.log('📨 Mensaje ESP32 recibido:', topic);

          // Parsear el payload si es JSON
          let parsedPayload;
          try {
            parsedPayload = JSON.parse(payload);
          } catch {
            parsedPayload = payload;
          }

          processMessage(topic, parsedPayload);

        } catch (error) {
          console.error('❌ Error procesando mensaje WebSocket:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('❌ WebSocket desconectado:', event.code, event.reason);
        setData(prev => ({ ...prev, isConnected: false }));
        scheduleReconnect();
      };

      wsRef.current.onerror = (error) => {
        console.error('🔴 Error WebSocket:', error);
        setData(prev => ({ ...prev, isConnected: false }));
      };

    } catch (error) {
      console.error('🔴 Error creando WebSocket:', error);
      setData(prev => ({ ...prev, isConnected: false }));
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setData(prev => ({ ...prev, isConnected: false }));
  };

  const manualReconnect = () => {
    setConnectionAttempts(0);
    disconnect();
    setTimeout(connect, 1000);
  };

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []);

  return {
    data,
    isConnected: data.isConnected,
    reconnect: manualReconnect,
  };
};
