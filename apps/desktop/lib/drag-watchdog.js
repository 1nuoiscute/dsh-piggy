/** A drag without pointer movement for over a second must release the window. */
export function dragHeartbeatExpired(lastHeartbeat, now) {
  return now - lastHeartbeat > 1000
}
