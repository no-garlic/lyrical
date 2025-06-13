/**
 * Utility for handling summarization modal dialog
 */

import { apiCheckSummarisationStatus, apiSummariseChatHistory } from './api_summarise_chat_history.js';
import { toastSystem } from './util_toast.js';

/**
 * Shows the summarization modal and handles user response
 * @param {number|null} songId - The song ID to check summarization for (null for endpoints without conversation history)
 * @param {Function} onProceed - Callback to execute when user chooses to proceed with generation
 * @param {string} conversationType - Type of conversation ('lyrics', 'style', etc.) for user messaging
 * @returns {Promise<void>}
 */
export async function showSummarizationModal(songId, onProceed, conversationType = 'conversation') {
    try {
        // If no songId provided, skip summarization check (for endpoints that don't use conversation history)
        if (!songId) {
            onProceed();
            return;
        }
        
        // Check if summarization is needed
        const statusData = await apiCheckSummarisationStatus(songId);
        
        if (!statusData.any_needs_summarisation) {
            // No summarization needed, proceed directly
            onProceed();
            return;
        }
        
        // Show the modal
        const modal = document.getElementById('modal-summarization');
        if (!modal) {
            console.error('Summarization modal not found');
            onProceed(); // Fallback to proceed anyway
            return;
        }
        
        // Show modal
        modal.classList.add('modal-open');
        
        // Set up button handlers
        const btnYes = document.getElementById('btn-summarize-yes');
        const btnNo = document.getElementById('btn-summarize-no');
        const btnCancel = document.getElementById('btn-summarize-cancel');
        
        // Reset button states before setting up new handlers
        btnYes.disabled = false;
        btnYes.innerHTML = 'Yes';
        
        // Clean up any existing event listeners
        const newBtnYes = btnYes.cloneNode(true);
        const newBtnNo = btnNo.cloneNode(true);
        const newBtnCancel = btnCancel.cloneNode(true);
        btnYes.parentNode.replaceChild(newBtnYes, btnYes);
        btnNo.parentNode.replaceChild(newBtnNo, btnNo);
        btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);
        
        // Handle Yes - Summarize
        newBtnYes.addEventListener('click', async () => {
            try {
                // Show loading state
                newBtnYes.disabled = true;
                newBtnYes.innerHTML = '<span class="loading loading-spinner loading-sm"></span> Summarizing...';
                
                // Determine which conversation types need summarization
                const conversationsToSummarize = [];
                if (statusData.style && statusData.style.needs_summarisation) {
                    conversationsToSummarize.push('style');
                }
                if (statusData.lyrics && statusData.lyrics.needs_summarisation) {
                    conversationsToSummarize.push('lyrics');
                }
                
                // Summarize all conversations that need it
                for (const type of conversationsToSummarize) {
                    await apiSummariseChatHistory(songId, type);
                }
                
                toastSystem.showSuccess(`Successfully summarized ${conversationsToSummarize.join(' and ')} conversation history`);
                
                // Close modal after successful summarization
                closeModal();
                
                // Proceed with generation
                onProceed();
                
            } catch (error) {
                console.error('Error during summarization:', error);
                toastSystem.showError('Failed to summarize conversation history. Please try again.');
                
                // Reset button state on error so user can try again
                newBtnYes.disabled = false;
                newBtnYes.innerHTML = 'Yes';
            }
        });
        
        // Handle No - Continue without summarizing
        newBtnNo.addEventListener('click', () => {
            closeModal();
            onProceed();
        });
        
        // Handle Cancel - Don't proceed
        newBtnCancel.addEventListener('click', () => {
            closeModal();
            // Don't call onProceed - user cancelled
        });
        
        // Close modal on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        function closeModal() {
            modal.classList.remove('modal-open');
        }
        
    } catch (error) {
        console.error('Error checking summarization status:', error);
        // On error, proceed anyway to not block user
        onProceed();
    }
}

/**
 * Convenience function to wrap a generation function with summarization check
 * @param {number|null} songId - The song ID (null for endpoints without conversation history)
 * @param {Function} generationFunction - The function to call for generation
 * @param {string} conversationType - Type of conversation for user messaging
 * @returns {Promise<void>}
 */
export async function checkSummarizationAndGenerate(songId, generationFunction, conversationType = 'conversation') {
    await showSummarizationModal(songId, generationFunction, conversationType);
}