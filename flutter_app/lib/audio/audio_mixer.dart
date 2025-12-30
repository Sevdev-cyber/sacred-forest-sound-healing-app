import 'dart:async';
import 'dart:io';

import 'package:audio_session/audio_session.dart';
import 'package:flutter/foundation.dart';
import 'package:just_audio/just_audio.dart';

import '../data/sound_catalog.dart';
import '../models/sound_category.dart';
import '../models/sound_config.dart';
import '../models/tone_preset.dart';

class SoundState {
  SoundState({required this.config})
      : player = AudioPlayer(),
        targetIntensity = 0,
        currentVolume = 0,
        isLoaded = false,
        isLoading = false;

  final SoundConfig config;
  final AudioPlayer player;
  double targetIntensity;
  double currentVolume;
  bool isLoaded;
  bool isLoading;
  String? loadedAsset;
}

class AudioMixer extends ChangeNotifier {
  AudioMixer() {
    initialize();
  }

  final Map<String, SoundState> _sounds = {};
  final Map<String, String> _cachedFiles = {};
  TonePresetId _preset = TonePresetId.pure;
  double tonalVolume = 0.85;
  double atmosVolume = 0.55;
  bool _ready = false;
  Timer? _ticker;

  TonePresetId get preset => _preset;
  bool get ready => _ready;

  List<SoundState> get tonalStates => _sounds.values
      .where((state) => state.config.category == SoundCategory.tonal)
      .toList();

  List<SoundState> get atmosphereStates => _sounds.values
      .where((state) => state.config.category == SoundCategory.atmosphere)
      .toList();

  Future<void> initialize() async {
    if (_ready) return;

    final session = await AudioSession.instance;
    await session.configure(const AudioSessionConfiguration.music());

    for (final sound in [...tonalSounds, ...atmosphereSounds]) {
      final state = SoundState(config: sound);
      await state.player.setVolume(0);
      await state.player.setLoopMode(LoopMode.one);
      _sounds[sound.id] = state;
    }

    _ready = true;
    notifyListeners();
  }

  Future<void> setPreset(TonePresetId preset) async {
    if (preset == _preset) return;
    _preset = preset;

    for (final state in tonalStates) {
      await _reloadForPreset(state);
    }
    notifyListeners();
  }

  void setTonalVolume(double value) {
    tonalVolume = value;
    notifyListeners();
  }

  void setAtmosVolume(double value) {
    atmosVolume = value;
    notifyListeners();
  }

  void setIntensity(String id, double value) {
    final state = _sounds[id];
    if (state == null) return;

    state.targetIntensity = value.clamp(0, 1);

    if (state.targetIntensity > 0) {
      _ensureLoaded(state);
    }

    _startTicker();
    notifyListeners();
  }

  Future<void> setCachedFile(String id, String path, {TonePresetId? preset}) async {
    final state = _sounds[id];
    if (state == null) return;
    final key = _cacheKeyFor(state.config, preset ?? _preset);
    _cachedFiles[key] = path;
    await _reloadSound(state);
  }

  Future<void> clearCachedFile(String id, {TonePresetId? preset}) async {
    final state = _sounds[id];
    if (state == null) return;
    final key = _cacheKeyFor(state.config, preset ?? _preset);
    _cachedFiles.remove(key);
    await _reloadSound(state);
  }

  double intensityFor(String id) => _sounds[id]?.targetIntensity ?? 0;

  void _startTicker() {
    _ticker ??= Timer.periodic(const Duration(milliseconds: 16), (_) {
      var anyActive = false;

      for (final state in _sounds.values) {
        final categoryGain =
            state.config.category == SoundCategory.tonal ? tonalVolume : atmosVolume;
        final targetVolume = state.targetIntensity * categoryGain;
        state.currentVolume = _lerp(state.currentVolume, targetVolume, 0.12);
        if ((state.currentVolume - targetVolume).abs() < 0.001) {
          state.currentVolume = targetVolume;
        }

        if (state.currentVolume > 0.0005) {
          anyActive = true;
          if (state.isLoaded && !state.player.playing) {
            state.player.play();
          }
        } else if (state.player.playing) {
          state.player.pause();
        }

        state.player.setVolume(state.currentVolume);
      }

      if (!anyActive) {
        _ticker?.cancel();
        _ticker = null;
      }
    });
  }

  double _lerp(double current, double target, double amount) {
    return current + (target - current) * amount;
  }

  Future<void> _ensureLoaded(SoundState state) async {
    if (state.isLoaded || state.isLoading) return;
    state.isLoading = true;

    final cacheKey = _cacheKeyFor(state.config, _preset);
    var cachedPath = _cachedFiles[cacheKey];
    if (cachedPath != null && !File(cachedPath).existsSync()) {
      _cachedFiles.remove(cacheKey);
      cachedPath = null;
    }

    final assetPath = cachedPath ?? _resolveAssetPath(state.config);
    if (assetPath == null) {
      state.isLoading = false;
      return;
    }

    if (state.loadedAsset != assetPath) {
      final source = cachedPath != null
          ? AudioSource.file(cachedPath)
          : AudioSource.asset(assetPath);
      await state.player.setAudioSource(source);
      state.loadedAsset = assetPath;
    }

    state.isLoaded = true;
    state.isLoading = false;
  }

  Future<void> _reloadForPreset(SoundState state) async {
    state.isLoaded = false;
    state.isLoading = false;
    await _ensureLoaded(state);
  }

  Future<void> _reloadSound(SoundState state) async {
    state.isLoaded = false;
    state.isLoading = false;
    await _ensureLoaded(state);
  }

  String _cacheKeyFor(SoundConfig sound, TonePresetId preset) {
    if (sound.category == SoundCategory.atmosphere) {
      return '${sound.id}|atmos';
    }
    return '${sound.id}|${preset.name}';
  }

  String _platformFolder() {
    if (kIsWeb) return 'ogg';
    if (Platform.isIOS || Platform.isMacOS) return 'aac';
    return 'ogg';
  }

  String _platformExtension(String folder) {
    if (folder == 'aac') return 'm4a';
    return 'ogg';
  }

  String? _resolveAssetPath(SoundConfig sound) {
    final folder = _platformFolder();
    final extension = _platformExtension(folder);
    final key = sound.category == SoundCategory.tonal
        ? (sound.assetKeysByPreset == null
            ? null
            : sound.assetKeysByPreset![_preset])
        : sound.assetKey;

    if (key == null) return null;
    return 'assets/audio/$folder/$key.$extension';
  }

  @override
  void dispose() {
    _ticker?.cancel();
    for (final state in _sounds.values) {
      state.player.dispose();
    }
    super.dispose();
  }
}
