export default function fit(center, stage, screenWidth, screenHeight, virtualWidth, virtualHeight, appliedZoom = 1) {
  stage.scale.x = screenWidth / virtualWidth
  stage.scale.y = screenHeight / virtualHeight

  if (stage.scale.x < stage.scale.y) {
      stage.scale.y = stage.scale.x
  } else {
      stage.scale.x = stage.scale.y
  }

  stage.scale.x *= appliedZoom
  stage.scale.y *= appliedZoom

  const virtualWidthInScreenPixels = virtualWidth * stage.scale.x
  const virtualHeightInScreenPixels = virtualHeight * stage.scale.y
  const centerXInScreenPixels = screenWidth * 0.5;
  const centerYInScreenPixels = screenHeight * 0.5;

  if (center) {
      stage.position.x = centerXInScreenPixels;
      stage.position.y = centerYInScreenPixels;
  } else {
      stage.position.x = centerXInScreenPixels - virtualWidthInScreenPixels * 0.5;
      stage.position.y = centerYInScreenPixels - virtualHeightInScreenPixels * 0.5;
  }
}