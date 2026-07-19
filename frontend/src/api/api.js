const BASE_URL = 'http://localhost:8000';

/**
 * Sends a natural language question and historical chat messages to the backend.
 * @param {string} question 
 * @param {Array} history 
 */
export async function sendMessageToAgent(question, history = []) {
  try {
    const response = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question, history }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || 'Failed to communicate with AI Assistant');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

/**
 * Fetches high-level executive KPIs from the database.
 */
export async function getKPIs() {
  try {
    const response = await fetch(`${BASE_URL}/api/kpi`);
    if (!response.ok) {
      throw new Error('Failed to retrieve dashboard metrics');
    }
    return await response.json();
  } catch (error) {
    console.error('API KPI Error:', error);
    throw error;
  }
}

/**
 * Fetches data for the static dashboard charts.
 */
export async function getDashboardCharts() {
  try {
    const response = await fetch(`${BASE_URL}/api/dashboard-charts`);
    if (!response.ok) {
      throw new Error('Failed to retrieve dashboard charts');
    }
    return await response.json();
  } catch (error) {
    console.error('API Charts Error:', error);
    throw error;
  }
}

