-- Script simple para borrar tablas específicas
-- Fecha: $(date)
-- Descripción: Eliminar tablas crops, sensor_readings y automatic_settings

-- ⚠️ ADVERTENCIA: Este script elimina datos permanentemente
-- ⚠️ Asegúrate de tener un backup antes de ejecutar

-- Eliminar tablas en orden de dependencias
DROP TABLE IF EXISTS automatic_settings CASCADE;
DROP TABLE IF EXISTS sensor_readings CASCADE;
DROP TABLE IF EXISTS crops CASCADE;

-- Verificar eliminación
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Tablas eliminadas exitosamente'
        ELSE '⚠️  Algunas tablas no fueron eliminadas'
    END as resultado
FROM information_schema.tables 
WHERE table_name IN ('crops', 'sensor_readings', 'automatic_settings')
AND table_schema = 'public';
