function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/** Removes white/black matte contamination from translucent edge pixels. */
export function decontaminateAlphaEdges(data: Uint8ClampedArray) {
  const result = new Uint8ClampedArray(data);
  for (let index = 0; index < result.length; index += 4) {
    const alphaByte = result[index + 3];
    if (alphaByte === 0 || alphaByte === 255) continue;
    if (alphaByte < 4) {
      result[index + 3] = 0;
      continue;
    }
    const alpha = alphaByte / 255;
    const average = (result[index] + result[index + 1] + result[index + 2]) / 3;
    if (average > 210) {
      for (let channel = 0; channel < 3; channel += 1)
        result[index + channel] = clampChannel(
          (result[index + channel] - 255 * (1 - alpha)) / alpha,
        );
    } else if (average < 45) {
      for (let channel = 0; channel < 3; channel += 1)
        result[index + channel] = clampChannel(result[index + channel] / alpha);
    }
  }
  return result;
}
