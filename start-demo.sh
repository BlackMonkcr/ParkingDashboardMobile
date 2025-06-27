#!/bin/bash

# Script de demostración del Dashboard IoT
echo "🚀 Dashboard IoT - Sistema de Estacionamiento Inteligente"
echo "========================================================="
echo ""

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Por favor instala Node.js primero."
    exit 1
fi

# Verificar si npm está disponible
if ! command -v npm &> /dev/null; then
    echo "❌ npm no está disponible. Por favor instala npm primero."
    exit 1
fi

echo "✅ Node.js y npm detectados"
echo ""

# Mostrar opciones al usuario
echo "Selecciona una opción:"
echo "1) 🔧 Configuración inicial (instalar dependencias)"
echo "2) 🚀 Iniciar sistema completo (MQTT + Dashboard)"
echo "3) 📡 Solo iniciar simulador MQTT"
echo "4) 📱 Solo iniciar dashboard React Native"
echo "5) 🧹 Limpiar caché y reinstalar"
echo ""

read -p "Opción (1-5): " choice

case $choice in
    1)
        echo "🔧 Instalando dependencias..."
        npm run setup
        echo "✅ Configuración completada. Ahora ejecuta la opción 2."
        ;;
    2)
        echo "🚀 Iniciando sistema completo..."
        echo "📡 Puerto MQTT: 1883"
        echo "🌐 Puerto WebSocket: 8080"
        echo "📱 Puerto Dashboard: 8081"
        echo ""
        echo "Presiona Ctrl+C para detener el sistema"
        echo ""
        npm run dev
        ;;
    3)
        echo "📡 Iniciando solo simulador MQTT..."
        npm run mqtt-start
        ;;
    4)
        echo "📱 Iniciando solo dashboard..."
        echo "⚠️  Asegúrate de que el simulador MQTT esté corriendo"
        npm start
        ;;
    5)
        echo "🧹 Limpiando caché..."
        rm -rf node_modules
        rm -rf mqtt-simulator/node_modules
        npm run setup
        echo "✅ Limpieza completada"
        ;;
    *)
        echo "❌ Opción inválida"
        exit 1
        ;;
esac
