# Scripts para Eliminar Tablas de la Base de Datos

## 📋 Descripción

Estos scripts permiten eliminar tablas específicas de la base de datos Vivantia IoT. Se han creado tres versiones según el nivel de detalle y seguridad requerido.

## 🗂️ Scripts Disponibles

### 1. `drop_tables.sql` (RECOMENDADO)
- **Uso**: Script completo con verificaciones y estadísticas
- **Características**:
  - Verifica existencia de tablas antes de eliminar
  - Muestra estadísticas de datos antes de eliminar
  - Elimina en orden correcto de dependencias
  - Verifica eliminación exitosa
  - Muestra tablas restantes

### 2. `drop_tables_simple.sql` (RÁPIDO)
- **Uso**: Script simple y directo
- **Características**:
  - Eliminación directa sin verificaciones extensas
  - Verificación básica al final
  - Ideal para entornos de desarrollo

### 3. `drop_tables_complete.sql` (COMPLETO)
- **Uso**: Elimina tablas principales y todas sus dependencias
- **Características**:
  - Elimina tablas principales y relacionadas
  - Incluye `irrigation_configs`, `programmed_settings`, `pump_activations`
  - Verificación completa de eliminación

## 🚀 Instrucciones de Uso

### Paso 1: Backup (OBLIGATORIO)
```bash
# Crear backup de la base de datos
pg_dump -h localhost -U tu_usuario -d tu_base_datos > backup_antes_eliminacion.sql
```

### Paso 2: Ejecutar Script
```bash
# Opción 1: Script completo (recomendado)
psql -h localhost -U tu_usuario -d tu_base_datos -f server/scripts/drop_tables.sql

# Opción 2: Script simple
psql -h localhost -U tu_usuario -d tu_base_datos -f server/scripts/drop_tables_simple.sql

# Opción 3: Script completo con dependencias
psql -h localhost -U tu_usuario -d tu_base_datos -f server/scripts/drop_tables_complete.sql
```

## 📊 Tablas que se Eliminan

### Scripts 1 y 2 (Básicos)
- `crops` - Información de cultivos
- `sensor_readings` - Lecturas de sensores
- `automatic_settings` - Configuraciones automáticas

### Script 3 (Completo)
- `crops` - Información de cultivos
- `sensor_readings` - Lecturas de sensores
- `automatic_settings` - Configuraciones automáticas
- `irrigation_configs` - Configuraciones de riego
- `programmed_settings` - Configuraciones programadas
- `pump_activations` - Activaciones de bomba

## ⚠️ Consideraciones Importantes

### 1. Backup Obligatorio
- **SIEMPRE** hacer backup antes de ejecutar
- La eliminación es irreversible

### 2. Orden de Dependencias
Los scripts eliminan las tablas en el orden correcto:
1. `automatic_settings` (depende de `irrigation_configs`)
2. `sensor_readings` (depende de `devices`)
3. `crops` (depende de `users`)

### 3. Tablas que NO se Eliminan
- `users` - Usuarios del sistema
- `devices` - Dispositivos IoT
- `alerts` - Alertas del sistema

### 4. Efectos en Cascada
- Al eliminar `crops`, se eliminan automáticamente las configuraciones de riego relacionadas
- Al eliminar `sensor_readings`, se pierden todos los datos históricos de sensores
- Al eliminar `automatic_settings`, se pierden las configuraciones automáticas

## 🔍 Verificación Post-Eliminación

### Verificar Eliminación
```sql
-- Verificar que las tablas fueron eliminadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('crops', 'sensor_readings', 'automatic_settings')
AND table_schema = 'public';
```

### Verificar Tablas Restantes
```sql
-- Ver tablas restantes
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

## 🆘 Solución de Problemas

### Error: "table does not exist"
- Es normal si las tablas ya fueron eliminadas
- El script usa `DROP TABLE IF EXISTS` para evitar errores

### Error: "permission denied"
- Verificar permisos de usuario en PostgreSQL
- Usar usuario con permisos de DDL

### Error: "cannot drop table because other objects depend on it"
- Usar el script completo (`drop_tables_complete.sql`)
- O ejecutar manualmente en orden de dependencias

## 📞 Recuperación

Si necesitas recuperar datos:
1. Usar el backup creado antes de la eliminación
2. Restaurar solo las tablas necesarias
3. Contactar al equipo de desarrollo si no tienes backup

## ✅ Checklist Pre-Eliminación

- [ ] Backup creado exitosamente
- [ ] Verificar que no hay procesos activos usando las tablas
- [ ] Confirmar que los datos no son necesarios
- [ ] Elegir el script apropiado según necesidades
- [ ] Ejecutar en entorno de prueba primero (recomendado)
