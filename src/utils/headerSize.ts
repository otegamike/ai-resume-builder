export function getHeaderHeight() {
    if (typeof document === 'undefined') return 0;
    const header = document.querySelector('header') as HTMLElement;
    return header?.offsetHeight || 0;
}

export function gettitleBarHeight() {
    if (typeof document === 'undefined') return 0;
    const header = document.querySelector('header') as HTMLElement;
    return header?.offsetHeight || 0;
}

export function getViewportHeight() {
    if (typeof window === 'undefined') return 0;
    const viewportHeight = window.innerHeight;
    return viewportHeight;
}

export function calculateEditorHeight() {
    const headerHeight = getHeaderHeight();
    const viewportHeight = getViewportHeight();
    return viewportHeight - headerHeight;
}

export function editorSectionHeight() {
    const height = calculateEditorHeight() - gettitleBarHeight();
    return height? `${height-20}px` : "80vh";
}
