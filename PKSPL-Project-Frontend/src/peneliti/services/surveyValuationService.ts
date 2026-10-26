import api from '../../services/api';

export interface TcmSurveyRespondent {
  id_tcm?: number;
  id?: number;
  id_proyek: number;
  respondent_id: string;
  respondent_name?: string;
  origin: string;
  distance?: number | string | null;
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

const unwrap = (response: any) => response.data?.data || response.data;

export async function getTcmSurveyData(projectId: string | number, lokasi?: string): Promise<TcmSurveyRespondent[]> {
  try {
    const res = await api.get(`/proyek/${projectId}/tcm-data`, { params: lokasi === undefined ? {} : { lokasi } });
    return unwrap(res);
  } catch (error) {
    console.warn('[SurveyValuation] Error fetching TCM survey data:', error);
    return [];
  }
}

export async function getCvmSurveyData(projectId: string | number, lokasi?: string): Promise<CvmSurveyRespondent[]> {
  try {
    const res = await api.get(`/proyek/${projectId}/cvm-data`, { params: lokasi === undefined ? {} : { lokasi } });
    return unwrap(res);
  } catch (error) {
    console.warn('[SurveyValuation] Error fetching CVM survey data:', error);
    return [];
  }
}

export interface TcmRespondentPayload {
  respondent_id: string;
  annual_visits: number;
  total_travel_cost: number;
  /** One-way distance from the respondent's origin, in km. */
  distance?: number;
  socioeconomic_data: {
    origin?: string;
    education?: number;
    income?: number;
    trip_duration?: number;
    // Components of total_travel_cost, kept when the researcher entered them one by one.
    transport_cost?: number;
    food_cost?: number;
    accommodation_cost?: number;
    ticket_fee?: number;
    other_expenses?: number;
  };
}

export interface CvmRespondentPayload {
  respondent_id: string;
  elicitation_format: 'dichotomous_choice';
  bid_amount: number;
  willingness_to_pay: boolean;
  socioeconomic_data: { income?: number };
}

export interface TcmEstimate {
  ok: boolean;
  message: string | null;
  coefficients: Record<string, number>;
  cs_per_visit?: number | null;
  mean_sk_per_respondent?: number | null;
  total_annual_visits?: number | null;
  total_cs?: number | null;
  respondent_count: number;
  /** Reliability notes; the estimate is still returned. */
  warnings?: string[];
  mean_travel_cost: number;
  converged: boolean;
  diagnostics: {
    variables?: string[];
    dropped_no_variation?: string[];
    model?: string;
    r_squared?: number | null;
  };
}

export interface NonparametricBidRow {
  bid: number;
  n: number;
  yes: number;
  no: number;
  accept_rate: number;
  reject_rate: number;
}

export interface CvmEstimate {
  ok: boolean;
  message: string | null;
  ewtp?: number | null;
  coefficients: Record<string, number>;
  respondent_count: number;
  yes_count: number;
  no_count: number;
  warnings?: string[];
  mean_bid: number;
  nonparametric?: {
    table: NonparametricBidRow[];
    pooled: boolean;
    median_wtp: number | null;
    class_median: number;
    turnbull: number;
    kmt: number;
  };
  converged: boolean;
  diagnostics: { variables?: string[]; model?: string };
}

export interface TcmAnalysisOptions {
  lokasi?: string;
  model?: 'ols' | 'poisson' | 'negative_binomial';
  covariates?: string[];
  totalAnnualVisits?: number;
}

export interface CvmAnalysisOptions {
  lokasi?: string;
  model?: 'logit' | 'probit';
  covariates?: string[];
}

export interface BatchResult {
  count: number;
  message: string;
}

export async function getTcmAnalysis(
  projectId: string | number,
  options: TcmAnalysisOptions = {}
): Promise<TcmEstimate | null> {
  try {
    const params: Record<string, string | number> = {};
    if (options.model) params.model = options.model;
    if (options.covariates) params.covariates = options.covariates.join(',');
    if (options.totalAnnualVisits) params.total_annual_visits = options.totalAnnualVisits;
    if (options.lokasi !== undefined) params.lokasi = options.lokasi;
    const res = await api.get(`/proyek/${projectId}/tcm-analysis`, { params });
    return res.data?.estimate ?? null;
  } catch (error) {
    console.warn('[SurveyValuation] Error fetching TCM analysis:', error);
    return null;
  }
}

export async function getCvmAnalysis(
  projectId: string | number,
  options: CvmAnalysisOptions = {}
): Promise<CvmEstimate | null> {
  try {
    const params: Record<string, string> = {};
    if (options.model) params.model = options.model;
    if (options.covariates) params.covariates = options.covariates.join(',');
    if (options.lokasi !== undefined) params.lokasi = options.lokasi;
    const res = await api.get(`/proyek/${projectId}/cvm-analysis`, { params });
    return res.data?.estimate ?? null;
  } catch (error) {
    console.warn('[SurveyValuation] Error fetching CVM analysis:', error);
    return null;
  }
}

export async function batchSaveTcmRespondents(
  projectId: string | number,
  respondents: TcmRespondentPayload[],
  lokasi?: string
): Promise<BatchResult> {
  const res = await api.post(`/proyek/${projectId}/tcm-data/batch`, { lokasi, respondents });
  return res.data;
}

export async function batchSaveCvmRespondents(
  projectId: string | number,
  respondents: CvmRespondentPayload[],
  lokasi?: string
): Promise<BatchResult> {
  const res = await api.post(`/proyek/${projectId}/cvm-data/batch`, { lokasi, respondents });
  return res.data;
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

export interface SurveyLocation {
  /** Empty string for respondents saved before locations existed. */
  lokasi: string;
  total: number;
}

export async function getSurveyLocations(
  projectId: string | number,
  method: 'tcm' | 'cvm'
): Promise<SurveyLocation[]> {
  try {
    const res = await api.get(`/proyek/${projectId}/survey-locations`, { params: { method } });
    return res.data?.data ?? [];
  } catch (error) {
    console.warn('[SurveyValuation] Error fetching survey locations:', error);
    return [];
  }
}

export async function renameSurveyLocation(
  projectId: string | number,
  method: 'tcm' | 'cvm',
  from: string,
  to: string
): Promise<{ count: number; message: string }> {
  const res = await api.post(`/proyek/${projectId}/survey-locations/rename`, { method, from, to });
  return res.data;
}
