/**
 * Sidebar utility functions for managing LLM parameters.
 * Handles model selection, temperature adjustment, and max tokens configuration.
 */

import { apiUserLLM } from './api_user_llm.js';
import { ToastSystem } from './util_toast.js';

/**
 * Declare the toast system at the module level
 */
import { toastSystem } from './util_toast.js';

/**
 * Auto-initialize when the DOM is loaded
 */
document.addEventListener('DOMContentLoaded', initSidebar);

/**
 * Initialize sidebar event listeners for LLM parameters.
 * This function sets up all the interactive controls in the sidebar.
 */
export function initSidebar() {
    // Initialize all LLM parameter controls
    initModelSelector();
    initTemperatureSlider();
    initMaxTokensSlider();
}

/**
 * Initialize the LLM model selector dropdown
 */
function initModelSelector() {
    const modelSelect = document.querySelector('#sidebar-model-select');
    if (!modelSelect) return;

    // Bind change event to model selector
    modelSelect.addEventListener('change', handleModelChange);
    
    // Store initial value for potential reversion
    modelSelect.dataset.previousValue = modelSelect.value;
}

/**
 * Initialize the temperature range slider
 */
function initTemperatureSlider() {
    const temperatureRange = document.querySelector('#sidebar-temperature-range');
    if (!temperatureRange) return;

    // Bind input event with debouncing to temperature slider
    temperatureRange.addEventListener('input', debounce(handleTemperatureChange, 500));
    
    // Store initial value for potential reversion
    temperatureRange.dataset.previousValue = temperatureRange.value;
}

/**
 * Initialize the max tokens range slider
 */
function initMaxTokensSlider() {
    const maxTokensRange = document.querySelector('#sidebar-max-tokens-range');
    if (!maxTokensRange) return;

    // Bind input event with debouncing to max tokens slider
    maxTokensRange.addEventListener('input', debounce(handleMaxTokensChange, 500));
    
    // Store initial value for potential reversion
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
        // Call API to update user's LLM model
        const result = await apiUserLLM({ llm_model_id: modelId });
        
        // Update cost display if successful
        if (result) {
            updateCostDisplay(modelId);
            updateMaxTokensRange(modelId);
        }
        
        // Store the current value for potential future reversion
        element.dataset.previousValue = element.value;
    } catch (error) {
        console.error('Error updating LLM model:', error);
        
        // Revert to previous selection on error
        const previousValue = element.dataset.previousValue || '';
        element.value = previousValue;
        
        // Show error toast to user
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
        // Call API to update user's LLM temperature
        await apiUserLLM({ llm_temperature: temperature });
        
        // Update stored value on success
        element.dataset.previousValue = element.value;
    } catch (error) {
        console.error('Error updating LLM temperature:', error);
        
        // Revert the range to previous value on error
        element.value = previousValue;
        
        // Show error toast to user
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
        // Call API to update user's LLM max tokens
        await apiUserLLM({ llm_max_tokens: maxTokens });
        
        // Update stored value on success
        element.dataset.previousValue = element.value;
    } catch (error) {
        console.error('Error updating LLM max tokens:', error);
        
        // Revert the range to previous value on error
        element.value = previousValue;
        
        // Show error toast to user
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

    // Get the model cost from the select option's data attribute
    const modelSelect = document.querySelector('#sidebar-model-select');
    const selectedOption = modelSelect.querySelector(`option[value="${modelId}"]`);
    
    if (selectedOption && selectedOption.dataset.cost) {
        const cost = parseFloat(selectedOption.dataset.cost);
        costDisplay.textContent = `$${cost.toFixed(2)}`;
    }
}

/**
 * Update the max tokens range based on selected model
 * @param {number} modelId - The ID of the selected model
 */
function updateMaxTokensRange(modelId) {
    // Get the model cost from the select option's data attribute
    const modelSelect = document.querySelector('#sidebar-model-select');
    const selectedOption = modelSelect.querySelector(`option[value="${modelId}"]`);
    
    if (selectedOption && selectedOption.dataset.maxTokens) {
        const maxTokens = parseInt(selectedOption.dataset.maxTokens);
        
        console.log(`setting max_tokens to ${maxTokens}k`);

        const range = document.getElementById('sidebar-max-tokens-range');

        range.min = 1;
        range.max = maxTokens;
        range.step = 0.1;

        const spans = document.getElementById('sidebar-max-tokens-spans');
        spans.children[0].innerText = `1k`;
        spans.children[1].innerText = `${(maxTokens * 0.25).toFixed(0)}k`;
        spans.children[2].innerText = `${(maxTokens * 0.5).toFixed(0)}k`;
        spans.children[3].innerText = `${(maxTokens * 0.75).toFixed(0)}k`;
        spans.children[4].innerText = `${(maxTokens).toFixed(0)}k`;
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