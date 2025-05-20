export default function drawWindow(ctx, window) {
  if (!window || !window.position || !window.dimensions) return;

  const { x, y, rotation } = window.position;
  // Convert dimensions from millimeters to canvas units (divide by 10)
  const length = window.dimensions.length / 10;
  const thickness = window.dimensions.thickness / 10;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  // Draw window frame
  ctx.fillStyle = '#000000';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;

  // Draw the main rectangle
  ctx.beginPath();
  ctx.rect(-length/2, -thickness/2, length, thickness);
  ctx.stroke();

  // Draw window panes
  ctx.beginPath();
  ctx.moveTo(-length/2, -thickness/2);
  ctx.lineTo(length/2, -thickness/2);
  ctx.moveTo(-length/2, thickness/2);
  ctx.lineTo(length/2, thickness/2);

  // Draw vertical lines to represent window panes
  const numPanes = 2; // You can adjust this for different window styles
  const paneWidth = length / numPanes;
  
  for (let i = 1; i < numPanes; i++) {
    const x = -length/2 + i * paneWidth;
    ctx.moveTo(x, -thickness/2);
    ctx.lineTo(x, thickness/2);
  }
  
  ctx.stroke();

  ctx.restore();
} 