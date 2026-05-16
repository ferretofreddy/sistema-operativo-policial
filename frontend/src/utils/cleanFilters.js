// frontend/src/utils/cleanFilters.js
export const cleanFilters = (filters = {}) => {
    return Object.fromEntries(
        Object.entries(filters).filter(
            ([_, value]) =>
                value !== "" &&
                value !== null &&
                value !== undefined,
        ),
    );
};