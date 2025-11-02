// A simple utility to generate a consistent SVG logo based on a company name.

const COLORS = ['#0ea5e9', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

// Simple hash function to get a consistent color index
const simpleHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
};

export const generateCompanyLogo = (companyName: string) => {
    const name = companyName.trim() || 'C';
    const initials = name.split(' ').map(word => word[0]).slice(0, 2).join('').toUpperCase();
    
    const hash = simpleHash(name);
    const color = COLORS[hash % COLORS.length];
    const rotation = hash % 30 - 15; // Rotate between -15 and 15 degrees

    const svg = `
        <svg width="100%" height="100%" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="8" fill="${color}"></rect>
            <text
                x="50%"
                y="50%"
                dominant-baseline="central"
                text-anchor="middle"
                font-family="Arial, sans-serif"
                font-size="18"
                font-weight="bold"
                fill="white"
                transform="rotate(${rotation} 20 20)"
            >
                ${initials}
            </text>
        </svg>
    `;

    return `data:image/svg+xml;base64,${btoa(svg)}`;
};