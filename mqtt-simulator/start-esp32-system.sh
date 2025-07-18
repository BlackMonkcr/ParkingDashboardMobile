#!/bin/bash

# 🚀 Script de inicio para el sistema de estacionamiento con ESP32 REAL
# Ejecuta el broker MQTT y el procesador de datos ESP32

echo "🟢 ==============================================="
echo "🚀 INICIANDO SISTEMA ESP32 - DATOS REALES"
echo "==============================================="

# Verificar que Node.js esté instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    echo "💡 Instala Node.js desde: https://nodejs.org/"
    exit 1
fi

# Verificar que las dependencias estén instaladas
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Error instalando dependencias"
        exit 1
    fi
fi

echo "🏗️  Iniciando broker MQTT..."
echo "📡 Puerto: 1883"
echo "🌐 Dirección: mqtt://localhost:1883"
echo "📥 Esperando datos del ESP32 en topic: esp32/data"
echo ""

# Función para limpiar procesos al salir
cleanup() {
    echo ""
    echo "🛑 Cerrando sistema..."
    jobs -p | xargs -r kill
    echo "✅ Sistema cerrado correctamente"
    exit 0
}

# Capturar Ctrl+C para limpiar
trap cleanup SIGINT

# Iniciar broker MQTT en segundo plano
node broker.js &
BROKER_PID=$!

# Esperar un poco para que el broker se inicie
sleep 2

echo "🎯 Iniciando procesador de datos ESP32..."
echo "👂 Escuchando datos del ESP32..."
echo ""

# Iniciar procesador ESP32
node esp32-data-processor.js &
PROCESSOR_PID=$!

# Esperar un poco más
sleep 2

echo "🌉 Iniciando WebSocket Bridge para frontend..."
node ws-bridge.js &
BRIDGE_PID=$!

echo "✅ SISTEMA COMPLETO INICIADO"
echo ""
echo "📋 INFORMACIÓN DEL SISTEMA:"
echo "   🏗️  Broker MQTT: Puerto 1883"
echo "   🎯 Procesador ESP32: Activo"
echo "   🌉 WebSocket Bridge: Puerto 8080"
echo "   📡 Topics ESP32 esperados:"
echo "      • esp32/data (datos reales del ESP32)"
echo "   📤 Topics de salida para frontend:"
echo "      • parking/spaces/+/status"
echo "      • parking/gates/+/status"
echo "      • parking/system/stats"
echo "      • parking/hourly/data"
echo ""
echo "💡 FORMATO DE DATOS ESP32:"
echo "   📋 Esperado: OCC:1:1:2:0:3:0;"
echo "   📝 Donde:"
echo "      OCC = Ocupancy"
echo "      1:1 = Estacionamiento 1 ocupado"
echo "      2:0 = Estacionamiento 2 libre"
echo "      3:0 = Estacionamiento 3 libre"
echo ""
echo "🧪 PARA PROBAR (en otra terminal):"
echo "   node esp32-test-simulator.js"
echo ""
echo "🛑 Para cerrar: Presiona Ctrl+C"
echo "==============================================="

# Esperar a que terminen los procesos
wait $BROKER_PID $PROCESSOR_PID $BRIDGE_PID
