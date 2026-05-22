export function formatName(name: string): { firstName: string, otherNames: string } {
        const fullname = name.trim();
        const parts = fullname.split(' ');
        const firstName = parts[0] || fullname;
        const otherNames = parts.slice(1).join(' ');
        return { firstName, otherNames };
}
