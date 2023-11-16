export function interpolateEntityX(entity, time = Date.now(), timeStart) {
  let r = (time - timeStart) / (1000/30);
  if (r > 1.5) r = 1.5;
  return (r * (entity.targetX - entity.x) + entity.x);
}

export function interpolateEntityY(entity, time = Date.now(), timeStart) {
  let r = (time - timeStart) / (1000/30);
  if (r > 1.5) r = 1.5;
  return (r * (entity.targetY - entity.y) + entity.y);
}

export function mod(n, m) {
  return ((n % m) + m) % m;
}

export function shortAngle(angle, angle2) {
  let max = 360;
  let deltaAngle = (angle2 - angle) % max;
  return 2 * deltaAngle % max - deltaAngle;
}

export function interpolateEntityAngle(entity, time = Date.now(), timeStart) {
  let r = (Date.now() - timeStart) / (1000/30);
  if (r > 1.5) r = 1.5;
  return mod(r * shortAngle(entity.angle, entity.targetAngle) + entity.angle, 360);
}