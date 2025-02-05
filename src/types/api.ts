// types/api.ts
export interface AnthropicResponse {
    content: Array<{
      text: string;
    }>;
  }
  
  export interface SearchCriteria {
    token: string;
    action: string;
    type: string;
    destination: string;
    source: string;
    amount: number | null;
    date: string;
    dateRange: {
      start: string;
      end: string;
    };
  }