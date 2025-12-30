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
    this.previewKey,
    this.previewKeysByPreset,
    this.vaultKey,
    this.vaultKeysByPreset,
    this.isHalftone = false,
  });

  final String id;
  final String label;
  final SoundCategory category;
  final double? baseFrequency;
  final String? assetKey;
  final Map<TonePresetId, String>? assetKeysByPreset;
  // previewKey uses the full filename (e.g. tones/pure/anchor_c.mp3).
  final String? previewKey;
  final Map<TonePresetId, String>? previewKeysByPreset;
  // vaultKey omits the extension so the platform can choose ogg/m4a.
  final String? vaultKey;
  final Map<TonePresetId, String>? vaultKeysByPreset;
  final Color color;
  final bool isHalftone;
}
