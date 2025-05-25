import { apiUserLLM } from './api_user_llm.js';
import { showToast } from './util_toast.js';

/**
 * Initialize sidebar event listeners for LLM parameters
 */
export function initSidebar() {
    // Initialize model selector
    const modelSelect = document.querySelector('#sidebar-model-select');
    if (modelSelect) {
        modelSelect.addEventListener('change', async function(event) {
            const modelId = parseInt(event.target.value);
            
            try {
                // Call API to update user's LLM model
                const result = await apiUserLLM({ llm_model_id: modelId });
                
                // Update cost display if successful
                if (result) {
                    updateCostDisplay(modelId);
                    showToast('LLM model updated successfully', 'success');
                }
            } catch (error) {
                console.error('Error updating LLM model:', error);
                
                // Revert to previous selection on error
                const previousValue = this.dataset.previousValue || '';
                this.value = previousValue;
                
                // Show error toast to user
                showToast('Failed to update LLM model. Please try again.', 'error');
            }
            
            // Store the current value for potential future reversion
            this.dataset.previousValue = this.value;
        });
        
        // Store initial value for potential reversion
        modelSelect.dataset.previousValue = modelSelect.value;
    }

    // Initialize temperature slider
    const temperatureRange = document.querySelector('#sidebar-temperature-range');
    if (temperatureRange) {
        temperatureRange.addEventListener('input', debounce(async function(event) {
            const temperature = parseFloat(event.target.value);
            const previousValue = this.dataset.previousValue || this.min;
            
            try {
                // Call API to update user's LLM temperature
                await apiUserLLM({ llm_temperature: temperature });
                
                // Update stored value on success
                this.dataset.previousValue = this.value;
            } catch (error) {
                console.error('Error updating LLM temperature:', error);
                
                // Revert the range to previous value on error
                this.value = previousValue;
                
                // Show error toast to user
                showToast('Failed to update temperature. Please try again.', 'error');
            }
        }, 500));
        
        // Store initial value for potential reversion
        temperatureRange.dataset.previousValue = temperatureRange.value;
    }

    // Initialize max tokens slider
    const maxTokensRange = document.querySelector('#sidebar-max-tokens-range');
    if (maxTokensRange) {
        maxTokensRange.addEventListener('input', debounce(async function(event) {
            const maxTokens = parseInt(event.target.value);
            const previousValue = this.dataset.previousValue || this.min;
            
            try {
                // Call API to update user's LLM max tokens
                await apiUserLLM({ llm_max_tokens: maxTokens });
                
                // Update stored value on success
                this.dataset.previousValue = this.value;
            } catch (error) {
                console.error('Error updating LLM max tokens:', error);
                
                // Revert the range to previous value on error
                this.value = previousValue;
                
                // Show error toast to user
                showToast('Failed to update max tokens. Please try again.', 'error');
            }
        }, 500));
        
        // Store initial value for potential reversion
        maxTokensRange.dataset.previousValue = maxTokensRange.value;
    }
}

/**
 * Update the cost display when model changes
 * @param {number} modelId - The ID of the selected model
 */
function updateCostDisplay(modelId) {
    const costDisplay = document.querySelector('#sidebar-cost-display');
    if (!costDisplay) return;

    // Get the model cost from the select option's data attribute
    const modelSelect = document.querySelector('#sidebar-model-select');
    const selectedOption = modelSelect.querySelector(`option[value="${modelId}"]`);
    
    if (selectedOption && selectedOption.dataset.cost) {
        const cost = parseFloat(selectedOption.dataset.cost);
        costDisplay.textContent = `$${cost.toFixed(2)}`;
    }
}

/**
 * Debounce function to limit the rate of API calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Auto-initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', initSidebar);