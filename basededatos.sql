CREATE TYPE user_role AS ENUM ('admin', 'usuario', 'visitante');
CREATE TYPE irrigation_mode AS ENUM ('manual', 'automatic', 'programmed');
CREATE TYPE frequency_type AS ENUM ('once', 'daily', 'custom');
CREATE TYPE pump_status AS ENUM ('active', 'completed', 'cancelled', 'paused', 'error', 'inactive', 'programmed');
CREATE TYPE alert_severity AS ENUM ('info', 'success', 'warning', 'error');
CREATE TYPE alert_category AS ENUM (
  'user',           -- Acciones del usuario (registro, login, cambios)
  'environmental',  -- Condiciones ambientales (temperatura, humedad)
  'device',         -- Estado de dispositivos IoT
  'crop',           -- Gestión de cultivos
  'irrigation'      -- Actividad de riego
);

CREATE TYPE alert_subtype AS ENUM (
  -- User alerts
  'user_registered', 'user_logged_in', 'username_changed', 'password_changed', 'session_closed',
  
  -- Environmental alerts
  'temperature_max_threshold', 'air_humidity_min_threshold', 'air_humidity_max_threshold', 
  'soil_humidity_min_threshold', 'soil_humidity_max_threshold', 'system_online', 'system_offline',
  
  -- Device alerts
  'device_added', 'api_key_copied', 'device_offline', 'device_online', 'device_deleted', 'device_edited',
  
  -- Crop alerts
  'crop_selected', 'crop_deselected', 'crop_edited', 'crop_deleted', 'crop_added', 'crop_edited',
  
  -- Irrigation alerts
  'manual_started', 'emergency_stop', 'manual_cancelled', 'programmed_saved',
  'programmed_reminder', 'programmed_schedule', 'programmed_cancelled', 'automatic_saved',
  'automatic_activated_temperature', 'automatic_activated_soil_humidity', 'automatic_activated_air_humidity',
  'automatic_deactivated_optimal_conditions', 'automatic_deactivated_soil_optimal', 'automatic_cancelled',
  'irrigation_started', 'irrigation_ended', 'irrigation_cancelled', 'irrigation_paused', 'irrigation_resumed'
);




CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'visitante',
  token TEXT,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE crops (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT, 
  image VARCHAR(255), 
  category VARCHAR(255), 
  growth_days INTEGER, 
  air_humidity_min DECIMAL(5,2),
  air_humidity_max DECIMAL(5,2), 
  soil_humidity_min DECIMAL(5,2),
  soil_humidity_max DECIMAL(5,2), 
  temperature_max DECIMAL(5,2), 
  session VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  selected BOOLEAN DEFAULT FALSE
);

CREATE TABLE devices ( 
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  device_name VARCHAR(255) NOT NULL,
  enddevice_id VARCHAR(255) NOT NULL,
  app_eui VARCHAR(16) NOT NULL,
  dev_eui VARCHAR(16) NOT NULL,
  app_key VARCHAR(32) NOT NULL,
  ttn_region VARCHAR(10),
  ttn_app_id VARCHAR(100),
  ttn_access_key VARCHAR(255),
  is_active_communication BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE sensor_readings (
  id SERIAL PRIMARY KEY,
  device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
  air_humidity DECIMAL(5,2), 
  soil_humidity DECIMAL(5,2),
  temperature DECIMAL(5,2),
  received_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE irrigation_configs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  crop_id INTEGER REFERENCES crops(id) ON DELETE CASCADE,
  mode_type irrigation_mode NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  last_irrigation_at TIMESTAMP,
  duration_minutes INTEGER, 
  UNIQUE(user_id, crop_id, mode_type) 
);


CREATE TABLE programmed_settings (
  config_id INTEGER PRIMARY KEY REFERENCES irrigation_configs(id) ON DELETE CASCADE,
  start_datetime TIMESTAMP NOT NULL,
  frequency_type frequency_type NOT NULL,
  custom_days INTEGER[], 
  notify_before_minutes INTEGER DEFAULT 5,
  notify_at_start BOOLEAN DEFAULT TRUE,
  notify_at_end BOOLEAN DEFAULT TRUE,
  last_execution TIMESTAMP,
  next_execution TIMESTAMP
);


CREATE TABLE automatic_settings (
  config_id INTEGER PRIMARY KEY REFERENCES irrigation_configs(id) ON DELETE CASCADE,
  air_humidity_min_threshold DECIMAL(5,2) NOT NULL,
  air_humidity_max_threshold DECIMAL(5,2) NOT NULL,
  soil_humidity_min_threshold DECIMAL(5,2) NOT NULL,
  soil_humidity_max_threshold DECIMAL(5,2) NOT NULL,
  temperature_max_threshold DECIMAL(5,2) NOT NULL,
  use_crop_thresholds BOOLEAN DEFAULT TRUE
);

CREATE TABLE pump_activations (
  id SERIAL PRIMARY KEY,
  irrigation_config_id INTEGER REFERENCES irrigation_configs(id),
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  duration_minutes INTEGER,
  status pump_status DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  alert_type alert_category NOT NULL,
  alert_subtype alert_subtype NOT NULL,
  severity alert_severity DEFAULT 'info',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);