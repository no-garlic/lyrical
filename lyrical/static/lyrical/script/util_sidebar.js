import { apiUserLLM } from './api_user_llm.js';
import { ToastSystem } from './util_toast.js';


/**
 * Declare the toast system at the module level
 */
let toastSystem;


/**
 * Auto-initialize when the DOM is loaded
 */
document.addEventListener('DOMContentLoaded', initSidebar);


/**
 * Initialize sidebar event listeners for LLM parameters.
 * This function sets up all the interactive controls in the sidebar.
 */
export function initSidebar() {
    // initialize the toast system
    initToastSystem();

    // initialize all LLM parameter controls
    initModelSelector();
    initTemperatureSlider();
    initMaxTokensSlider();
}


/**
 * Initialize the toast system for user notifications
 */
function initToastSystem() {
    toastSystem = new ToastSystem();
    toastSystem.init();
}


/**
 * Initialize the LLM model selector dropdown
 */
function initModelSelector() {
    const modelSelect = document.querySelector('#sidebar-model-select');
    if (!modelSelect) return;

    // bind change event to model selector
    modelSelect.addEventListener('change', handleModelChange);
    
    // store initial value for potential reversion
    modelSelect.dataset.previousValue = modelSelect.value;
}


/**
 * Initialize the temperature range slider
 */
function initTemperatureSlider() {
    const temperatureRange = document.querySelector('#sidebar-temperature-range');
    if (!temperatureRange) return;

    // bind input event with debouncing to temperature slider
    temperatureRange.addEventListener('input', debounce(handleTemperatureChange, 500));
    
    // store initial value for potential reversion
    temperatureRange.dataset.previousValue = temperatureRange.value;
}


/**
 * Initialize the max tokens range slider
 */
function initMaxTokensSlider() {
    const maxTokensRange = document.querySelector('#sidebar-max-tokens-range');
    if (!maxTokensRange) return;

    // bind input event with debouncing to max tokens slider
    maxTokensRange.addEventListener('input', debounce(handleMaxTokensChange, 500));
    
    // store initial value for potential reversion
    maxTokensRange.dataset.previousValue = maxTokensRange.value;
}


/**
 * Handle model selection change
 * @param {Event} event - The change event from the model selector
 */
async function handleModelChange(event) {
    const modelId = parseInt(event.target.value);
    const element = event.target;
    
    try {
        // call API to update user's LLM model
        const result = await apiUserLLM({ llm_model_id: modelId });
        
        // update cost display if successful
        if (result) {
            updateCostDisplay(modelId);
        }
        
        // store the current value for potential future reversion
        element.dataset.previousValue = element.value;
    } catch (error) {
        console.error('Error updating LLM model:', error);
        
        // revert to previous selection on error
        const previousValue = element.dataset.previousValue || '';
        element.value = previousValue;
        
        // show error toast to user
        toastSystem.showError('Failed to update LLM model. Please try again.');
    }
}


/**
 * Handle temperature slider change
 * @param {Event} event - The input event from the temperature slider
 */
async function handleTemperatureChange(event) {
    const element = event.target;
    const temperature = parseFloat(element.value);
    const previousValue = element.dataset.previousValue || element.min;
    
    try {
        // call API to update user's LLM temperature
        await apiUserLLM({ llm_temperature: temperature });
        
        // update stored value on success
        element.dataset.previousValue = element.value;
    } catch (error) {
        console.error('Error updating LLM temperature:', error);
        
        // revert the range to previous value on error
        element.value = previousValue;
        
        // show error toast to user
        toastSystem.showError('Failed to update temperature. Please try again.');
    }
}


/**
 * Handle max tokens slider change
 * @param {Event} event - The input event from the max tokens slider
 */
async function handleMaxTokensChange(event) {
    const element = event.target;
    const maxTokens = parseInt(element.value);
    const previousValue = element.dataset.previousValue || element.min;
    
    try {
        // call API to update user's LLM max tokens
        await apiUserLLM({ llm_max_tokens: maxTokens });
        
        // update stored value on success
        element.dataset.previousValue = element.value;
    } catch (error) {
        console.error('Error updating LLM max tokens:', error);
        
        // revert the range to previous value on error
        element.value = previousValue;
        
        // show error toast to user
        toastSystem.showError('Failed to update max tokens. Please try again.');
    }
}


/**
 * Update the cost display when model changes
 * @param {number} modelId - The ID of the selected model
 */
function updateCostDisplay(modelId) {
    const costDisplay = document.querySelector('#sidebar-cost-display');
    if (!costDisplay) return;

    // get the model cost from the select option's data attribute
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
