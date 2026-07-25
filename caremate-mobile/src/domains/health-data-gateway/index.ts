export {
  fetchEmergencyViaGateway,
  fetchProfileViaGateway,
  upsertEmergencyViaGateway,
  upsertProfileViaGateway,
  type GatewayEmergencyRow,
  type GatewayProfileRow,
} from './api';
export {
  gatewayRequest,
  isHealthDataGatewayConfigured,
  HealthDataGatewayError,
} from './client';
export { isEncryptedEnvelope, scrubEncryptedJson, scrubEncryptedText } from './phi';
