const FallingBall = memo(({ ball, onSettle }: { ball: PlinkoBall; onSettle: (ball: PlinkoBall) => void }) => {
  const frames = useMemo(() => ballKeyframes(ball.path, Math.random), [ball.path]);

  useEffect(() => {
    const timers = frames.hits.map((h) =>
      setTimeout(() => pulsePegElement(h.row, h.index), h.t * DROP_DURATION_S * 1000)
    );
    return () => timers.forEach(clearTimeout);
  }, [frames]);

  return (
    <motion.circle
      r={BALL_RADIUS}
      fill="#FFD700"
      stroke="#050508"
      strokeWidth={2}
      initial={{ cx: frames.xs[0], cy: frames.ys[0] }}
      animate={{ cx: frames.xs, cy: frames.ys }}
      transition={{ duration: DROP_DURATION_S, times: frames.times, ease: frames.eases }}
      onAnimationComplete={() => onSettle(ball)}
    />
  );
});