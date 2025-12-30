import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../audio/asset_manager.dart';
import '../../audio/audio_mixer.dart';
import '../../data/sound_catalog.dart';
import '../../data/sound_library_state.dart';
import '../../models/sound_category.dart';
import '../../models/sound_config.dart';
import '../../models/tone_preset.dart';
import '../../theme/app_theme.dart';

enum TabView { harp, backing, mixer, visuals }

class MandalaScreen extends StatefulWidget {
  const MandalaScreen({super.key});

  @override
  State<MandalaScreen> createState() => _MandalaScreenState();
}

class _MandalaScreenState extends State<MandalaScreen> with SingleTickerProviderStateMixin {
  final GlobalKey _orbitKey = GlobalKey();
  final Map<String, double> _soundIntensities = {};
  final Map<String, double> _downloadProgress = {};
  final Set<String> _downloading = {};
  final Set<String> _registeredSoundIds = {};

  TabView _currentTab = TabView.backing;
  TonePresetId _preset = TonePresetId.pure;

  double _tonalVolume = 0.8;
  double _atmosVolume = 0.5;
  double _orbitSpeed = 0.35;

  late final Ticker _ticker;
  double _orbitPhase = 0;
  Duration _lastTick = Duration.zero;

  @override
  void initState() {
    super.initState();
    _ticker = createTicker(_onTick)..start();
  }

  @override
  void dispose() {
    _ticker.dispose();
    super.dispose();
  }

  void _onTick(Duration elapsed) {
    if (!mounted) return;
    if (_currentTab != TabView.backing) {
      _lastTick = elapsed;
      return;
    }
    final deltaSeconds = (elapsed - _lastTick).inMilliseconds / 1000.0;
    _lastTick = elapsed;
    if (deltaSeconds <= 0 || _orbitSpeed <= 0) return;
    final speed = 12 + (_orbitSpeed * 60);
    _orbitPhase = (_orbitPhase + (deltaSeconds * speed)) % 360;
    setState(() {});
  }

  void _syncSounds(AudioMixer mixer, List<SoundConfig> sounds) {
    final ids = sounds.map((sound) => sound.id).toSet();
    if (setEquals(ids, _registeredSoundIds)) return;
    _registeredSoundIds
      ..clear()
      ..addAll(ids);
    mixer.setSounds(sounds);
  }

  double _intensityFor(String id) => _soundIntensities[id] ?? 0;

  Future<void> _setSoundIntensity(SoundConfig sound, double value) async {
    final clamped = value.clamp(0.0, 1.0);
    final effective = clamped < 0.05 ? 0.0 : clamped;

    setState(() {
      _soundIntensities[sound.id] = effective;
    });

    final mixer = context.read<AudioMixer>();
    if (effective > 0) {
      await _ensureSoundReady(sound);
      await mixer.setIntensity(sound.id, effective);
    } else {
      await mixer.setIntensity(sound.id, 0);
    }
  }

  Future<void> _ensureSoundReady(SoundConfig sound) async {
    final mixer = context.read<AudioMixer>();
    final assets = context.read<AssetManager>();
    final session = Supabase.instance.client.auth.currentSession;
    final hasSession = session != null;

    if (kIsWeb) {
      final url = hasSession
          ? await assets.vaultUrl(sound: sound, preset: _preset)
          : await assets.previewUrl(sound: sound, preset: _preset);
      if (url != null) {
        await mixer.setRemoteUrl(sound.id, url.toString(), preset: _preset);
      }
      return;
    }

    final cachedFile = hasSession
        ? await assets.cachedVaultFile(sound: sound, preset: _preset)
        : await assets.cachedPreviewFile(sound: sound, preset: _preset);

    if (cachedFile != null) {
      await mixer.setCachedFile(sound.id, cachedFile.path, preset: _preset);
      return;
    }

    if (_downloading.contains(sound.id)) return;

    setState(() {
      _downloading.add(sound.id);
      _downloadProgress[sound.id] = 0;
    });

    AssetDownloadResult? result;
    if (hasSession) {
      result = await _downloadVault(assets, sound);
    }
    result ??= await _downloadPreview(assets, sound);

    if (result != null) {
      await mixer.setCachedFile(sound.id, result.file.path, preset: _preset);
    }

    if (!mounted) return;
    setState(() {
      _downloading.remove(sound.id);
      _downloadProgress[sound.id] = result == null ? 0 : 1;
    });
  }

  Future<AssetDownloadResult?> _downloadVault(AssetManager assets, SoundConfig sound) async {
    try {
      return await assets.getOrDownloadVault(
        sound: sound,
        preset: _preset,
        onProgress: (value) {
          if (!mounted) return;
          setState(() {
            _downloadProgress[sound.id] = value;
          });
        },
      );
    } catch (_) {
      return null;
    }
  }

  Future<AssetDownloadResult?> _downloadPreview(AssetManager assets, SoundConfig sound) async {
    try {
      return await assets.getOrDownloadPreview(
        sound: sound,
        preset: _preset,
        onProgress: (value) {
          if (!mounted) return;
          setState(() {
            _downloadProgress[sound.id] = value;
          });
        },
      );
    } catch (_) {
      return null;
    }
  }

  void _handleOrbDrag(Offset globalPosition, SoundConfig sound, double minRadius, double maxRadius) {
    final box = _orbitKey.currentContext?.findRenderObject() as RenderBox?;
    if (box == null) return;
    final local = box.globalToLocal(globalPosition);
    final center = Offset(box.size.width / 2, box.size.height / 2);
    final distance = (local - center).distance;
    final clamped = distance.clamp(minRadius, maxRadius);
    final distanceFraction = (clamped - minRadius) / (maxRadius - minRadius);
    final newValue = 1 - distanceFraction;
    _setSoundIntensity(sound, newValue);
  }

  void _showInfo() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sacred Forest'),
        content: const Text(
          'Tap and drag planets to summon instruments. Atmosphere fills the space, orbit speed breathes the sky.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [AppTheme.ivory, AppTheme.ivoryDeep],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: Consumer2<SoundLibraryState, AudioMixer>(
            builder: (context, library, mixer, _) {
              final sounds = library.sounds;
              _syncSounds(mixer, sounds);

              final tonalSounds = sounds.where((s) => s.category == SoundCategory.tonal).toList();
              final atmosSounds = sounds.where((s) => s.category == SoundCategory.atmosphere).toList();

              return Stack(
                children: [
                  _buildTabs(tonalSounds, atmosSounds),
                  _buildCorners(),
                  Positioned(
                    top: 12,
                    left: 0,
                    right: 0,
                    child: Center(
                      child: IconButton(
                        onPressed: _showInfo,
                        icon: const Icon(Icons.info_outline),
                        color: AppTheme.softInk,
                        style: IconButton.styleFrom(
                          backgroundColor: Colors.white,
                          elevation: 6,
                        ),
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildTabs(List<SoundConfig> tonalSounds, List<SoundConfig> atmosSounds) {
    return Stack(
      children: [
        _tabView(
          TabView.backing,
          _buildMandala(tonalSounds, atmosSounds),
        ),
        _tabView(
          TabView.mixer,
          _buildMixer(),
        ),
        _tabView(
          TabView.harp,
          _buildPlaceholder('Instrument Gallery'),
        ),
        _tabView(
          TabView.visuals,
          _buildPlaceholder('Visual Rituals'),
        ),
      ],
    );
  }

  Widget _tabView(TabView view, Widget child) {
    final isActive = _currentTab == view;
    return IgnorePointer(
      ignoring: !isActive,
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 300),
        opacity: isActive ? 1 : 0,
        child: child,
      ),
    );
  }

  Widget _buildMandala(List<SoundConfig> tonalSounds, List<SoundConfig> atmosSounds) {
    return Column(
      children: [
        const SizedBox(height: 40),
        Text(
          'Sonic Mandala',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 6),
        Text(
          'Draw the planets toward the core.',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        Expanded(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final size = Size(constraints.maxWidth, constraints.maxHeight);
              final isSmall = size.width < 380;
              final isMobile = size.width < 768;
              final minRadius = isSmall ? 65.0 : (isMobile ? 85.0 : 130.0);
              final maxRadius = isSmall ? 125.0 : (isMobile ? 170.0 : 260.0);

              return Stack(
                children: [
                  Positioned.fill(
                    child: _OrbitBackground(minRadius: minRadius, maxRadius: maxRadius),
                  ),
                  Positioned.fill(
                    child: Container(
                      key: _orbitKey,
                      alignment: Alignment.center,
                      child: Stack(
                        children: [
                          _OrbitCore(),
                          for (int i = 0; i < tonalSounds.length; i++)
                            _buildOrb(
                              sound: tonalSounds[i],
                              index: i,
                              count: tonalSounds.length,
                              minRadius: minRadius,
                              maxRadius: maxRadius,
                            ),
                        ],
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
        _PresetRow(
          presets: tonePresets,
          selected: _preset,
          onSelect: (preset) {
            setState(() {
              _preset = preset;
            });
            context.read<AudioMixer>().setPreset(preset);
          },
        ),
        _AtmosDock(
          sounds: atmosSounds,
          intensityFor: _intensityFor,
          onChange: (sound, value) => _setSoundIntensity(sound, value),
        ),
        const SizedBox(height: 12),
      ],
    );
  }

  Widget _buildOrb({
    required SoundConfig sound,
    required int index,
    required int count,
    required double minRadius,
    required double maxRadius,
  }) {
    final baseAngle = (index / count) * 360 - 90;
    final angle = (baseAngle + _orbitPhase) * (pi / 180);
    final value = _intensityFor(sound.id);
    final radius = maxRadius - (value * (maxRadius - minRadius));
    final position = Offset(
      cos(angle) * radius,
      sin(angle) * radius,
    );

    final isDownloading = _downloading.contains(sound.id);
    final progress = _downloadProgress[sound.id] ?? 0;

    return Align(
      alignment: Alignment.center,
      child: Transform.translate(
        offset: position.translate(-28, -28),
        child: GestureDetector(
          onPanStart: (details) => _handleOrbDrag(details.globalPosition, sound, minRadius, maxRadius),
          onPanUpdate: (details) => _handleOrbDrag(details.globalPosition, sound, minRadius, maxRadius),
          onTap: () => _setSoundIntensity(sound, value > 0 ? 0 : 0.6),
          child: OrbitalFader(
            label: sound.label,
            color: sound.color,
            value: value,
            isDownloading: isDownloading,
            downloadProgress: progress,
          ),
        ),
      ),
    );
  }

  Widget _buildMixer() {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Mixer',
                style: Theme.of(context).textTheme.headlineSmall,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              _SliderCard(
                label: 'Tonal Base Volume',
                value: _tonalVolume,
                onChanged: (value) {
                  setState(() => _tonalVolume = value);
                  context.read<AudioMixer>().setTonalVolume(value);
                },
              ),
              const SizedBox(height: 16),
              _SliderCard(
                label: 'Atmosphere',
                value: _atmosVolume,
                onChanged: (value) {
                  setState(() => _atmosVolume = value);
                  context.read<AudioMixer>().setAtmosVolume(value);
                },
              ),
              const SizedBox(height: 16),
              _SliderCard(
                label: 'Orbit Speed',
                value: _orbitSpeed,
                onChanged: (value) {
                  setState(() => _orbitSpeed = value);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPlaceholder(String label) {
    return Center(
      child: Text(
        label,
        style: Theme.of(context).textTheme.bodyMedium,
      ),
    );
  }

  Widget _buildCorners() {
    return Stack(
      children: [
        CornerButton(
          label: 'Harp',
          icon: Icons.music_note,
          isActive: _currentTab == TabView.harp,
          onTap: () => setState(() => _currentTab = TabView.harp),
          alignment: Alignment.topLeft,
        ),
        CornerButton(
          label: 'Visuals',
          icon: Icons.visibility,
          isActive: _currentTab == TabView.visuals,
          onTap: () => setState(() => _currentTab = TabView.visuals),
          alignment: Alignment.topRight,
        ),
        CornerButton(
          label: 'Forest',
          icon: Icons.forest,
          isActive: _currentTab == TabView.backing,
          onTap: () => setState(() => _currentTab = TabView.backing),
          alignment: Alignment.bottomLeft,
        ),
        CornerButton(
          label: 'Mixer',
          icon: Icons.tune,
          isActive: _currentTab == TabView.mixer,
          onTap: () => setState(() => _currentTab = TabView.mixer),
          alignment: Alignment.bottomRight,
        ),
      ],
    );
  }
}

class CornerButton extends StatelessWidget {
  const CornerButton({
    super.key,
    required this.label,
    required this.icon,
    required this.isActive,
    required this.onTap,
    required this.alignment,
  });

  final String label;
  final IconData icon;
  final bool isActive;
  final VoidCallback onTap;
  final Alignment alignment;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: alignment,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: GestureDetector(
          onTap: onTap,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isActive ? AppTheme.gold : Colors.white,
              boxShadow: [
                BoxShadow(
                  color: AppTheme.gold.withOpacity(isActive ? 0.4 : 0.2),
                  blurRadius: 12,
                ),
              ],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, size: 20, color: isActive ? Colors.white : AppTheme.softInk),
                const SizedBox(height: 4),
                Text(
                  label,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontSize: 9,
                        color: isActive ? Colors.white : AppTheme.softInk,
                      ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class OrbitalFader extends StatelessWidget {
  const OrbitalFader({
    super.key,
    required this.label,
    required this.color,
    required this.value,
    required this.isDownloading,
    required this.downloadProgress,
  });

  final String label;
  final Color color;
  final double value;
  final bool isDownloading;
  final double downloadProgress;

  @override
  Widget build(BuildContext context) {
    final active = value > 0.01;
    final ringValue = isDownloading ? downloadProgress : (active ? 1.0 : 0.0);

    return SizedBox(
      width: 56,
      height: 56,
      child: Stack(
        alignment: Alignment.center,
        children: [
          SizedBox(
            width: 56,
            height: 56,
            child: CircularProgressIndicator(
              value: ringValue,
              strokeWidth: 3,
              valueColor: AlwaysStoppedAnimation<Color>(color),
              backgroundColor: color.withOpacity(0.15),
            ),
          ),
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: active ? AppTheme.ivory : Colors.white,
              border: Border.all(color: color.withOpacity(active ? 0.9 : 0.3), width: 2),
              boxShadow: [
                BoxShadow(
                  color: color.withOpacity(active ? 0.35 : 0.15),
                  blurRadius: 12,
                ),
              ],
            ),
            child: Center(
              child: Text(
                label.split(' ').first.toUpperCase(),
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontSize: 10,
                      color: active ? AppTheme.softInk : AppTheme.softInk.withOpacity(0.6),
                    ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _OrbitBackground extends StatelessWidget {
  const _OrbitBackground({required this.minRadius, required this.maxRadius});

  final double minRadius;
  final double maxRadius;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: minRadius * 2,
            height: minRadius * 2,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: AppTheme.gold.withOpacity(0.25), width: 1.5),
            ),
          ),
          Container(
            width: maxRadius * 2,
            height: maxRadius * 2,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: AppTheme.gold.withOpacity(0.15), width: 1),
            ),
          ),
        ],
      ),
    );
  }
}

class _OrbitCore extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 80,
      height: 80,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white,
        border: Border.all(color: AppTheme.gold.withOpacity(0.3), width: 2),
        boxShadow: [
          BoxShadow(
            color: AppTheme.gold.withOpacity(0.25),
            blurRadius: 16,
          ),
        ],
      ),
      child: Center(
        child: Text(
          'Om',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                letterSpacing: 2,
              ),
        ),
      ),
    );
  }
}

class _PresetRow extends StatelessWidget {
  const _PresetRow({
    required this.presets,
    required this.selected,
    required this.onSelect,
  });

  final List<TonePreset> presets;
  final TonePresetId selected;
  final ValueChanged<TonePresetId> onSelect;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        children: presets.map((preset) {
          final active = preset.id == selected;
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: ChoiceChip(
              label: Text(preset.name),
              selected: active,
              onSelected: (_) => onSelect(preset.id),
              selectedColor: AppTheme.gold,
              labelStyle: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: active ? Colors.white : AppTheme.softInk,
                  ),
              backgroundColor: Colors.white,
              side: BorderSide(color: AppTheme.gold.withOpacity(0.2)),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _AtmosDock extends StatelessWidget {
  const _AtmosDock({
    required this.sounds,
    required this.intensityFor,
    required this.onChange,
  });

  final List<SoundConfig> sounds;
  final double Function(String) intensityFor;
  final void Function(SoundConfig sound, double value) onChange;

  @override
  Widget build(BuildContext context) {
    if (sounds.isEmpty) return const SizedBox(height: 80);
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.9),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppTheme.gold.withOpacity(0.15)),
        boxShadow: [
          BoxShadow(
            color: AppTheme.gold.withOpacity(0.12),
            blurRadius: 16,
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: sounds.map((sound) {
          return VerticalIconSlider(
            label: sound.label,
            color: sound.color,
            value: intensityFor(sound.id),
            onChange: (value) => onChange(sound, value),
          );
        }).toList(),
      ),
    );
  }
}

class VerticalIconSlider extends StatelessWidget {
  const VerticalIconSlider({
    super.key,
    required this.label,
    required this.color,
    required this.value,
    required this.onChange,
  });

  final String label;
  final Color color;
  final double value;
  final ValueChanged<double> onChange;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 64,
      height: 140,
      child: Column(
        children: [
          Expanded(
            child: LayoutBuilder(
              builder: (context, constraints) {
                return GestureDetector(
                  onPanStart: (details) => _update(details.localPosition, constraints.maxHeight),
                  onPanUpdate: (details) => _update(details.localPosition, constraints.maxHeight),
                  child: Stack(
                    alignment: Alignment.bottomCenter,
                    children: [
                      Container(
                        width: 6,
                        decoration: BoxDecoration(
                          color: AppTheme.ivoryDeep,
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      Positioned(
                        bottom: 0,
                        child: Container(
                          width: 6,
                          height: constraints.maxHeight * value,
                          decoration: BoxDecoration(
                            color: color.withOpacity(0.8),
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                      Positioned(
                        bottom: max(
                          0,
                          (constraints.maxHeight * value).clamp(0.0, constraints.maxHeight) - 12,
                        ),
                        child: Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.white,
                            border: Border.all(color: color, width: 2),
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontSize: 9),
          ),
        ],
      ),
    );
  }

  void _update(Offset localPosition, double height) {
    final dy = (height - localPosition.dy).clamp(0.0, height);
    final next = dy / height;
    onChange(next);
  }
}

class _SliderCard extends StatelessWidget {
  const _SliderCard({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  final String label;
  final double value;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.gold.withOpacity(0.2)),
        boxShadow: [
          BoxShadow(
            color: AppTheme.gold.withOpacity(0.08),
            blurRadius: 12,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: Theme.of(context).textTheme.titleMedium),
              Text('${(value * 100).round()}%', style: Theme.of(context).textTheme.bodyMedium),
            ],
          ),
          Slider(
            value: value,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }
}
