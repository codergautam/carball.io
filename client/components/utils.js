export function interpolateEntityX(entity, time = Date.now(), timeStart) {
  let r = (time - timeStart) / (1000/20);
  if (r > 1.5) r = 1.5;
  return (r * (entity.targetX - entity.x) + entity.x);
}

export function interpolateEntityY(entity, time = Date.now(), timeStart) {
  let r = (time - timeStart) / (1000/20);
  if (r > 1.5) r = 1.5;
  return (r * (entity.targetY - entity.y) + entity.y);
}

export function mod(n, m) {
  return ((n % m) + m) % m;
}

export function interpolateEntityAngle(entity, time = Date.now(), timeStart) {
  let r = (time - timeStart) / (1000/10);
  if (r > 1.5) r = 1.5;
  return (r * (mod(entity.targetAngle - entity.angle + Math.PI, 2 * Math.PI) - Math.PI) + entity.angle);
}

export function formatTime(ms){
    let seconds = Math.floor(ms / 1000) % 60;
    let minutes = Math.floor(ms / 60000);

    if (seconds < 0) seconds = 0;
    if (minutes < 0) minutes = 0;

    if (seconds.toString().length == 1)
        seconds = "0" + seconds;

    return minutes + ":" + seconds;
}