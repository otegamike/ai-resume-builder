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

export function getHeightById(id: string, defaultValue: number = 0): number {
    if (typeof document === 'undefined') return defaultValue;
    const element = document.getElementById(id);
    return element ? element.getBoundingClientRect().height : defaultValue;
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

export function editorSectionHeightnNumber(): number {
    const height = calculateEditorHeight() - gettitleBarHeight();
    return height-20
}

export function editorSectionHeight() {
    const height = editorSectionHeightnNumber();
    return height? `${height}px` : "80vh";
}
