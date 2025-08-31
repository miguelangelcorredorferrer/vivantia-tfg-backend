# Migración de Humedad: Diferenciación entre Humedad Ambiental y del Suelo

## 📋 Descripción

Esta migración permite diferenciar entre dos tipos de humedad en el sistema IoT de riego:
- **Humedad Ambiental**: Humedad relativa del aire (medida por sensor DHT11)
- **Humedad del Suelo**: Humedad del suelo (medida por sensor capacitivo)

## 🗂️ Archivos de Migración

### 1. `run_humidity_migration.sql` (PRINCIPAL)
- **Uso**: Script principal que ejecuta toda la migración
- **Contiene**: Estructura, datos, optimización y verificación
- **Ejecutar**: Este es el archivo que debes ejecutar

### 2. `add_soil_humidity.sql`
- **Uso**: Solo cambios de estructura (sin migración de datos)
- **Contiene**: Renombrado de columnas y nuevas columnas

### 3. `migrate_humidity_data.sql`
- **Uso**: Solo migración de datos existentes
- **Contiene**: Actualización de datos con valores por defecto

### 4. `rollback_soil_humidity.sql`
- **Uso**: Revertir todos los cambios (en caso de problemas)
- **Contiene**: Comandos para deshacer la migración

## 🚀 Instrucciones de Ejecución

### Paso 1: Backup (OBLIGATORIO)
```bash
# Crear backup de la base de datos
pg_dump -h localhost -U tu_usuario -d tu_base_datos > backup_antes_migracion.sql
```

### Paso 2: Ejecutar Migración
```bash
# Conectar a PostgreSQL y ejecutar el script principal
psql -h localhost -U tu_usuario -d tu_base_datos -f server/migrations/run_humidity_migration.sql
```

### Paso 3: Verificar Resultados
El script mostrará automáticamente:
- Estado de la migración
- Conteo de registros migrados
- Ejemplos de datos actualizados

## 📊 Cambios Realizados

### Tabla `sensor_readings`
| Antes | Después |
|-------|---------|
| `humidity` | `air_humidity` |
| - | `soil_humidity` (NUEVA) |

### Tabla `crops`
| Antes | Después |
|-------|---------|
| `humidity_min` | `air_humidity_min` |
| `humidity_max` | `air_humidity_max` |
| - | `soil_humidity_min` (NUEVA) |
| - | `soil_humidity_max` (NUEVA) |

### Tabla `automatic_settings`
| Antes | Después |
|-------|---------|
| `humidity_min_threshold` | `air_humidity_min_threshold` |
| `humidity_max_threshold` | `air_humidity_max_threshold` |
| - | `soil_humidity_min_threshold` (NUEVA) |
| - | `soil_humidity_max_threshold` (NUEVA) |

### Nuevos Subtipos de Alerta
- `air_humidity_min_threshold`
- `air_humidity_max_threshold`
- `soil_humidity_min_threshold`
- `soil_humidity_max_threshold`

## 🔄 Migración de Datos

### Datos Existentes
- **Humedad existente** → Se convierte en **Humedad Ambiental**
- **Humedad del Suelo** → Se calcula automáticamente basado en humedad ambiental

### Fórmulas de Migración
```sql
-- Para sensor_readings
soil_humidity = GREATEST(0, LEAST(100, air_humidity * 0.8 + 20))

-- Para crops
soil_humidity_min = GREATEST(0, air_humidity_min - 10)
soil_humidity_max = LEAST(100, air_humidity_max + 10)

-- Para automatic_settings
soil_humidity_min_threshold = GREATEST(0, air_humidity_min_threshold - 10)
soil_humidity_max_threshold = LEAST(100, air_humidity_max_threshold + 10)
```

## ⚠️ Consideraciones Importantes

### 1. Backup Obligatorio
- **SIEMPRE** hacer backup antes de ejecutar
- La migración es irreversible sin backup

### 2. Tiempo de Ejecución
- Depende del volumen de datos
- Para bases pequeñas: ~30 segundos
- Para bases grandes: varios minutos

### 3. Compatibilidad
- Los datos existentes se preservan
- Se añaden valores por defecto para humedad del suelo
- La aplicación seguirá funcionando

### 4. Rollback
- Si algo sale mal, usar `rollback_soil_humidity.sql`
- **NOTA**: Los nuevos ENUM values no se pueden eliminar fácilmente

## 🔍 Verificación Post-Migración

### 1. Verificar Estructura
```sql
-- Verificar columnas en sensor_readings
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sensor_readings' 
ORDER BY ordinal_position;

-- Verificar columnas en crops
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'crops' 
AND column_name LIKE '%humidity%';
```

### 2. Verificar Datos
```sql
-- Verificar que hay datos en ambas columnas
SELECT 
    COUNT(*) as total,
    COUNT(air_humidity) as air_humidity_count,
    COUNT(soil_humidity) as soil_humidity_count
FROM sensor_readings;
```

### 3. Verificar Índices
```sql
-- Verificar que se crearon los índices
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename = 'sensor_readings' 
AND indexname LIKE 'idx_sensor_readings_%';
```

## 🆘 Solución de Problemas

### Error: "column does not exist"
- Verificar que el script se ejecutó completamente
- Revisar logs de PostgreSQL

### Error: "duplicate key value"
- Los datos existentes pueden tener conflictos
- Revisar constraints únicos

### Error: "permission denied"
- Verificar permisos de usuario en PostgreSQL
- Usar usuario con permisos de DDL

### Datos Incorrectos
- Revisar fórmulas de migración
- Ajustar valores por defecto según necesidades

## 📞 Soporte

Si encuentras problemas:
1. Revisar logs de PostgreSQL
2. Verificar que el backup se creó correctamente
3. Ejecutar rollback si es necesario
4. Contactar al equipo de desarrollo

## ✅ Checklist Post-Migración

- [ ] Backup creado exitosamente
- [ ] Script ejecutado sin errores
- [ ] Verificación de estructura completada
- [ ] Verificación de datos completada
- [ ] Índices creados correctamente
- [ ] Aplicación funciona correctamente
- [ ] Nuevos datos se insertan correctamente
