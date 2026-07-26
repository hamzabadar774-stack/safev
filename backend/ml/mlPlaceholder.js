// Placeholder for a trained ML model.
//
// Replace `predict()` with a call into a bundled model (ONNX, TensorFlow.js,
// or an out-of-process Python inference service). The detection service will
// prefer this result when `enabled` is true and the confidence exceeds the
// rule engine's confidence.
//
// Suggested feature vector for an intrusion-detection dataset (e.g. NSL-KDD,
// CICIDS2017):
//   [ packet_size, protocol_id, src_port, dst_port,
//     flag_bits, duration_since_last_pkt, packets_per_src_ip_5s, ... ]

module.exports = {
  enabled: false,
  version: "not-loaded",
  async predict(_packet) {
    return null; // return { threat_type, severity, confidence, description, recommendation } when a model is loaded
  },
};
