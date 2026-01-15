const DataStorage = {
    getFeature: async (featureKey) => {
        const result = await browser.storage.local.get(featureKey);
        return result[featureKey] || {};
    },

    updateSettings: async (featureKey, newValues) => {
        const data = await DataStorage.getFeature(featureKey);
        const updated = {
            ...data,
            ...newValues
        };
        await browser.storage.local.set({ [featureKey]: updated });
        console.log('Updated nicknames');
    }
};
