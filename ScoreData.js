
function update (original, data) {
  const nextPlayCount = (original && original.playCount || 0) + 1
  const score = +data.score
  if (!original || score > original.score) {
    return Object.assign({ }, original || { }, {
      score: score,
      playCount: nextPlayCount,
      playNumber: nextPlayCount,
      combo: +data.combo || 0,
      count: [
        +data.count[0] || 0,
        +data.count[1] || 0,
        +data.count[2] || 0,
        +data.count[3] || 0,
        +data.count[4] || 0
      ],
      total: +data.total || 0,
      log: String(data.log),
      recordedAt: new Date()
    })
  } else {
    return Object.assign({ }, original, {
      playCount: nextPlayCount
    })
  }
}

exports.update = update
