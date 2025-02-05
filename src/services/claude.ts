export const analyzeSearchQuery = async (query: string) => {
    try {
      const response = await fetch('/api/analyze-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `Parse this transaction search query and return a JSON object. Only include non-empty fields:
          {
            "token": "", // token name/symbol
            "action": "", // send/receive/swap/mint
            "type": "", // SWAP/TOKEN_MINT/etc
            "amount": null, // number if specified
            "date": "", // ISO date if specified
            "dateRange": {"start": "", "end": ""} // ISO dates for ranges
          }
          Query: "${query}"`
        })
      });
  
      if (!response.ok) {
        throw new Error('Failed to analyze query');
      }
  
      const data = await response.json();
      try {
        // Handle the response format from Claude-3
        const content = data.content[0].text;
        const parsed = JSON.parse(content);
        return parsed;
      } catch {
        return null;
      }
    } catch (error) {
      console.error('Error in analyzeSearchQuery:', error);
      return null;
    }
  };