import axios, { AxiosInstance, AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios';

// const API_URL_CALLBACK = 'http://192.168.100.44:3000/api/v1'
const API_URL_CALLBACK = `${process.env.NEXT_PUBLIC_PYTHON_API_BASE_URL}`

export class ApiProvider {
  private static instance: ApiProvider;
  private api: AxiosInstance;

  private constructor() {
    const baseURL = API_URL_CALLBACK //API_URL 
    this.api = axios.create({
      baseURL,
      withCredentials: false,  // Evitar problemas CORS con credentials
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  public static getInstance(): ApiProvider {
    if (!ApiProvider.instance) {
      ApiProvider.instance = new ApiProvider();
    }
    return ApiProvider.instance;
  }

  private setupInterceptors(): void {
    this.api.interceptors.request.use(
      async (config) => {
        console.log(
          '[API REQUEST]',
          config.method?.toUpperCase(),
          config.url,
          config.data || '',
          API_URL_CALLBACK
        );

        // Verificar si los datos son FormData y ajustar el Content-Type
        if (config.data instanceof FormData) {
          config.headers['Content-Type'] = 'multipart/form-data';
        }
        const accessToken = localStorage.getItem("access_token")
        // Se agrega el token al header
        const token = accessToken;
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.api.interceptors.response.use(
      (response) => {
        console.log('[API RESPONSE]', response.status, response.config.url, response.data);

        return response;
      },
      (error: AxiosError) => this.handleError(error)
    );
  }

  private handleError(error: AxiosError): Promise<never> {
    if (error.response) {
      const status = error.response.status;
      const data: any = error.response.data;

      let message = "Error inesperado";

      switch (status) {
        case 400:
          message = data?.message || "Solicitud inválida";
          break;
        case 401:
          message = "Credenciales incorrectas";
          break;
        case 403:
          message = "No tienes permisos para realizar esta acción";
          break;
        case 404:
          message = "Recurso no encontrado";
          break;
        case 500:
          message = "Error interno del servidor";
          break;
      }

      return Promise.reject({ status, message, data });
    } else if (error.request) {
      return Promise.reject({ status: 0, message: "No se pudo conectar con el servidor" });
    } else {
      return Promise.reject({ status: 0, message: error.message });
    }
  }

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.api.get<T>(url, config);
  }

  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.api.post<T>(url, data, config);
  }

  public async postFormData<T>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.api.post<T>(url, formData, {
      ...config,
      headers: {
        ...config?.headers,
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.api.put<T>(url, data, config);
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.api.delete<T>(url, config);
  }

  public async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.api.patch<T>(url, data, config);
  }
}