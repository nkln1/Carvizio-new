const API_BASE_URL =
  "https://1becfc92-d03b-40b1-a1a4-419e8fb5f4bc-00-2tt25zbu0b2gm.picard.replit.dev";

const apiRequest = async (method: string, endpoint: string, body?: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error("API request failed:", error);
    throw error;
  }
};

export default apiRequest;
