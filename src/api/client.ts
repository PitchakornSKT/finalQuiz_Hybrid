export const API_BASE = 'https://cis.kku.ac.th/api/classroom';
export const FALLBACK_TOKEN = '51bd9c1b9b33adc23964465d24add4a9cc0e2c04589a35d65ef6a872f38ff585';


export async function apiFetch(path: string, options: RequestInit = {}, token?: string) {
const headers: any = { 'Content-Type': 'application/json', ...(options.headers || {}) };
const authToken = token || FALLBACK_TOKEN;
if (authToken) headers.Authorization = `Bearer ${authToken}`;
const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
if (!res.ok) {
const text = await res.text();
throw new Error(`API ${res.status}: ${text}`);
}


const contentType = res.headers.get('content-type') || '';
if (contentType.includes('application/json')) return res.json();
return null;
}