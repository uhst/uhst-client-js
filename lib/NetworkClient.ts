import { NetworkError, NetworkUnreachable } from './UhstErrors';

const REQUEST_OPTIONS = {
  method: 'POST'
};

export class NetworkClient {
  async post(url: string, queryParams?: string[]): Promise<any> {
    try {
      if (queryParams && queryParams.length > 0) {
        url = `${url}?${queryParams.join('&')}`;
      }
      const response = await fetch(url, REQUEST_OPTIONS);
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
}
