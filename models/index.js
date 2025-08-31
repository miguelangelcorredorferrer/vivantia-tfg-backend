// Importar todos los modelos
import User from './User.js';
import Crop from './Crop.js';
import Device from './Device.js';
import SensorReading from './SensorReading.js';
import { 
  IrrigationConfig, 
  ManualConfig, 
  AutomaticConfig, 
  ProgrammedConfig 
} from './IrrigationConfig.js';
import PumpActivation from './PumpActivation.js';
import Alert from './Alert.js';

// Exportar todos los modelos
export {
  User,
  Crop,
  Device,
  SensorReading,
  IrrigationConfig,
  ManualConfig,
  AutomaticConfig,
  ProgrammedConfig,
  PumpActivation,
  Alert
};

// Exportación por defecto con todos los modelos
export default {
  User,
  Crop,
  Device,
  SensorReading,
  IrrigationConfig,
  ManualConfig,
  AutomaticConfig,
  ProgrammedConfig,
  PumpActivation,
  Alert
}; 