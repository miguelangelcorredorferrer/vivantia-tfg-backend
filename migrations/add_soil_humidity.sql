-- Script de migración para añadir humedad del suelo
-- Fecha: $(date)
-- Descripción: Diferenciar entre humedad ambiental y humedad del suelo

-- 1. Renombrar la columna humidity existente a air_humidity (humedad ambiental)
ALTER TABLE sensor_readings RENAME COLUMN humidity TO air_humidity;

-- 2. Añadir nueva columna para humedad del suelo
ALTER TABLE sensor_readings ADD COLUMN soil_humidity DECIMAL(5,2);

-- 3. Actualizar la tabla crops para diferenciar entre humedad ambiental y del suelo
-- Renombrar las columnas existentes para ser más específicas
ALTER TABLE crops RENAME COLUMN humidity_min TO air_humidity_min;
ALTER TABLE crops RENAME COLUMN humidity_max TO air_humidity_max;

-- 4. Añadir nuevas columnas para humedad del suelo en crops
ALTER TABLE crops ADD COLUMN soil_humidity_min DECIMAL(5,2);
ALTER TABLE crops ADD COLUMN soil_humidity_max DECIMAL(5,2);

-- 5. Actualizar la tabla automatic_settings para diferenciar entre humedad ambiental y del suelo
-- Renombrar las columnas existentes para ser más específicas
ALTER TABLE automatic_settings RENAME COLUMN humidity_min_threshold TO air_humidity_min_threshold;
ALTER TABLE automatic_settings RENAME COLUMN humidity_max_threshold TO air_humidity_max_threshold;

-- 6. Añadir nuevas columnas para humedad del suelo en automatic_settings
ALTER TABLE automatic_settings ADD COLUMN soil_humidity_min_threshold DECIMAL(5,2);
ALTER TABLE automatic_settings ADD COLUMN soil_humidity_max_threshold DECIMAL(5,2);

-- 7. Actualizar los subtipos de alertas para ser más específicos
-- Primero, crear los nuevos subtipos
ALTER TYPE alert_subtype ADD VALUE 'air_humidity_min_threshold';
ALTER TYPE alert_subtype ADD VALUE 'air_humidity_max_threshold';
ALTER TYPE alert_subtype ADD VALUE 'soil_humidity_min_threshold';
ALTER TYPE alert_subtype ADD VALUE 'soil_humidity_max_threshold';

-- 8. Comentarios para documentar los cambios
COMMENT ON COLUMN sensor_readings.air_humidity IS 'Humedad relativa del ambiente en porcentaje (0-100)';
COMMENT ON COLUMN sensor_readings.soil_humidity IS 'Humedad del suelo en porcentaje (0-100)';
COMMENT ON COLUMN sensor_readings.temperature IS 'Temperatura en grados Celsius';

COMMENT ON COLUMN crops.air_humidity_min IS 'Humedad ambiental mínima recomendada para el cultivo (%)';
COMMENT ON COLUMN crops.air_humidity_max IS 'Humedad ambiental máxima recomendada para el cultivo (%)';
COMMENT ON COLUMN crops.soil_humidity_min IS 'Humedad del suelo mínima recomendada para el cultivo (%)';
COMMENT ON COLUMN crops.soil_humidity_max IS 'Humedad del suelo máxima recomendada para el cultivo (%)';

COMMENT ON COLUMN automatic_settings.air_humidity_min_threshold IS 'Umbral mínimo de humedad ambiental para activar riego (%)';
COMMENT ON COLUMN automatic_settings.air_humidity_max_threshold IS 'Umbral máximo de humedad ambiental para activar riego (%)';
COMMENT ON COLUMN automatic_settings.soil_humidity_min_threshold IS 'Umbral mínimo de humedad del suelo para activar riego (%)';
COMMENT ON COLUMN automatic_settings.soil_humidity_max_threshold IS 'Umbral máximo de humedad del suelo para activar riego (%)';

-- 9. Crear índices para mejorar el rendimiento de consultas
CREATE INDEX idx_sensor_readings_air_humidity ON sensor_readings(air_humidity);
CREATE INDEX idx_sensor_readings_soil_humidity ON sensor_readings(soil_humidity);
CREATE INDEX idx_sensor_readings_temperature ON sensor_readings(temperature);
CREATE INDEX idx_sensor_readings_device_received ON sensor_readings(device_id, received_at);

-- 10. Verificar que los cambios se aplicaron correctamente
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
