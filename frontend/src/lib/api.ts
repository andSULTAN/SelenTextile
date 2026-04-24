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

  const headers: Record<string, string> = {
    ...(needsCsrf ? { "X-CSRFToken": getCsrfToken() } : {}),
    ...(options.headers as any),
  };

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData || 
                     (options.body && typeof (options.body as any).append === 'function');

  // If we're sending FormData, don't explicitly set Content-Type
  // so the browser can append the boundary string automatically.
  if (!isFormData) {
    if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
  } else {
    delete headers["Content-Type"];
  }

  const res = await fetch(url, {
    credentials: "include",
    ...options,
    headers,
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

export interface SystemUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
  role_display: string;
  permissions_list: string[];
  is_active: boolean;
  full_name: string;
  date_joined: string;
}

// Auth
export const authApi = {
  login: (username: string, credential: string, mode: "password" | "pin" = "password") =>
    apiFetch<{ id: number; username: string; full_name: string; role: string; permissions: string[] }>(
      "/auth/login/", {
        method: "POST",
        body: JSON.stringify(mode === "pin" ? { username, pin: credential } : { username, password: credential }),
      }
    ),
  pinLogin: (pin: string) =>
    apiFetch<{ id: number; role: string; name: string; permissions: string[] }>(
      "/touch/pin-login/", { method: "POST", body: JSON.stringify({ pin }) }
    ),
  logout: () => apiFetch<{ message: string }>("/auth/logout/", { method: "POST" }),
  me: () =>
    apiFetch<{ id: number; username: string; full_name: string; role: string; permissions: string[] }>("/auth/me/"),
};

// System users
export const usersApi = {
  list: () => apiFetch<{ results: SystemUser[] }>("/users/"),
  create: (data: Record<string, unknown>) =>
    apiFetch<SystemUser>("/users/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Record<string, unknown>) =>
    apiFetch<SystemUser>(`/users/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: number) =>
    apiFetch<void>(`/users/${id}/`, { method: "DELETE" }),
  setPermissions: (id: number, permissions: string[]) =>
    apiFetch<{ permissions: string[] }>(`/users/${id}/set-permissions/`, {
      method: "POST", body: JSON.stringify({ permissions }),
    }),
  toggleActive: (id: number) =>
    apiFetch<{ id: number; is_active: boolean }>(`/users/${id}/toggle-active/`, { method: "POST" }),
  permissionChoices: () =>
    apiFetch<Array<{ codename: string; label: string }>>("/permissions/"),
};

// Accounts (Workers)
export const accountsApi = {
  // Workers
  workersList: () => apiFetch<{ results: Worker[] }>("/workers/"),
  lookup: (code: string) => apiFetch<Worker>(`/workers/lookup/?code=${code}`),

  // Advances
  advanceList: () => apiFetch<{ results: any[] }>("/advances/"),
  advancesByWorker: (workerId: number, month: number, year: number) =>
    apiFetch<{ results: any[] }>(`/advances/?worker=${workerId}&month=${month}&year=${year}`),
  advanceCreate: (data: { worker: number; amount: number; description?: string; manager?: number }) =>
    apiFetch<any>("/advances/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Payroll
  payrollList: (month: number, year: number) =>
    apiFetch<any[]>(`/payroll/?month=${month}&year=${year}`),
  paySalary: (data: { worker_id: number; month: number; year: number }) =>
    apiFetch<any>("/pay-salary/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  exportPayrollUrl: (month: number, year: number) =>
    `${API_BASE}/export-payroll/?month=${month}&year=${year}`,
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
  delete: (id: number) => apiFetch<{ message: string }>(`/workers/${id}/`, { method: "DELETE" }),
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
  fabricList: () => apiFetch<{ results: any[] }>("/inventory/fabric/"),
  fabricCreate: (data: FormData) => apiFetch<any>("/inventory/fabric/", { method: "POST", body: data }),
  fabricHistory: (batch: string) => apiFetch<any>(`/inventory/fabric-history/?batch=${batch}`),
  supplierAnalytics: () => apiFetch<any>("/inventory/supplier-analytics/"),
  bichuvList: () => apiFetch<{ results: any[] }>("/inventory/bichuv/"),
  upakovkaList: () => apiFetch<{ results: any[] }>("/inventory/upakovka/"),
  chainAnalysis: (batchValue: string) => apiFetch<any>(`/inventory/chain-analysis/?batch_number=${batchValue}`),
  brakCreate: (data: {
    fabric: number;
    kg: number;
    brak_type: string;
    note?: string;
  }) => apiFetch<any>("/inventory/brak/", { method: "POST", body: JSON.stringify(data) }),
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

  // Bichuv Kirim
  bichuvKirimList: () => apiFetch<{ results: any[] }>("/inventory/bichuv-kirim/"),
  bichuvKirimBatchCreate: (items: {
    fabric: number;
    product_model: number;
    weight_kg: number;
    roll_count: number;
  }[]) => apiFetch<any>("/inventory/bichuv-kirim/batch-create/", {
    method: "POST",
    body: JSON.stringify({ items }),
  }),
  bichuvKirimAvailableForChiqim: () =>
    apiFetch<any[]>("/inventory/bichuv-kirim/available-for-chiqim/"),

  // Bichuv Chiqim
  bichuvChiqimList: () => apiFetch<{ results: any[] }>("/inventory/bichuv-chiqim/"),
  bichuvChiqimCreate: (data: {
    fabric: number;
    product_model: number;
    ish_soni: number;
    beka_kg: number;
    kesim_number?: number;
  }) => apiFetch<any>("/inventory/bichuv-chiqim/", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  bichuvChiqimNextKesim: (fabricId: number, modelId: number) =>
    apiFetch<{ next_kesim: number }>(`/inventory/bichuv-chiqim/next-kesim/?fabric=${fabricId}&product_model=${modelId}`),

  // Fabric Models
  fabricModels: (fabricId: number) =>
    apiFetch<any[]>(`/inventory/fabric-models/?fabric=${fabricId}`),
};

// Reports
export const reportsApi = {
  stats: (params?: { date_from?: string; date_to?: string }) => {
    const qs = params ? `?${new URLSearchParams(params as Record<string, string>)}` : "";
    return apiFetch<Array<{ date: string; volume: number; defect_pct: number }>>(`/reports/stats/${qs}`);
  },
  excelUrl: () => `${API_BASE}/reports/excel/`,
  pdfSlipUrl: (workerId: number) => `${API_BASE}/reports/pdf-slip/?worker_id=${workerId}`,
};

