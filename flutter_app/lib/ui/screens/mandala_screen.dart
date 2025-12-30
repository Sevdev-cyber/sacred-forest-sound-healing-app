import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../audio/asset_manager.dart';
import '../../audio/audio_mixer.dart';
import '../../data/sound_catalog.dart';
import '../../models/sound_config.dart';
import '../../models/tone_preset.dart';
import '../../theme/app_theme.dart';

class MandalaScreen extends StatefulWidget {
  const MandalaScreen({super.key});

  @override
  State<MandalaScreen> createState() => _MandalaScreenState();
}

class _MandalaScreenState extends State<MandalaScreen> {
  final SoundConfig _sound = tonalSounds.first;
  final TonePresetId _preset = TonePresetId.pure;
  final ValueNotifier<double> _progress = ValueNotifier<double>(0);

  bool _isActive = false;
  bool _isDownloading = false;
  String _sourceLabel = 'Vault';
  String? _status;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.read<AudioMixer>().setPreset(_preset);
    });
  }

  @override
  void dispose() {
    _progress.dispose();
    super.dispose();
  }

  Future<void> _toggleSound() async {
    if (_isDownloading) return;
    final mixer = context.read<AudioMixer>();
    if (_isActive) {
      mixer.setIntensity(_sound.id, 0);
      setState(() {
        _isActive = false;
        _status = 'Silence';
      });
      return;
    }

    setState(() {
      _status = null;
    });

    final assets = context.read<AssetManager>();
    final session = Supabase.instance.client.auth.currentSession;
    final hasSession = session != null;

    final cachedFile = hasSession
        ? await assets.cachedVaultFile(sound: _sound, preset: _preset)
        : await assets.cachedPreviewFile(sound: _sound, preset: _preset);

    if (cachedFile != null) {
      await mixer.setCachedFile(_sound.id, cachedFile.path, preset: _preset);
      mixer.setIntensity(_sound.id, 1);
      if (!mounted) return;
      setState(() {
        _isActive = true;
        _sourceLabel = hasSession ? 'Vault' : 'Preview';
        _status = 'Playing';
      });
      return;
    }

    setState(() {
      _isDownloading = true;
      _sourceLabel = hasSession ? 'Vault' : 'Preview';
      _status = 'Downloading';
    });

    AssetDownloadResult? result;
    if (hasSession) {
      result = await _downloadVault(assets);
      if (result == null) {
        if (!mounted) return;
        setState(() {
          _sourceLabel = 'Preview';
          _status = 'Vault locked, using preview';
        });
      }
    }

    result ??= await _downloadPreview(assets);

    if (result != null) {
      await mixer.setCachedFile(_sound.id, result.file.path, preset: _preset);
      mixer.setIntensity(_sound.id, 1);
      if (!mounted) return;
      setState(() {
        _isActive = true;
        _status = 'Playing';
      });
    } else if (mounted) {
      setState(() {
        _status = 'Download failed';
      });
    }

    if (!mounted) return;
    setState(() {
      _isDownloading = false;
    });
  }

  Future<AssetDownloadResult?> _downloadVault(AssetManager assets) async {
    _progress.value = 0;
    try {
      return await assets.getOrDownloadVault(
        sound: _sound,
        preset: _preset,
        onProgress: (value) {
          _progress.value = value;
        },
      );
    } catch (_) {
      return null;
    }
  }

  Future<AssetDownloadResult?> _downloadPreview(AssetManager assets) async {
    _progress.value = 0;
    try {
      return await assets.getOrDownloadPreview(
        sound: _sound,
        preset: _preset,
        onProgress: (value) {
          _progress.value = value;
        },
      );
    } catch (_) {
      return null;
    }
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
          child: Column(
            children: [
              const SizedBox(height: 12),
              Text(
                'Sonic Mandala',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 6),
              Text(
                'Tap the orb to summon ${_sound.label}.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const Spacer(),
              GestureDetector(
                onTap: _toggleSound,
                child: MandalaOrb(
                  label: _sound.label,
                  isActive: _isActive,
                  isDownloading: _isDownloading,
                  status: _status,
                  sourceLabel: _sourceLabel,
                  progress: _progress,
                ),
              ),
              const Spacer(),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Preset: ${tonePresets.first.name}',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    Text(
                      _isDownloading ? 'Downloading' : _isActive ? 'Live' : 'Idle',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class MandalaOrb extends StatelessWidget {
  const MandalaOrb({
    super.key,
    required this.label,
    required this.isActive,
    required this.isDownloading,
    required this.status,
    required this.sourceLabel,
    required this.progress,
  });

  final String label;
  final bool isActive;
  final bool isDownloading;
  final String? status;
  final String sourceLabel;
  final ValueListenable<double> progress;

  @override
  Widget build(BuildContext context) {
    const double size = 240;
    const double innerSize = 180;
    const double ringWidth = 6;

    return ValueListenableBuilder<double>(
      valueListenable: progress,
      builder: (context, value, _) {
        final clamped = value.clamp(0.0, 1.0);
        final ringValue = isDownloading ? clamped : (isActive ? 1 : 0);

        return Stack(
          alignment: Alignment.center,
          children: [
            Container(
              width: size,
              height: size,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: AppTheme.gold.withOpacity(0.25),
                  width: ringWidth,
                ),
              ),
            ),
            SizedBox(
              width: size,
              height: size,
              child: CircularProgressIndicator(
                value: ringValue,
                strokeWidth: ringWidth,
                backgroundColor: Colors.transparent,
                valueColor: AlwaysStoppedAnimation<Color>(
                  isActive || isDownloading ? AppTheme.gold : AppTheme.goldDark,
                ),
              ),
            ),
            Container(
              width: innerSize,
              height: innerSize,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppTheme.ivory,
                    AppTheme.ivoryDeep,
                    AppTheme.gold.withOpacity(0.15),
                  ],
                ),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.gold.withOpacity(isActive ? 0.35 : 0.2),
                    blurRadius: 24,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    label,
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    sourceLabel,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 10),
                  Text(
                    status ?? (isActive ? 'Playing' : 'Tap to awaken'),
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}
