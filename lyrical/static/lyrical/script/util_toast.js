

let toastCounter = 0;
let toastContainer = null;

// Initialize the toast system
function initToastSystem() {
    // Create a toast container if it doesn't exist
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast toast-top toast-end z-50 pointer-events-none';
        document.body.appendChild(toastContainer);
    }
}

// Create and show an error toast
function showErrorToast(message) {
    initToastSystem();
    
    toastCounter++;
    const toastId = `toast-${toastCounter}`;
    
    // Create the toast element
    const toastElement = document.createElement('div');
    toastElement.id = toastId;
    toastElement.className = 'alert alert-error w-[400px] relative shadow-lg pointer-events-auto mb-2 opacity-0 transform translate-x-full transition-all duration-300 ease-in-out';
    
    toastElement.innerHTML = `
        <!-- Close button -->
        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 z-10" onclick="closeToast('${toastId}')">
            ✕
        </button>
        
        <!-- Header with icon and title -->
        <div class="flex items-center absolute left-4 top-2">
            <h3 class="font-bold text-lg">Error</h3>
        </div>
        
        <!-- Error content -->
        <div class="flex flex-col flex-1 pt-8">
            <div class="text-sm whitespace-wrap break-words">
                ${escapeHtml(message)}
            </div>
        </div>
    `;
    
    // Add to container
    toastContainer.appendChild(toastElement);
    
    // Trigger animation to slide in
    setTimeout(() => {
        toastElement.classList.remove('opacity-0', 'translate-x-full');
        toastElement.classList.add('opacity-100', 'translate-x-0');
    }, 50);
    
    return toastId;
}

// Close a specific toast
function closeToast(toastId) {
    const toastElement = document.getElementById(toastId);
    if (!toastElement) return;
    
    // Get the height of the toast being removed (including margin)
    const toastHeight = toastElement.offsetHeight + parseInt(getComputedStyle(toastElement).marginBottom);
    
    // Get all toasts and find the index of the one being removed
    const allToasts = Array.from(toastContainer.querySelectorAll('.alert'));
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
        animateToastsUp(toastHeight, removedIndex);
    }, 300);
}

// Animate remaining toasts to fill gaps
function animateToastsUp(removedHeight, removedIndex) {
    const toasts = Array.from(toastContainer.querySelectorAll('.alert'));
    
    // Only animate toasts that were originally below the removed toast
    const toastsToAnimate = toasts.slice(removedIndex); // All toasts from the removed index onward
    
    // First, temporarily move only the affected toasts down by the height of the removed toast
    toastsToAnimate.forEach((toast) => {
        toast.style.transition = 'none'; // Disable transition for immediate positioning
        toast.style.transform = `translateY(${removedHeight}px)`;
    });
    
    // Force a reflow to ensure the immediate positioning takes effect
    toastContainer.offsetHeight;
    
    // Then animate them back to their natural positions
    setTimeout(() => {
        toastsToAnimate.forEach((toast) => {
            toast.style.transition = 'transform 0.2s ease-in-out';
            toast.style.transform = 'translateY(0)';
        });
    }, 10);
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions globally available
window.showErrorToast = showErrorToast;
window.closeToast = closeToast;

/*
// ===============================
// TEST CODE - DELETE AFTER TESTING
// ===============================
let testCounter = 0;

function addTestEventListener() {
    document.addEventListener('click', function(event) {
        if (event.shiftKey) {
            testCounter++;
            const messages = [
                'This is a test error message.',
                'Another error occurred while processing your request.',
                'Network connection failed. Please check your internet connection.',
                `Test error #${testCounter} - This is a longer error message to test how the toast handles wrapping and expanding width.`,
                'Short error.',
                'A very long error message that should demonstrate the toast expanding to accommodate more text without wrapping unless absolutely necessary. This message is intentionally verbose to test the layout.'
            ];
            
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            showErrorToast(randomMessage);
            
            console.log('Test toast created:', randomMessage);
        }
    });
}

// Initialize test code when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addTestEventListener);
} else {
    addTestEventListener();
}
// ===============================
// END TEST CODE
// ===============================
*/