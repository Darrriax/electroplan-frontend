// src/store/modules/editorTools.js - оновлена версія

export const editorTools = {
    namespaced: true,
    state: () => ({
        // Стан відображення меню інструментів
        isMenuOpen: false,

        // Активний режим редактора
        activeMode: 'originalPlan', // можливі значення: 'originalPlan', 'powerSockets', 'light', 'switches'

        // Активний інструмент для кожного режиму
        activeTool: {
            originalPlan: null,
            powerSockets: null,
            light: null,
            switches: null,
        },

        // Налаштування доступних інструментів для кожного режиму
        tools: {
            originalPlan: [
                { id: 'wall', name: 'Стіна', icon: 'fa-solid fa-grip-lines-vertical' },
                { id: 'balcony', name: 'Балкон', icon: 'fa-solid fa-border-all' },
                { id: 'door', name: 'Двері', icon: 'fa-solid fa-door-open' },
                { id: 'window', name: 'Вікна', icon: 'fa-solid fa-table-cells' }
            ],
            powerSockets: [
                { id: 'standard220v', name: 'Розетка стандартна 220V', icon: 'fa-solid fa-plug' },
                { id: 'waterproof220v', name: 'Розетка водонепроникна 220V', icon: 'fa-solid fa-plug-circle-check' },
                { id: '380v', name: 'Розетка 380V', icon: 'fa-solid fa-plug-circle-bolt' },
                { id: 'panel', name: 'Щиток', icon: 'fa-solid fa-box' }
            ],
            light: [
                { id: 'wallLight', name: 'Настінний світильник', icon: 'fa-solid fa-lightbulb' },
                { id: 'ceilingLight', name: 'На стелю світильник', icon: 'fa-solid fa-sun' }
            ],
            switches: [
                { id: 'oneKey', name: 'Одноклавішний вимикач', icon: 'fa-solid fa-toggle-on' },
                { id: 'twoKey', name: 'Двоклавішний вимикач', icon: 'fa-solid fa-sliders' },
                { id: 'threeKey', name: 'Трьохклавішний вимикач', icon: 'fa-solid fa-list' }
            ]
        }
    }),

    mutations: {
        // Перемикач відображення бокового меню
        toggleSidebarMenu(state) {
            state.isMenuOpen = !state.isMenuOpen;
        },

        // Відкрити бокове меню
        openSidebarMenu(state) {
            state.isMenuOpen = true;
        },

        // Закрити бокове меню
        closeSidebarMenu(state) {
            state.isMenuOpen = false;
        },

        // Встановити активний режим
        setActiveMode(state, mode) {
            state.activeMode = mode;
            // При зміні режиму відкриваємо бокове меню
            state.isMenuOpen = true;
        },

        // Встановити активний інструмент для поточного режиму
        setActiveTool(state, { mode, toolId }) {
            state.activeTool[mode] = toolId;
        }
    },

    actions: {
        // Тут можна додати складні дії, якщо потрібно

        // Наприклад, вибір інструменту з додатковою логікою
        selectToolWithEffect({ commit, state }, { mode, toolId }) {
            // Додаткова логіка, якщо потрібно
            commit('setActiveTool', { mode, toolId });
        }
    }
};

export default editorTools;