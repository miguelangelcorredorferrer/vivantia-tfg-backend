-- Script principal de migración para diferenciar humedad ambiental y del suelo
-- Fecha: $(date)
-- Descripción: Ejecutar toda la migración en el orden correcto

-- INSTRUCCIONES DE USO:
-- 1. Hacer backup de la base de datos antes de ejecutar
-- 2. Ejecutar este script en la base de datos de producción
-- 3. Verificar los resultados al final

BEGIN;

-- ========================================
-- PASO 1: MIGRACIÓN DE ESTRUCTURA
-- ========================================

-- 1. Renombrar la columna humidity existente a air_humidity (humedad ambiental)
ALTER TABLE sensor_readings RENAME COLUMN humidity TO air_humidity;

-- 2. Añadir nueva columna para humedad del suelo
ALTER TABLE sensor_readings ADD COLUMN soil_humidity DECIMAL(5,2);

-- 3. Actualizar la tabla crops para diferenciar entre humedad ambiental y del suelo
ALTER TABLE crops RENAME COLUMN humidity_min TO air_humidity_min;
ALTER TABLE crops RENAME COLUMN humidity_max TO air_humidity_max;
ALTER TABLE crops ADD COLUMN soil_humidity_min DECIMAL(5,2);
ALTER TABLE crops ADD COLUMN soil_humidity_max DECIMAL(5,2);

-- 4. Actualizar la tabla automatic_settings
ALTER TABLE automatic_settings RENAME COLUMN humidity_min_threshold TO air_humidity_min_threshold;
ALTER TABLE automatic_settings RENAME COLUMN humidity_max_threshold TO air_humidity_max_threshold;
ALTER TABLE automatic_settings ADD COLUMN soil_humidity_min_threshold DECIMAL(5,2);
ALTER TABLE automatic_settings ADD COLUMN soil_humidity_max_threshold DECIMAL(5,2);

-- 5. Actualizar los subtipos de alertas
ALTER TYPE alert_subtype ADD VALUE 'air_humidity_min_threshold';
ALTER TYPE alert_subtype ADD VALUE 'air_humidity_max_threshold';
ALTER TYPE alert_subtype ADD VALUE 'soil_humidity_min_threshold';
ALTER TYPE alert_subtype ADD VALUE 'soil_humidity_max_threshold';

-- ========================================
-- PASO 2: MIGRACIÓN DE DATOS
-- ========================================

-- 1. Migrar datos de sensor_readings
UPDATE sensor_readings 
SET soil_humidity = CASE 
    WHEN air_humidity IS NOT NULL THEN 
        GREATEST(0, LEAST(100, air_humidity * 0.8 + 20))
    ELSE NULL 
END
WHERE soil_humidity IS NULL;

-- 2. Migrar datos de crops
UPDATE crops 
SET soil_humidity_min = CASE 
    WHEN air_humidity_min IS NOT NULL THEN 
        GREATEST(0, air_humidity_min - 10)
    ELSE 30
END
WHERE soil_humidity_min IS NULL;

UPDATE crops 
SET soil_humidity_max = CASE 
    WHEN air_humidity_max IS NOT NULL THEN 
        LEAST(100, air_humidity_max + 10)
    ELSE 80
END
WHERE soil_humidity_max IS NULL;

-- 3. Migrar datos de automatic_settings
UPDATE automatic_settings 
SET soil_humidity_min_threshold = CASE 
    WHEN air_humidity_min_threshold IS NOT NULL THEN 
        GREATEST(0, air_humidity_min_threshold - 10)
    ELSE 30
END
WHERE soil_humidity_min_threshold IS NULL;

UPDATE automatic_settings 
SET soil_humidity_max_threshold = CASE 
    WHEN air_humidity_max_threshold IS NOT NULL THEN 
        LEAST(100, air_humidity_max_threshold + 10)
    ELSE 80
END
WHERE soil_humidity_max_threshold IS NULL;

-- ========================================
-- PASO 3: OPTIMIZACIÓN
-- ========================================

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_sensor_readings_air_humidity ON sensor_readings(air_humidity);
CREATE INDEX idx_sensor_readings_soil_humidity ON sensor_readings(soil_humidity);
CREATE INDEX idx_sensor_readings_temperature ON sensor_readings(temperature);
CREATE INDEX idx_sensor_readings_device_received ON sensor_readings(device_id, received_at);

-- ========================================
-- PASO 4: DOCUMENTACIÓN
-- ========================================

-- Añadir comentarios para documentar los cambios
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

-- ========================================
-- PASO 5: VERIFICACIÓN
-- ========================================

-- Verificar que los cambios se aplicaron correctamente
DO $$
DECLARE
    sensor_count INTEGER;
    crops_count INTEGER;
    settings_count INTEGER;
BEGIN
    -- Verificar sensor_readings
    SELECT COUNT(*) INTO sensor_count 
    FROM information_schema.columns 
    WHERE table_name = 'sensor_readings' 
    AND column_name IN ('air_humidity', 'soil_humidity', 'temperature');
    
    IF sensor_count != 3 THEN
        RAISE EXCEPTION 'Error en sensor_readings: se esperaban 3 columnas, se encontraron %', sensor_count;
    END IF;
    
    -- Verificar crops
    SELECT COUNT(*) INTO crops_count 
    FROM information_schema.columns 
    WHERE table_name = 'crops' 
    AND column_name LIKE '%humidity%';
    
    IF crops_count != 4 THEN
        RAISE EXCEPTION 'Error en crops: se esperaban 4 columnas de humedad, se encontraron %', crops_count;
    END IF;
    
    -- Verificar automatic_settings
    SELECT COUNT(*) INTO settings_count 
    FROM information_schema.columns 
    WHERE table_name = 'automatic_settings' 
    AND column_name LIKE '%humidity%';
    
    IF settings_count != 4 THEN
        RAISE EXCEPTION 'Error en automatic_settings: se esperaban 4 columnas de humedad, se encontraron %', settings_count;
    END IF;
    
    RAISE NOTICE 'Migración completada exitosamente. Todas las verificaciones pasaron.';
END $$;

COMMIT;

-- ========================================
-- RESUMEN FINAL
-- ========================================

SELECT 'MIGRACIÓN COMPLETADA' as status;

-- Mostrar resumen de cambios
SELECT 
    'sensor_readings' as table_name,
    COUNT(*) as total_records,
    COUNT(air_humidity) as air_humidity_records,
    COUNT(soil_humidity) as soil_humidity_records
FROM sensor_readings;

SELECT 
    'crops' as table_name,
    COUNT(*) as total_records,
    COUNT(air_humidity_min) as air_humidity_min_records,
    COUNT(soil_humidity_min) as soil_humidity_min_records
FROM crops;

SELECT 
    'automatic_settings' as table_name,
    COUNT(*) as total_records,
    COUNT(air_humidity_min_threshold) as air_humidity_min_threshold_records,
    COUNT(soil_humidity_min_threshold) as soil_humidity_min_threshold_records
FROM automatic_settings;
