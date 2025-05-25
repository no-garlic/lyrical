
/**
 * Edit the users LLM settings via API call.
 * @param {Object} updates - Object containing fields to update (llm_model_id, llm_temperature, llm_max_tokens).
 * @returns {Promise<string>} Promise that resolves to the user's selected LLM id.
 */
export function apiUserLLM(updates = {}) {
    // accept updates object with optional parameters
    const { llm_model_id: llmModelId, llm_temperature: llmTemperature, llm_max_tokens: llmMaxTokens } = updates;
    
    // get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // build request body with only provided fields
    const requestBody = { };
    if (llmModelId) requestBody.llm_model_id = llmModelId;
    if (llmTemperature !== undefined) requestBody.llm_temperature = llmTemperature;
    if (llmMaxTokens) requestBody.llm_max_tokens = llmMaxTokens;

    // send the request to the server
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
            console.log('edit operation returned success');
            return data.llm_model_id;
        } else {
            console.log('no data.status received');
            throw new Error('Failed to edit the user llm settings');
        }
    })
    .catch(error => {
        console.error('Error editing user llm settings:', error);
        throw error;
    });
}