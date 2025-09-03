-- ==============================
-- Script para borrar DB vivantia
-- ==============================

DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS pump_activations CASCADE;
DROP TABLE IF EXISTS automatic_settings CASCADE;
DROP TABLE IF EXISTS programmed_settings CASCADE;
DROP TABLE IF EXISTS irrigation_configs CASCADE;
DROP TABLE IF EXISTS sensor_readings CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS crops CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS alert_subtype CASCADE;
DROP TYPE IF EXISTS alert_category CASCADE;
DROP TYPE IF EXISTS alert_severity CASCADE;
DROP TYPE IF EXISTS pump_status CASCADE;
DROP TYPE IF EXISTS frequency_type CASCADE;
DROP TYPE IF EXISTS irrigation_mode CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

DROP DATABASE IF EXISTS vivantia;
