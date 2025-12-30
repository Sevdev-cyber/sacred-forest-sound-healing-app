import 'package:flutter/material.dart';

import '../models/sound_category.dart';
import '../models/sound_config.dart';
import '../models/sound_element.dart';
import '../models/tone_preset.dart';

const tonePresets = <TonePreset>[
  TonePreset(
    id: TonePresetId.pure,
    name: 'Pure',
    description: 'Clean, centered drone for deep clarity.',
  ),
  TonePreset(
    id: TonePresetId.warm,
    name: 'Warm',
    description: 'Golden warmth with soft harmonic bloom.',
  ),
  TonePreset(
    id: TonePresetId.astral,
    name: 'Astral',
    description: 'Shimmering overtones and gentle air.',
  ),
  TonePreset(
    id: TonePresetId.organ,
    name: 'Organ',
    description: 'Breathy, grounded and devotional.',
  ),
];

const Color etherColor = Color(0xFFD6B46A);
const Color earthColor = Color(0xFFB88F4E);
const Color airColor = Color(0xFFE3C98D);
const Color waterColor = Color(0xFFCFB06E);

const Map<SoundElement, Color> elementColors = {
  SoundElement.ether: etherColor,
  SoundElement.earth: earthColor,
  SoundElement.air: airColor,
  SoundElement.water: waterColor,
};

const starterSounds = <SoundConfig>[
  SoundConfig(
    id: 'instr_01',
    label: 'Crystal Harp',
    category: SoundCategory.tonal,
    element: SoundElement.ether,
    baseFrequency: 432,
    description: 'The heart of the forest.',
    previewKey: 'preview/harp_ethereal.mp3',
    vaultKey: 'vault/harp_master.ogg',
    color: etherColor,
  ),
  SoundConfig(
    id: 'instr_02',
    label: 'Shamanic Drum',
    category: SoundCategory.tonal,
    element: SoundElement.earth,
    description: 'Deep grounding rhythm.',
    previewKey: 'preview/drum_gaia.mp3',
    vaultKey: 'vault/drum_master.ogg',
    color: earthColor,
  ),
  SoundConfig(
    id: 'instr_03',
    label: 'Koshi Air',
    category: SoundCategory.tonal,
    element: SoundElement.air,
    baseFrequency: 440,
    description: 'Whispers of the wind.',
    previewKey: 'preview/koshi_air.mp3',
    vaultKey: 'vault/koshi_master.ogg',
    color: airColor,
  ),
  SoundConfig(
    id: 'instr_04',
    label: 'Forest Rain',
    category: SoundCategory.atmosphere,
    element: SoundElement.water,
    description: 'Cleansing background texture.',
    previewKey: 'preview/rain_soft.mp3',
    vaultKey: 'vault/rain_loop.ogg',
    color: waterColor,
  ),
];
