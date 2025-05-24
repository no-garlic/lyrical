

export class ToastSystem {
    constructor() {
        this.toastCounter = 0;
        this.toastContainer = null;
    }

    init() {
        this.initToastContainer();
    }

    initToastContainer() {
        // Create a toast container if it doesn't exist
        if (!this.toastContainer) {
            this.toastContainer = document.createElement('div');
            this.toastContainer.id = 'toast-container';
            this.toastContainer.className = 'toast toast-top toast-end z-50 pointer-events-none';
            document.body.appendChild(this.toastContainer);
        }
    }

    showError(message) {
        this.initToastContainer();
        
        this.toastCounter++;
        const toastId = `toast-${this.toastCounter}`;
        
        // Create the toast element
        const toastElement = document.createElement('div');
        toastElement.id = toastId;
        toastElement.className = 'alert alert-error w-[400px] relative shadow-lg pointer-events-auto mb-2 opacity-0 transform translate-x-full transition-all duration-300 ease-in-out';
        
        toastElement.innerHTML = `
            <!-- Close button -->
            <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 z-10">
                ✕
            </button>
            
            <!-- Header with icon and title -->
            <div class="flex items-center absolute left-4 top-2">
                <h3 class="font-bold text-lg">Error</h3>
            </div>
            
            <!-- Error content -->
            <div class="flex flex-col flex-1 pt-8">
                <div class="text-sm whitespace-wrap break-words">
                    ${this.escapeHtml(message)}
                </div>
            </div>
        `;
        
        // Add to container
        this.toastContainer.appendChild(toastElement);
        
        // Bind the close button click event
        const closeButton = toastElement.querySelector('.btn-circle');
        closeButton.addEventListener('click', () => this.closeToast(toastId));
        
        // Trigger animation to slide in
        setTimeout(() => {
            toastElement.classList.remove('opacity-0', 'translate-x-full');
            toastElement.classList.add('opacity-100', 'translate-x-0');
        }, 50);
        
        return toastId;
    }

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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
