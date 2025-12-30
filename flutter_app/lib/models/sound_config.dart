import 'package:flutter/material.dart';

import 'sound_category.dart';
import 'tone_preset.dart';

class SoundConfig {
  const SoundConfig({
    required this.id,
    required this.label,
    required this.category,
    required this.color,
    this.baseFrequency,
    this.assetKey,
    this.assetKeysByPreset,
    this.isHalftone = false,
  });

  final String id;
  final String label;
  final SoundCategory category;
  final double? baseFrequency;
  final String? assetKey;
  final Map<TonePresetId, String>? assetKeysByPreset;
  final Color color;
  final bool isHalftone;
}
