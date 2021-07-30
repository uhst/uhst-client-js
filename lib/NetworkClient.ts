import { NetworkError, NetworkUnreachable } from './UhstErrors';

const REQUEST_OPTIONS = {
  method: 'POST',
};

export class NetworkClient {
  async post(
    url: string,
    queryParams?: string[],
    timeout?: number
  ): Promise<any> {
    try {
      if (queryParams && queryParams.length > 0) {
        url = `${url}?${queryParams.join('&')}`;
      }
      const response = timeout
        ? await this.fetchWithTimeout(url, { ...REQUEST_OPTIONS, timeout })
        : await fetch(url, REQUEST_OPTIONS);
      if (response.status == 200) {
        return response.json();
      } else {
        throw new NetworkError(response.status, `${response.statusText}`);
      }
    } catch (error) {
      console.log(error);
      throw new NetworkUnreachable(error);
    }
  }

  async get(
    url: string,
    queryParams?: string[],
    timeout?: number
  ): Promise<any> {
    try {
      if (queryParams && queryParams.length > 0) {
        url = `${url}?${queryParams.join('&')}`;
      }
      const response = timeout
        ? await this.fetchWithTimeout(url, { timeout })
        : await fetch(url);
      if (response.status == 200) {
        return response.json();
      } else {
        throw new NetworkError(response.status, `${response.statusText}`);
      }
    } catch (error) {
      console.log(error);
      throw new NetworkUnreachable(error);
    }
  }

  async fetchWithTimeout(resource, options): Promise<any> {
    const { timeout = 8000 } = options;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(resource, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);

    return response;
  }
}
