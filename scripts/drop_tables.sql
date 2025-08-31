-- Script para borrar tablas específicas de la base de datos
-- Fecha: $(date)
-- Descripción: Eliminar tablas crops, sensor_readings y automatic_settings

-- ========================================
-- ADVERTENCIA: ESTE SCRIPT ELIMINA DATOS PERMANENTEMENTE
-- ========================================

-- Verificar que estamos en el entorno correcto
DO $$
BEGIN
    RAISE NOTICE 'Iniciando eliminación de tablas...';
    RAISE NOTICE 'Este proceso eliminará permanentemente los datos de:';
    RAISE NOTICE '- crops';
    RAISE NOTICE '- sensor_readings'; 
    RAISE NOTICE '- automatic_settings';
    RAISE NOTICE 'Presiona Ctrl+C para cancelar si no estás seguro.';
END $$;

-- ========================================
-- PASO 1: VERIFICAR EXISTENCIA DE TABLAS
-- ========================================

DO $$
DECLARE
    table_count INTEGER;
BEGIN
    -- Verificar si las tablas existen
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_name IN ('crops', 'sensor_readings', 'automatic_settings')
    AND table_schema = 'public';
    
    IF table_count = 0 THEN
        RAISE NOTICE 'No se encontraron las tablas especificadas.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Se encontraron % tablas para eliminar.', table_count;
END $$;

-- ========================================
-- PASO 2: MOSTRAR ESTADÍSTICAS ANTES DE ELIMINAR
-- ========================================

-- Mostrar conteo de registros en cada tabla
SELECT 
    'crops' as tabla,
    COUNT(*) as registros
FROM crops
UNION ALL
SELECT 
    'sensor_readings' as tabla,
    COUNT(*) as registros
FROM sensor_readings
UNION ALL
SELECT 
    'automatic_settings' as tabla,
    COUNT(*) as registros
FROM automatic_settings;

-- ========================================
-- PASO 3: ELIMINAR TABLAS EN ORDEN CORRECTO
-- ========================================

-- IMPORTANTE: Eliminar en orden de dependencias
-- 1. automatic_settings (depende de irrigation_configs)
-- 2. sensor_readings (depende de devices)
-- 3. crops (depende de users)

BEGIN;

-- 1. Eliminar automatic_settings
DROP TABLE IF EXISTS automatic_settings CASCADE;
RAISE NOTICE 'Tabla automatic_settings eliminada.';

-- 2. Eliminar sensor_readings
DROP TABLE IF EXISTS sensor_readings CASCADE;
RAISE NOTICE 'Tabla sensor_readings eliminada.';

-- 3. Eliminar crops
DROP TABLE IF EXISTS crops CASCADE;
RAISE NOTICE 'Tabla crops eliminada.';

COMMIT;

-- ========================================
-- PASO 4: VERIFICAR ELIMINACIÓN
-- ========================================

DO $$
DECLARE
    remaining_tables INTEGER;
BEGIN
    -- Verificar que las tablas fueron eliminadas
    SELECT COUNT(*) INTO remaining_tables
    FROM information_schema.tables 
    WHERE table_name IN ('crops', 'sensor_readings', 'automatic_settings')
    AND table_schema = 'public';
    
    IF remaining_tables = 0 THEN
        RAISE NOTICE '✅ Todas las tablas fueron eliminadas exitosamente.';
    ELSE
        RAISE NOTICE '⚠️  Quedaron % tablas sin eliminar.', remaining_tables;
    END IF;
END $$;

-- ========================================
-- PASO 5: MOSTRAR TABLAS RESTANTES
-- ========================================

SELECT 
    'TABLAS RESTANTES EN LA BASE DE DATOS' as info;

SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ========================================
-- RESUMEN FINAL
-- ========================================

SELECT 'ELIMINACIÓN COMPLETADA' as status;
