const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

/**
 * Bazaviy fetch wrapper.
 * Barcha API so'rovlar shu orqali o'tadi.
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const method = options.method?.toUpperCase() ?? "GET";
  const needsCsrf = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(needsCsrf ? { "X-CSRFToken": getCsrfToken() } : {}),
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(res.status, errorData);
  }

  return res.json();
}

export class ApiError extends Error {
  constructor(public status: number, public data: Record<string, unknown>) {
    super(`API Error: ${status}`);
  }
}

/** Cookie'dan joriy foydalanuvchi ID sini o'qiydi. */
export function getManagerId(): number {
  if (typeof document === "undefined") return 0;
  const match = document.cookie.match(/(?:^|;\s*)userId=(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/** Django CSRF token ni cookie dan o'qiydi. */
function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? match[1] : "";
}

/* ── Types ── */
export interface Worker {
  id: number;
  code: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  full_name: string;
  phone: string;
  role: string;
  role_display: string;
  status: string;
  status_display: string;
  is_active: boolean;
  photo: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkType {
  id: number;
  name: string;
  product_model: number;
  price: string; // DecimalField returns string
}

export interface ProductModel {
  id: number;
  name: string;
  code: string;
  status: string;
  work_types: WorkType[];
}

export interface WorkLog {
  id: number;
  worker: number;
  worker_name: string;
  work_type: number;
  work_type_name: string;
  product_model_name: string;
  quantity: number;
  price_snapshot: string;
  total_sum: string;
  work_date: string;
  manager: number;
  manager_name: string;
  note: string;
  created_at: string;
}

/* ── API Functions ── */

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    apiFetch<{ id: number; username: string; full_name: string; role: string }>(
      "/auth/login/", { method: "POST", body: JSON.stringify({ username, password }) }
    ),
  logout: () => apiFetch<{ message: string }>("/auth/logout/", { method: "POST" }),
  me: () =>
    apiFetch<{ id: number; username: string; full_name: string; role: string }>("/auth/me/"),
};

// Accounts (Workers)
export const accountsApi = {
  // Workers
  workersList: () => apiFetch<{ results: Worker[] }>("/accounts/workers/"),
  lookup: (code: string) => apiFetch<Worker>(`/accounts/workers/lookup/?code=${code}`),
  
  // Advances
  advanceList: () => apiFetch<{ results: any[] }>("/accounts/advances/"),
  advanceCreate: (data: { worker: number; amount: number; description?: string; manager?: number }) =>
    apiFetch<any>("/accounts/advances/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Payroll
  payrollList: (month: number, year: number) => 
    apiFetch<any[]>(`/accounts/payroll/?month=${month}&year=${year}`),
  paySalary: (data: { worker_id: number; month: number; year: number }) =>
    apiFetch<any>("/accounts/pay-salary/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  exportPayrollUrl: (month: number, year: number) =>
    `${API_BASE}/accounts/export-payroll/?month=${month}&year=${year}`,
};

// Workers
export const workersApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<{ results: Worker[]; count: number }>(`/workers/${qs}`);
  },
  get: (id: number) => apiFetch<Worker>(`/workers/${id}/`),
  create: (data: Partial<Worker>) =>
    apiFetch<Worker>("/workers/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Worker>) =>
    apiFetch<Worker>(`/workers/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  toggleActive: (id: number) =>
    apiFetch<{ id: number; code: string; full_name: string; is_active: boolean }>(
      `/workers/${id}/toggle-active/`, { method: "POST" }
    ),
  lookup: (code: string) =>
    apiFetch<Worker>(`/workers/lookup/?code=${encodeURIComponent(code)}`),
};

// Products
export const productsApi = {
  list: (activeOnly = true) => {
    const params = activeOnly ? "?status=active" : "";
    return apiFetch<{ results: ProductModel[] }>(`/products/${params}`);
  },
  get: (id: number) => apiFetch<ProductModel>(`/products/${id}/`),
};

// Work Logs
export const workLogsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<{ results: WorkLog[] }>(`/work-logs/${qs}`);
  },
  create: (data: {
    worker: number;
    work_type: number;
    quantity: number;
    work_date: string;
    manager: number;
    note?: string;
  }) =>
    apiFetch<WorkLog>("/work-logs/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  tvDashboard: () => apiFetch<{
    stats: { today_total: number; month_total: number; active_workers_today: number };
    top_today: { rank: number; id: number; name: string; photo: string | null; amount: number; items: number }[];
    top_month: { rank: number; id: number; name: string; photo: string | null; amount: number; items: number }[];
  }>("/work-logs/tv-dashboard/"),
};

// Inventory
export const inventoryApi = {
  skladList: () => apiFetch<{ results: any[] }>("/inventory/sklad/"),
  bichuvList: () => apiFetch<{ results: any[] }>("/inventory/bichuv/"),
  upakovkaList: () => apiFetch<{ results: any[] }>("/inventory/upakovka/"),
  chainAnalysis: (batchValue: string) => apiFetch<any>(`/inventory/chain-analysis/?batch_number=${batchValue}`),
  bichuvCreate: (data: {
    sklad: number;
    batch_number: string;
    product_model: number;
    quantity: number;
    weight_kg: number;
    cut_date: string;
  }) => apiFetch<any>("/inventory/bichuv/", { method: "POST", body: JSON.stringify(data) }),
  upakovkaCreate: (data: {
    bichuv: number;
    batch_number: string;
    product_model: number;
    quantity: number;
    defect_count: number;
    pack_date: string;
  }) => apiFetch<any>("/inventory/upakovka/", { method: "POST", body: JSON.stringify(data) }),
};

// Reports
export const reportsApi = {
  stats: () => apiFetch<Array<{ date: string; volume: number; defect_pct: number }>>("/reports/stats/"),
  excelUrl: () => `${API_BASE}/reports/excel/`,
  pdfSlipUrl: (workerId: number) => `${API_BASE}/reports/pdf-slip/?worker_id=${workerId}`,
};
