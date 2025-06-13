/**
 * API function for editing user LLM settings.
 * Handles updating LLM model selection, temperature, and max tokens.
 */

/**
 * Edit the user's LLM settings via API call
 * @param {Object} [updates={}] - Object containing fields to update
 * @param {number} [updates.llm_model_id] - The LLM model ID to set
 * @param {number} [updates.llm_temperature] - The temperature setting (0.0 to 1.0)
 * @param {number} [updates.llm_max_tokens] - The max tokens setting
 * @returns {Promise<string>} Promise that resolves to the user's selected LLM ID
 */
export function apiUserLLM(updates = {}) {
    // Accept updates object with optional parameters
    const { llm_model_id: llmModelId, llm_temperature: llmTemperature, llm_max_tokens: llmMaxTokens } = updates;
    
    // Get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // Build request body with only provided fields
    const requestBody = {};
    if (llmModelId) requestBody.llm_model_id = llmModelId;
    if (llmTemperature !== undefined) requestBody.llm_temperature = llmTemperature;
    if (llmMaxTokens) requestBody.llm_max_tokens = llmMaxTokens;

    // Send the request to the server
    return fetch('/api_user_llm', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify(requestBody)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            console.log('Edit operation returned success');
            return data.llm_model_id;
        } else {
            console.log('No data.status received');
            throw new Error('Failed to edit the user LLM settings');
        }
    })
    .catch(error => {
        console.error('Error editing user LLM settings:', error);
        throw error;
    });
}