document.addEventListener('DOMContentLoaded', () => {
    const THEME_STORAGE_KEY = 'daisyui_theme';

    // Function to apply theme to the <html> tag
    const applyThemeToDocument = (themeName) => {
        if (themeName) {
            document.documentElement.setAttribute('data-theme', themeName);
        } else {
            // If no themeName is provided, remove the attribute to fallback to daisyUI's default
            document.documentElement.removeAttribute('data-theme');
        }
    };

    // Function to update the UI of theme-controller elements
    const updateThemeControllerUI = (activeTheme) => {
        document.querySelectorAll('.theme-controller').forEach(controller => {
            if (controller.tagName === 'INPUT' && (controller.type === 'radio' || controller.type === 'checkbox')) {
                controller.checked = (controller.value === activeTheme);
            } else if (controller.tagName === 'SELECT') {
                controller.value = activeTheme || ''; // Set to empty if activeTheme is null/undefined
            }
            // Add other controller types if necessary, e.g., for custom dropdowns acting as theme controllers
        });
    };

    // 1. Initial theme setup:
    // The head script has already tried to apply from localStorage.
    // Here, we ensure localStorage is populated if daisyUI set a theme (e.g. prefers-color-scheme)
    // and that the UI controllers are in sync.
    let currentTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (!currentTheme) {
        // If nothing in localStorage, daisyUI might have set a theme based on system preference or its own default.
        // Let's read it from the document and store it.
        const documentTheme = document.documentElement.getAttribute('data-theme');
        if (documentTheme) {
            currentTheme = documentTheme;
            localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
        }
    }
    // At this point, currentTheme is either from localStorage or what daisyUI initially set (and is now stored).
    // Or it's null if no theme is set at all.
    if (currentTheme) {
        updateThemeControllerUI(currentTheme);
    }


    // 2. Listen for changes on theme-controller inputs made by the user
    document.body.addEventListener('change', (event) => {
        const target = event.target;
        if (target.classList.contains('theme-controller') && target.value) {
            const newTheme = target.value;
            // daisyUI's theme-controller component automatically updates document.documentElement's data-theme.
            // We just need to store this choice.
            localStorage.setItem(THEME_STORAGE_KEY, newTheme);
            // The UI element that fired the change is already in the correct state.
            // Other theme controllers (if any) will be updated by the MutationObserver.
        }
    });

    // 3. Observe changes to data-theme on <html> to keep localStorage and UI in sync.
    // This handles:
    //    a) daisyUI setting an initial theme (e.g. from prefers-color-scheme) if localStorage was empty.
    //    b) Programmatic changes to the theme.
    //    c) Ensures all theme controller UI elements are synced if one of them changes the theme.
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                const newThemeValue = document.documentElement.getAttribute('data-theme');
                if (newThemeValue) {
                    if (localStorage.getItem(THEME_STORAGE_KEY) !== newThemeValue) {
                        localStorage.setItem(THEME_STORAGE_KEY, newThemeValue);
                    }
                    updateThemeControllerUI(newThemeValue);
                } else {
                    // data-theme was removed
                    if (localStorage.getItem(THEME_STORAGE_KEY)) {
                        localStorage.removeItem(THEME_STORAGE_KEY);
                    }
                    updateThemeControllerUI(null); // Update UI to reflect no specific theme
                }
                break; // Only need to process this once per mutation batch
            }
        }
    });
    observer.observe(document.documentElement, { attributes: true });
});
