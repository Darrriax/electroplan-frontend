export default function drawDoor(ctx, door) {
  if (!door || !door.position || !door.dimensions) return;

  const { x, y, rotation } = door.position;
  // Convert dimensions from millimeters to canvas units (divide by 10)
  const length = door.dimensions.length / 10;
  const thickness = door.dimensions.thickness / 10;
  const openingDirection = door.openingDirection || 'left';
  const openingSide = door.openingSide || 'inside';

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  // Draw door frame
  ctx.fillStyle = '#000000';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;

  // Draw the main rectangle
  ctx.beginPath();
  ctx.rect(-length/2, -thickness/2, length, thickness);
  ctx.stroke();

  // Draw door leaf and swing
  // Calculate door leaf Y position based on opening side
  const doorY = openingSide === 'inside' ? -thickness/2 : thickness/2;

  // Draw door leaf line
  ctx.beginPath();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.moveTo(-length/2, doorY);
  ctx.lineTo(length/2, doorY);
  ctx.stroke();

  // Draw door swing arc
  ctx.beginPath();
  ctx.setLineDash([4, 4]);
  
  // Determine arc parameters based on opening direction and side
  const radius = length;
  let startX, startAngle, endAngle, counterClockwise;

  if (openingDirection === 'right') {
    startX = openingSide === 'inside' ? length/2 : -length/2;
    if (openingSide === 'inside') {
      // Right Inside
      startAngle = Math.PI * 0.5;
      endAngle = Math.PI;
      counterClockwise = false;
    } else {
      // Right Outside
      startAngle = Math.PI * 1.5;
      endAngle = Math.PI * 2;
      counterClockwise = false;
    }
  } else { // left
    startX = openingSide === 'inside' ? -length/2 : length/2;
    if (openingSide === 'inside') {
      // Left Inside
      startAngle = 0;
      endAngle = Math.PI * 0.5;
      counterClockwise = false;
    } else {
      // Left Outside
      startAngle = Math.PI;
      endAngle = Math.PI * 1.5;
      counterClockwise = false;
    }
  }

  // Draw the arc
  ctx.arc(startX, doorY, radius, startAngle, endAngle, counterClockwise);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();
} 