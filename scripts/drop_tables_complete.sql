-- Script completo para borrar tablas y sus dependencias
-- Fecha: $(date)
-- Descripción: Eliminar tablas principales y todas sus dependencias

-- ⚠️ ADVERTENCIA: Este script elimina datos permanentemente
-- ⚠️ Asegúrate de tener un backup antes de ejecutar

-- ========================================
-- ELIMINACIÓN COMPLETA DE TABLAS Y DEPENDENCIAS
-- ========================================

BEGIN;

-- 1. Eliminar tablas que dependen de irrigation_configs
DROP TABLE IF EXISTS automatic_settings CASCADE;
DROP TABLE IF EXISTS programmed_settings CASCADE;
DROP TABLE IF EXISTS pump_activations CASCADE;

-- 2. Eliminar irrigation_configs (depende de crops)
DROP TABLE IF EXISTS irrigation_configs CASCADE;

-- 3. Eliminar sensor_readings (depende de devices)
DROP TABLE IF EXISTS sensor_readings CASCADE;

-- 4. Eliminar crops (depende de users)
DROP TABLE IF EXISTS crops CASCADE;

COMMIT;

-- ========================================
-- VERIFICACIÓN FINAL
-- ========================================

SELECT 
    'TABLAS ELIMINADAS' as accion,
    COUNT(*) as tablas_eliminadas
FROM (
    SELECT 'automatic_settings' as tabla
    UNION ALL SELECT 'programmed_settings'
    UNION ALL SELECT 'pump_activations'
    UNION ALL SELECT 'irrigation_configs'
    UNION ALL SELECT 'sensor_readings'
    UNION ALL SELECT 'crops'
) t
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = t.tabla 
    AND table_schema = 'public'
);

-- Mostrar tablas restantes
SELECT 
    'TABLAS RESTANTES' as info;

SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;
