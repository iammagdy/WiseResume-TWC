import extracted from './extracted_prompts.json' assert { type: 'json' };

export function getPrompt(featureName, context = {}) {
    const entry = extracted[featureName];
    if (!entry) return null;
    
    let system = entry.system;
    let user = entry.user;
    
    // Simple template replacement
    for (const [key, value] of Object.entries(context)) {
        const regex = new RegExp('\${\\s*' + key + '\\s*}', 'g');
        if (system) system = system.replace(regex, value);
        if (user) user = user.replace(regex, value);
    }
    
    return { system, user };
}
