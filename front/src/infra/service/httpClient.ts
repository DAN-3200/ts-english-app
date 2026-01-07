export class HttpClient {
	constructor(private readonly baseUrl: string) {}

	private async request<T>(
		endpoint: string,
		options?: RequestInit
	): Promise<T> {
		try {
			const response = await fetch(`${this.baseUrl}${endpoint}`, {
				headers: { 'Content-Type': 'application/json' },
				...options,
			});

			if (!response.ok) {
				const errorBody = await response.text();
				throw new Error(
					`Erro ${response.status} (${response.statusText}): ${
						errorBody || 'Sem detalhes'
					}`
				);
			}

			if (response.status === 204) return {} as T;

			const data = (await response.json()) as T;
			return data;
		} catch (error) {
			console.error(`Erro em ${options?.method || 'GET'} ${endpoint}:`, error);
			throw error;
		}
	}

	get<T>(endpoint: string): Promise<T> {
		return this.request<T>(endpoint, { method: 'GET' });
	}

	post<T>(endpoint: string, body: unknown): Promise<T> {
		return this.request<T>(endpoint, {
			method: 'POST',
			body: JSON.stringify(body),
		});
	}

	put<T>(endpoint: string, body: unknown): Promise<T> {
		return this.request<T>(endpoint, {
			method: 'PUT',
			body: JSON.stringify(body),
		});
	}

	patch<T>(endpoint: string, body: unknown): Promise<T> {
		return this.request<T>(endpoint, {
			method: 'PATCH',
			body: JSON.stringify(body),
		});
	}

	delete<T>(endpoint: string): Promise<T> {
		return this.request<T>(endpoint, { method: 'DELETE' });
	}
}