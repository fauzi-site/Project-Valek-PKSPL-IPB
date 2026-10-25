import api from '../../services/api';

export interface TcmSurveyRespondent {
  id_tcm?: number;
  id?: number;
  id_proyek: number;
  respondent_id: string;
  respondent_name?: string;
  origin: string;
  distance_km?: number;
  group_size?: number;
  annual_visits: number;
  transport_cost: number;
  accommodation_cost?: number;
  food_cost?: number;
  ticket_fee?: number;
  other_expenses?: number;
  total_travel_cost: number;
  opportunity_time_cost?: number;
  income?: number;
  age?: number;
  education_level?: string;
  visit_purpose?: string;
  site_rating?: number;
  socioeconomic_data?: Record<string, any>;
  notes?: string;
}

export interface CvmSurveyRespondent {
  id_cvm?: number;
  id?: number;
  id_proyek: number;
  respondent_id: string;
  respondent_name?: string;
  elicitation_format: string;
  bid_amount: number;
  willingness_to_pay: boolean;
  max_willingness_to_pay?: number;
  payment_vehicle?: string;
  reason_not_willing?: string;
  household_income?: number;
  education_level?: string;
  occupation?: string;
  age?: number;
  gender?: string;
  environmental_attitude_score?: number;
  socioeconomic_data?: Record<string, any>;
  notes?: string;
}

export interface EconometricAnalysisSummary {
  model_type: string;
  dependent_variable: string;
  independent_variables: string[];
  coefficients?: Record<string, number>;
  consumer_surplus_per_visit?: number;
  total_recreation_value?: number;
  median_wtp?: number;
  mean_wtp?: number;
  total_wtp_value?: number;
  r_squared?: number;
  pseudo_r_squared?: number;
  n: number;
  notes?: string;
}

const unwrap = (response: any) => response.data?.data || response.data;

export async function getTcmSurveyData(projectId: string | number): Promise<TcmSurveyRespondent[]> {
  try {
    const res = await api.get(`/proyek/${projectId}/tcm-data`);
    return unwrap(res);
  } catch (error) {
    console.warn('[SurveyValuation] Error fetching TCM survey data:', error);
    return [];
  }
}

export async function getCvmSurveyData(projectId: string | number): Promise<CvmSurveyRespondent[]> {
  try {
    const res = await api.get(`/proyek/${projectId}/cvm-data`);
    return unwrap(res);
  } catch (error) {
    console.warn('[SurveyValuation] Error fetching CVM survey data:', error);
    return [];
  }
}

export async function getTcmAnalysis(projectId: string | number): Promise<EconometricAnalysisSummary | null> {
  try {
    const res = await api.get(`/proyek/${projectId}/tcm-analysis`);
    return unwrap(res);
  } catch (error) {
    console.warn('[SurveyValuation] Error fetching TCM analysis:', error);
    return null;
  }
}

export async function getCvmAnalysis(projectId: string | number): Promise<EconometricAnalysisSummary | null> {
  try {
    const res = await api.get(`/proyek/${projectId}/cvm-analysis`);
    return unwrap(res);
  } catch (error) {
    console.warn('[SurveyValuation] Error fetching CVM analysis:', error);
    return null;
  }
}

export async function createTcmRespondent(
  projectId: string | number,
  data: Partial<TcmSurveyRespondent>
): Promise<TcmSurveyRespondent> {
  const res = await api.post(`/proyek/${projectId}/tcm-data`, data);
  return unwrap(res);
}

export async function createCvmRespondent(
  projectId: string | number,
  data: Partial<CvmSurveyRespondent>
): Promise<CvmSurveyRespondent> {
  const res = await api.post(`/proyek/${projectId}/cvm-data`, data);
  return unwrap(res);
}

export async function deleteTcmRespondent(projectId: string | number, idTcm: number): Promise<void> {
  await api.delete(`/proyek/${projectId}/tcm-data/${idTcm}`);
}

export async function deleteCvmRespondent(projectId: string | number, idCvm: number): Promise<void> {
  await api.delete(`/proyek/${projectId}/cvm-data/${idCvm}`);
}

export async function runTcmAnalysis(
  projectId: string | number,
  areaId?: string | number
): Promise<EconometricAnalysisSummary | null> {
  const res = await api.post(`/proyek/${projectId}/tcm-analysis`, { id_jenis_tutupan_lahan: areaId });
  return unwrap(res);
}

export async function runCvmAnalysis(
  projectId: string | number,
  areaId?: string | number
): Promise<EconometricAnalysisSummary | null> {
  const res = await api.post(`/proyek/${projectId}/cvm-analysis`, { id_jenis_tutupan_lahan: areaId });
  return unwrap(res);
}
