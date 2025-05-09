export const project = {
    namespaced: true,
    state: () => ({
        projectName: '',
        customer: '',
        updatedAt: '',
        wallHeight: 250,
        unit: 'cm',
        selectedTool: 'wall',
        undoStack: [],
        redoStack: [],
    }),
    mutations: { /* оновлення стану */ },
    actions: { /* логіка undo/redo */ }
}