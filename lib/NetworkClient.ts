import { NetworkError, NetworkUnreachable } from './UhstErrors';

const REQUEST_OPTIONS = {
  method: 'POST',
};

const getRequestOptions = (body: any): any => {
  if (body) {
    return {
      ...REQUEST_OPTIONS,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    };
  } else {
    return REQUEST_OPTIONS;
  }
};

export class NetworkClient {
  async post(
    url: string,
    queryParams?: string[],
    body?: any,
    timeout?: number
  ): Promise<any> {
    if (queryParams && queryParams.length > 0) {
      url = `${url}?${queryParams.join('&')}`;
    }
    let response: Response;
    try {
      response = timeout
        ? await this.fetchWithTimeout(url, {
            ...getRequestOptions(body),
            timeout,
          })
        : await fetch(url, getRequestOptions(body));
    } catch (error) {
      throw new NetworkUnreachable(error);
    }
    if (response.status == 200) {
      return response.json();
    } else {
      throw new NetworkError(response.status, `${response.statusText}`);
    }
  }

  async get(
    url: string,
    queryParams?: string[],
    timeout?: number
  ): Promise<any> {
    if (queryParams && queryParams.length > 0) {
      url = `${url}?${queryParams.join('&')}`;
    }
    let response: Response;
    try {
      response = timeout
        ? await this.fetchWithTimeout(url, { timeout })
        : await fetch(url);
    } catch (error) {
      throw new NetworkUnreachable(error);
    }
    if (response.status == 200) {
      return response.json();
    } else {
      throw new NetworkError(response.status, `${response.statusText}`);
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
