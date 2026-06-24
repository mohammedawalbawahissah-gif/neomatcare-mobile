/**
 * src/api/ai.js  (mobile)
 * AI API calls for NeoMatCare Expo app.
 * Uses the same apiClient (axios + JWT interceptor) as all other API calls.
 */
import apiClient from './client'

export const aiApi = {
  /**
   * Role-aware chat assistant.
   * @param {Array}  messages - [{role: 'user'|'assistant', content: string}]
   * @param {object} context  - Optional page/entity context
   */
  chat: (messages, context = {}) =>
    apiClient.post('/ai/chat/', { messages, context }),

  /**
   * Triage note analysis — extract danger signs and structure.
   * @param {string} note   - Free-text triage note
   * @param {string} caseId - Optional case UUID
   */
  triageExtract: (note, caseId = null) =>
    apiClient.post('/ai/triage-extract/', { note, case_id: caseId }),

  /**
   * Risk narration for a patient.
   * @param {string} patientId
   */
  riskNarrate: (patientId) =>
    apiClient.post('/ai/risk-narrate/', { patient_id: patientId }),

  /**
   * ANC anomaly detection.
   * @param {string} patientId
   */
  ancAnomaly: (patientId) =>
    apiClient.post('/ai/anc-anomaly/', { patient_id: patientId }),

  /**
   * Referral handover brief.
   * @param {object} params - { referral_id } or { case_id }
   */
  referralHandover: (params) =>
    apiClient.post('/ai/referral-handover/', params),

  /**
   * Transport recommendation.
   */
  transportRecommend: (caseId, estimatedTravelMinutes, vehicles) =>
    apiClient.post('/ai/transport-recommend/', {
      case_id: caseId,
      estimated_travel_minutes: estimatedTravelMinutes,
      vehicles,
    }),
}
