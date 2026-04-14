import axios from 'axios';
import { api, getAuthToken } from '@/shared/api/client';
import { toCamelCase } from '@/shared/wire';

interface Envelope<T> { status: number; message: string; data: T; }
function cc<T>(raw: unknown): T { return toCamelCase(raw as never) as unknown as T; }

export interface CallSheetMeal {
  type: 'breakfast' | 'lunch' | 'dinner' | 'craft_service' | 'other';
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
}

export interface CrewContact {
  name: string;
  role: string;
  phone: string;
}

export interface CallSheetData {
  _id: string;
  projectId: string;
  shootDay: number;
  date: string;
  productionName: string;
  meals: CallSheetMeal[];
  wrapTime: string;
  unitCall: string;
  estimatedHeadcount: number;
  cateringBase: string;
  crewContacts: CrewContact[];
  sourceFileName: string;
  created: number;
}

export async function uploadCallSheet(file: File): Promise<CallSheetData> {
  const form = new FormData();
  form.append('file', file, file.name);
  const token = getAuthToken();
  const res = await axios.post<Envelope<unknown>>('/api/v2/callsheet/parse', form, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return cc<CallSheetData>(res.data.data);
}

export async function fetchLatestCallSheet(): Promise<CallSheetData | null> {
  const { data } = await api.get<Envelope<unknown>>('/callsheet/latest');
  const result = cc<CallSheetData>(data.data);
  return result?._id ? result : null;
}

export async function createManualCallSheet(
  fields: Partial<CallSheetData>
): Promise<CallSheetData> {
  const { data } = await api.post<Envelope<unknown>>('/callsheet/manual', fields);
  return cc<CallSheetData>(data.data);
}

export async function updateCallSheet(
  id: string,
  updates: Partial<CallSheetData>
): Promise<CallSheetData> {
  const { data } = await api.put<Envelope<unknown>>(`/callsheet/${id}`, updates);
  return cc<CallSheetData>(data.data);
}
