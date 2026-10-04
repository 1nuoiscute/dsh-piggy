// @ts-check
/** Send liveness while a held pointer is still, and return timer cleanup. */
export function startDragHeartbeat(shell, isDragging) {
  if (typeof shell?.dragHeartbeat !== 'function') return () => {}
  const timer = window.setInterval(() => {
    if (isDragging()) shell.dragHeartbeat()
  }, 250)
  return () => window.clearInterval(timer)
}
