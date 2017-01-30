
function update (original, data) {
  const nextPlayCount = (original && original.playCount || 0) + 1
  if (!original || data.score > original.score) {
    return Object.assign({ }, original || { }, {
      score: data.score,
      playCount: nextPlayCount,
      playNumber: nextPlayCount,
      combo: data.combo,
      count: data.count,
      log: data.log,
      recordedAt: new Date()
    })
  } else {
    return Object.assign({ }, original, {
      playCount: nextPlayCount
    })
  }
}

exports.update = update
