import 'package:flutter/material.dart';

import '../models/sound_category.dart';
import '../models/sound_config.dart';
import '../models/tone_preset.dart';

const tonePresets = <TonePreset>[
  TonePreset(
    id: TonePresetId.pure,
    name: 'Pure Sine',
    description: 'Clean, centered drone for deep clarity.',
  ),
  TonePreset(
    id: TonePresetId.warm,
    name: 'Warm Pad',
    description: 'Golden warmth with soft harmonic bloom.',
  ),
  TonePreset(
    id: TonePresetId.astral,
    name: 'Astral',
    description: 'Shimmering overtones and gentle air.',
  ),
  TonePreset(
    id: TonePresetId.organ,
    name: 'Healing Organ',
    description: 'Breathy, grounded and devotional.',
  ),
];

const _tonalSampleKeys = <TonePresetId, String>{
  TonePresetId.pure: 'tones/pure/anchor_c',
  TonePresetId.warm: 'tones/warm/anchor_warm',
  TonePresetId.astral: 'tones/pure/anchor_c',
  TonePresetId.organ: 'tones/pure/anchor_c',
};

const _previewTonalKeys = <TonePresetId, String>{
  TonePresetId.pure: 'tones/pure/anchor_c.mp3',
  TonePresetId.warm: 'tones/warm/anchor_warm.mp3',
  TonePresetId.astral: 'tones/pure/anchor_c.mp3',
  TonePresetId.organ: 'tones/pure/anchor_c.mp3',
};

const _vaultTonalKeys = <TonePresetId, String>{
  TonePresetId.pure: 'tones/pure/anchor_c',
  TonePresetId.warm: 'tones/warm/anchor_warm',
  TonePresetId.astral: 'tones/pure/anchor_c',
  TonePresetId.organ: 'tones/pure/anchor_c',
};

const tonalSounds = <SoundConfig>[
  SoundConfig(
    id: 'drone-c',
    label: 'Root C',
    category: SoundCategory.tonal,
    baseFrequency: 128.43,
    assetKeysByPreset: _tonalSampleKeys,
    previewKeysByPreset: _previewTonalKeys,
    vaultKeysByPreset: _vaultTonalKeys,
    color: Color(0xFFD6B46A),
  ),
  SoundConfig(
    id: 'drone-c-sharp',
    label: 'C#',
    category: SoundCategory.tonal,
    baseFrequency: 136.07,
    assetKeysByPreset: _tonalSampleKeys,
    previewKeysByPreset: _previewTonalKeys,
    vaultKeysByPreset: _vaultTonalKeys,
    color: Color(0xFFC59C57),
    isHalftone: true,
  ),
  SoundConfig(
    id: 'drone-d',
    label: 'Sacral D',
    category: SoundCategory.tonal,
    baseFrequency: 144.16,
    assetKeysByPreset: _tonalSampleKeys,
    previewKeysByPreset: _previewTonalKeys,
    vaultKeysByPreset: _vaultTonalKeys,
    color: Color(0xFFE0C07E),
  ),
  SoundConfig(
    id: 'drone-d-sharp',
    label: 'D#',
    category: SoundCategory.tonal,
    baseFrequency: 152.74,
    assetKeysByPreset: _tonalSampleKeys,
    previewKeysByPreset: _previewTonalKeys,
    vaultKeysByPreset: _vaultTonalKeys,
    color: Color(0xFFCBAA63),
    isHalftone: true,
  ),
  SoundConfig(
    id: 'drone-e',
    label: 'Solar E',
    category: SoundCategory.tonal,
    baseFrequency: 161.82,
    assetKeysByPreset: _tonalSampleKeys,
    previewKeysByPreset: _previewTonalKeys,
    vaultKeysByPreset: _vaultTonalKeys,
    color: Color(0xFFE7D3A1),
  ),
  SoundConfig(
    id: 'drone-f',
    label: 'Heart F',
    category: SoundCategory.tonal,
    baseFrequency: 171.44,
    assetKeysByPreset: _tonalSampleKeys,
    previewKeysByPreset: _previewTonalKeys,
    vaultKeysByPreset: _vaultTonalKeys,
    color: Color(0xFFCFB06E),
  ),
  SoundConfig(
    id: 'drone-f-sharp',
    label: 'F#',
    category: SoundCategory.tonal,
    baseFrequency: 181.63,
    assetKeysByPreset: _tonalSampleKeys,
    previewKeysByPreset: _previewTonalKeys,
    vaultKeysByPreset: _vaultTonalKeys,
    color: Color(0xFFB88F4E),
    isHalftone: true,
  ),
  SoundConfig(
    id: 'drone-g',
    label: 'Throat G',
    category: SoundCategory.tonal,
    baseFrequency: 192.43,
    assetKeysByPreset: _tonalSampleKeys,
    previewKeysByPreset: _previewTonalKeys,
    vaultKeysByPreset: _vaultTonalKeys,
    color: Color(0xFFD7BC83),
  ),
  SoundConfig(
    id: 'drone-g-sharp',
    label: 'G#',
    category: SoundCategory.tonal,
    baseFrequency: 203.88,
    assetKeysByPreset: _tonalSampleKeys,
    previewKeysByPreset: _previewTonalKeys,
    vaultKeysByPreset: _vaultTonalKeys,
    color: Color(0xFFC19B58),
    isHalftone: true,
  ),
  SoundConfig(
    id: 'drone-a',
    label: 'Eye A',
    category: SoundCategory.tonal,
    baseFrequency: 216.00,
    assetKeysByPreset: _tonalSampleKeys,
    previewKeysByPreset: _previewTonalKeys,
    vaultKeysByPreset: _vaultTonalKeys,
    color: Color(0xFFE3C98D),
  ),
  SoundConfig(
    id: 'drone-a-sharp',
    label: 'A#',
    category: SoundCategory.tonal,
    baseFrequency: 228.84,
    assetKeysByPreset: _tonalSampleKeys,
    previewKeysByPreset: _previewTonalKeys,
    vaultKeysByPreset: _vaultTonalKeys,
    color: Color(0xFFB68842),
    isHalftone: true,
  ),
  SoundConfig(
    id: 'drone-b',
    label: 'Crown B',
    category: SoundCategory.tonal,
    baseFrequency: 242.45,
    assetKeysByPreset: _tonalSampleKeys,
    previewKeysByPreset: _previewTonalKeys,
    vaultKeysByPreset: _vaultTonalKeys,
    color: Color(0xFFDBC393),
  ),
  SoundConfig(
    id: 'drone-c-high',
    label: 'Soul C',
    category: SoundCategory.tonal,
    baseFrequency: 256.87,
    assetKeysByPreset: _tonalSampleKeys,
    previewKeysByPreset: _previewTonalKeys,
    vaultKeysByPreset: _vaultTonalKeys,
    color: Color(0xFFF0D9A9),
  ),
];

const atmosphereSounds = <SoundConfig>[
  SoundConfig(
    id: 'atmos-birds',
    label: 'Birds',
    category: SoundCategory.atmosphere,
    assetKey: 'atmos/birds',
    previewKey: 'atmos/birds.mp3',
    vaultKey: 'atmos/birds',
    color: Color(0xFFD5C2A1),
  ),
];
