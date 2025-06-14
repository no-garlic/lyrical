/**
 * ToastSystem singleton class for managing toast notifications
 */
class ToastSystem {
    /**
     * Creates an instance of ToastSystem (singleton pattern)
     */
    constructor() {
        if (ToastSystem.instance) {
            return ToastSystem.instance;
        }
        
        this.toastCounter = 0;
        this.toastContainer = null;
        this.initialized = false;
        
        ToastSystem.instance = this;
        return this;
    }

    /**
     * Initializes the toast system
     */
    init() {
        if (!this.initialized) {
            this.initToastContainer();
            this.initialized = true;
        }
    }

    /**
     * Initializes the toast container element
     */
    initToastContainer() {
        // Create a toast container if it doesn't exist
        if (!this.toastContainer) {
            this.toastContainer = document.createElement('div');
            this.toastContainer.id = 'toast-container';
            this.toastContainer.className = 'toast toast-top toast-end z-50 pointer-events-none';
            document.body.appendChild(this.toastContainer);
        }
    }

    /**
     * Show an error toast
     * @param {string} message - The error message to display
     * @returns {string|null} The toast ID or null if failed
     */
    showError(message) {
        return this._showToast('error', 'Error', message);
    }

    /**
     * Show an info toast
     * @param {string} message - The info message to display
     * @returns {string|null} The toast ID or null if failed
     */
    showInfo(message) {
        return this._showToast('info', 'Info', message);
    }

    /**
     * Show a warning toast
     * @param {string} message - The warning message to display
     * @returns {string|null} The toast ID or null if failed
     */
    showWarning(message) {
        return this._showToast('warning', 'Warning', message);
    }

    /**
     * Show a success toast
     * @param {string} message - The success message to display
     * @returns {string|null} The toast ID or null if failed
     */
    showSuccess(message) {
        return this._showToast('success', 'Success', message);
    }

    /**
     * Internal method to show a toast of any type
     * @param {string} type - The toast type (error, info, warning, success)
     * @param {string} title - The toast title
     * @param {string} message - The toast message
     * @returns {string|null} The toast ID or null if failed
     * @private
     */
    _showToast(type, title, message) {
        this.initToastContainer();
        
        this.toastCounter++;
        const toastId = `toast-${this.toastCounter}`;
        
        // Get the toast template
        const template = document.getElementById('toast-template');
        if (!template) {
            console.error('Toast template not found');
            return null;
        }
        
        // Clone the template content
        const toastElement = template.content.firstElementChild.cloneNode(true);
        toastElement.id = toastId;
        
        // Remove default alert-error class and add type-specific alert class
        toastElement.classList.remove('alert-error');
        toastElement.classList.add(`alert-${type}`);
        
        // Set title and message using textContent for XSS safety
        const titleElement = toastElement.querySelector('.toast-title');
        const messageElement = toastElement.querySelector('.toast-message');
        if (titleElement) {
            titleElement.textContent = title;
        }
        if (messageElement) {
            messageElement.textContent = message;
        }
        
        // Add to container
        this.toastContainer.appendChild(toastElement);
        
        // Bind the close button click event
        toastElement.addEventListener('click', () => this.closeToast(toastId));

        // Trigger animation to slide in
        setTimeout(() => {
            toastElement.classList.remove('opacity-0', 'translate-x-full');
            toastElement.classList.add('opacity-100', 'translate-x-0');
        }, 50);
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            this.closeToast(toastId);
        }, 10000);
        
        return toastId;
    }

    /**
     * Closes a toast by its ID
     * @param {string} toastId - The ID of the toast to close
     */
    closeToast(toastId) {
        const toastElement = document.getElementById(toastId);
        if (!toastElement) return;
        
        // Get the height of the toast being removed (including margin)
        const toastHeight = toastElement.offsetHeight + parseInt(getComputedStyle(toastElement).marginBottom);
        
        // Get all toasts and find the index of the one being removed
        const allToasts = Array.from(this.toastContainer.querySelectorAll('.alert'));
        const removedIndex = allToasts.indexOf(toastElement);
        
        // Fade out animation
        toastElement.classList.remove('opacity-100');
        toastElement.classList.add('opacity-0', 'transform', 'scale-95');
        
        // Remove after animation completes
        setTimeout(() => {
            if (toastElement.parentNode) {
                toastElement.parentNode.removeChild(toastElement);
            }
            // Animate remaining toasts up (only those that were below the removed toast)
            this.animateToastsUp(toastHeight, removedIndex);
        }, 300);
    }

    /**
     * Animates remaining toasts upward after one is removed
     * @param {number} removedHeight - The height of the removed toast
     * @param {number} removedIndex - The index of the removed toast
     */
    animateToastsUp(removedHeight, removedIndex) {
        const toasts = Array.from(this.toastContainer.querySelectorAll('.alert'));
        
        // Only animate toasts that were originally below the removed toast
        const toastsToAnimate = toasts.slice(removedIndex); // All toasts from the removed index onward
        
        // First, temporarily move only the affected toasts down by the height of the removed toast
        toastsToAnimate.forEach((toast) => {
            toast.style.transition = 'none'; // Disable transition for immediate positioning
            toast.style.transform = `translateY(${removedHeight}px)`;
        });
        
        // Force a reflow to ensure the immediate positioning takes effect
        this.toastContainer.offsetHeight;
        
        // Then animate them back to their natural positions
        setTimeout(() => {
            toastsToAnimate.forEach((toast) => {
                toast.style.transition = 'transform 0.2s ease-in-out';
                toast.style.transform = 'translateY(0)';
            });
        }, 10);
    }
}

// Create and export the singleton instance
const toastSystem = new ToastSystem();

// Auto-initialize when the module is loaded
toastSystem.init();

// Export the singleton instance
export { toastSystem };

/**
 * Show an error toast (convenience function)
 * @param {string} message - The error message to display
 * @returns {string|null} The toast ID or null if failed
 */
export function showError(message) {
    return toastSystem.showError(message);
}

/**
 * Show an info toast (convenience function)
 * @param {string} message - The info message to display
 * @returns {string|null} The toast ID or null if failed
 */
export function showInfo(message) {
    return toastSystem.showInfo(message);
}

/**
 * Show a warning toast (convenience function)
 * @param {string} message - The warning message to display
 * @returns {string|null} The toast ID or null if failed
 */
export function showWarning(message) {
    return toastSystem.showWarning(message);
}

/**
 * Show a success toast (convenience function)
 * @param {string} message - The success message to display
 * @returns {string|null} The toast ID or null if failed
 */
export function showSuccess(message) {
    return toastSystem.showSuccess(message);
}

/**
 * Close a toast by its ID (convenience function)
 * @param {string} toastId - The ID of the toast to close
 */
export function closeToast(toastId) {
    return toastSystem.closeToast(toastId);
}

// Also export the class for backward compatibility
export { ToastSystem };