/**
 * Створює діагональний візерунок для стін (або іншої поверхні) у вигляді canvas-патерна.
 * @param {Object} options - Налаштування створення патерна.
 * @param {boolean} [options.removeBorders=false] - Якщо true, діагональні лінії не малюються.
 * @returns {fabric.Pattern} - Об'єкт патерна FabricJS.
 */
export function createWallPattern(options = {}) {
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = 6;
    patternCanvas.height = 6;

    const ctx = patternCanvas.getContext('2d');

    // Заливка фону
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, patternCanvas.width, patternCanvas.height);

    // Якщо потрібне приховування ліній (наприклад, для перегляду без патерна)
    if (options.removeBorders) {
        ctx.strokeStyle = 'transparent';
    } else {
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 6);
        ctx.lineTo(6, 0);
        ctx.stroke();
    }

    // Створення патерна FabricJS з повторенням
    return new fabric.Pattern({
        source: patternCanvas,
        repeat: 'repeat'
    });
}