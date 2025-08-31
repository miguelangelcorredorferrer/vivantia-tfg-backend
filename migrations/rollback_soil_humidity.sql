-- Script de rollback para revertir los cambios de humedad del suelo
-- Fecha: $(date)
-- Descripción: Revertir la diferenciación entre humedad ambiental y humedad del suelo

-- 1. Revertir cambios en sensor_readings
ALTER TABLE sensor_readings RENAME COLUMN air_humidity TO humidity;
ALTER TABLE sensor_readings DROP COLUMN soil_humidity;

-- 2. Revertir cambios en crops
ALTER TABLE crops RENAME COLUMN air_humidity_min TO humidity_min;
ALTER TABLE crops RENAME COLUMN air_humidity_max TO humidity_max;
ALTER TABLE crops DROP COLUMN soil_humidity_min;
ALTER TABLE crops DROP COLUMN soil_humidity_max;

-- 3. Revertir cambios en automatic_settings
ALTER TABLE automatic_settings RENAME COLUMN air_humidity_min_threshold TO humidity_min_threshold;
ALTER TABLE automatic_settings RENAME COLUMN air_humidity_max_threshold TO humidity_max_threshold;
ALTER TABLE automatic_settings DROP COLUMN soil_humidity_min_threshold;
ALTER TABLE automatic_settings DROP COLUMN soil_humidity_max_threshold;

-- 4. Eliminar índices creados
DROP INDEX IF EXISTS idx_sensor_readings_air_humidity;
DROP INDEX IF EXISTS idx_sensor_readings_soil_humidity;
DROP INDEX IF EXISTS idx_sensor_readings_temperature;
DROP INDEX IF EXISTS idx_sensor_readings_device_received;

-- NOTA: Los nuevos valores de alert_subtype no se pueden eliminar fácilmente
-- ya que PostgreSQL no permite eliminar valores de ENUM directamente.
-- Si es necesario, se tendría que recrear el tipo completo.

-- 5. Verificar que los cambios se revirtieron correctamente
SELECT 
    'sensor_readings' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'sensor_readings' 
ORDER BY ordinal_position;

SELECT 
    'crops' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'crops' 
AND column_name LIKE '%humidity%'
ORDER BY ordinal_position;

SELECT 
    'automatic_settings' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'automatic_settings' 
AND column_name LIKE '%humidity%'
ORDER BY ordinal_position;
