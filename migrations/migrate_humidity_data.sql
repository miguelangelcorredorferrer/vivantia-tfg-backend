-- Script de migración de datos para humedad
-- Fecha: $(date)
-- Descripción: Migrar datos existentes de humedad a la nueva estructura

-- 1. Migrar datos existentes en sensor_readings
-- Asumimos que los datos existentes en 'humidity' son de humedad ambiental
-- y los copiamos a 'air_humidity' (esto ya se hace automáticamente con RENAME)
-- Para soil_humidity, establecemos valores por defecto basados en air_humidity
-- o NULL si no hay datos

UPDATE sensor_readings 
SET soil_humidity = CASE 
    WHEN air_humidity IS NOT NULL THEN 
        -- Estimación basada en humedad ambiental (ajustar según lógica de negocio)
        GREATEST(0, LEAST(100, air_humidity * 0.8 + 20))
    ELSE NULL 
END
WHERE soil_humidity IS NULL;

-- 2. Migrar datos existentes en crops
-- Los datos existentes en humidity_min/max se convierten en air_humidity_min/max
-- Para soil_humidity, establecemos valores por defecto

UPDATE crops 
SET soil_humidity_min = CASE 
    WHEN air_humidity_min IS NOT NULL THEN 
        -- Valor por defecto para humedad del suelo (ajustar según necesidades)
        GREATEST(0, air_humidity_min - 10)
    ELSE 30 -- Valor por defecto
END
WHERE soil_humidity_min IS NULL;

UPDATE crops 
SET soil_humidity_max = CASE 
    WHEN air_humidity_max IS NOT NULL THEN 
        -- Valor por defecto para humedad del suelo (ajustar según necesidades)
        LEAST(100, air_humidity_max + 10)
    ELSE 80 -- Valor por defecto
END
WHERE soil_humidity_max IS NULL;

-- 3. Migrar datos existentes en automatic_settings
-- Los datos existentes se convierten en air_humidity thresholds
-- Para soil_humidity, establecemos valores por defecto

UPDATE automatic_settings 
SET soil_humidity_min_threshold = CASE 
    WHEN air_humidity_min_threshold IS NOT NULL THEN 
        -- Valor por defecto para humedad del suelo (ajustar según necesidades)
        GREATEST(0, air_humidity_min_threshold - 10)
    ELSE 30 -- Valor por defecto
END
WHERE soil_humidity_min_threshold IS NULL;

UPDATE automatic_settings 
SET soil_humidity_max_threshold = CASE 
    WHEN air_humidity_max_threshold IS NOT NULL THEN 
        -- Valor por defecto para humedad del suelo (ajustar según necesidades)
        LEAST(100, air_humidity_max_threshold + 10)
    ELSE 80 -- Valor por defecto
END
WHERE soil_humidity_max_threshold IS NULL;

-- 4. Verificar la migración de datos
SELECT 
    'sensor_readings' as table_name,
    COUNT(*) as total_records,
    COUNT(air_humidity) as air_humidity_records,
    COUNT(soil_humidity) as soil_humidity_records,
    AVG(air_humidity) as avg_air_humidity,
    AVG(soil_humidity) as avg_soil_humidity
FROM sensor_readings;

SELECT 
    'crops' as table_name,
    COUNT(*) as total_records,
    COUNT(air_humidity_min) as air_humidity_min_records,
    COUNT(air_humidity_max) as air_humidity_max_records,
    COUNT(soil_humidity_min) as soil_humidity_min_records,
    COUNT(soil_humidity_max) as soil_humidity_max_records
FROM crops;

SELECT 
    'automatic_settings' as table_name,
    COUNT(*) as total_records,
    COUNT(air_humidity_min_threshold) as air_humidity_min_threshold_records,
    COUNT(air_humidity_max_threshold) as air_humidity_max_threshold_records,
    COUNT(soil_humidity_min_threshold) as soil_humidity_min_threshold_records,
    COUNT(soil_humidity_max_threshold) as soil_humidity_max_threshold_records
FROM automatic_settings;

-- 5. Mostrar algunos ejemplos de datos migrados
SELECT 
    'sensor_readings sample' as info,
    id,
    device_id,
    air_humidity,
    soil_humidity,
    temperature,
    received_at
FROM sensor_readings 
ORDER BY received_at DESC 
LIMIT 5;

SELECT 
    'crops sample' as info,
    id,
    name,
    air_humidity_min,
    air_humidity_max,
    soil_humidity_min,
    soil_humidity_max
FROM crops 
LIMIT 5;

SELECT 
    'automatic_settings sample' as info,
    config_id,
    air_humidity_min_threshold,
    air_humidity_max_threshold,
    soil_humidity_min_threshold,
    soil_humidity_max_threshold
FROM automatic_settings 
LIMIT 5;
