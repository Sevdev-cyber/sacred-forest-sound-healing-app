import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as path;
import 'package:path_provider/path_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/sound_config.dart';
import '../models/tone_preset.dart';

enum AssetBucket { preview, vault }

class AssetDownloadResult {
  AssetDownloadResult({
    required this.file,
    required this.fromCache,
  });

  final File file;
  final bool fromCache;
}

class AssetManager {
  AssetManager({SupabaseClient? client, Dio? dio})
      : _client = client ?? Supabase.instance.client,
        _dio = dio ?? Dio();

  static const previewBucket = 'preview-gallery';
  static const vaultBucket = 'crystal-vault';

  final SupabaseClient _client;
  final Dio _dio;
  final Map<String, Future<File>> _inflight = {};
  final Map<String, ValueNotifier<double>> _progress = {};

  ValueListenable<double>? progressFor(String key) => _progress[key];

  String? progressKeyForPreview(SoundConfig sound, TonePresetId preset) {
    final previewPath = _previewPathFor(sound, preset);
    if (previewPath == null) return null;
    return '${AssetBucket.preview.name}|$previewPath';
  }

  String? progressKeyForVault(SoundConfig sound, TonePresetId preset) {
    final vaultPath = _vaultPathFor(sound, preset);
    if (vaultPath == null) return null;
    return '${AssetBucket.vault.name}|$vaultPath';
  }

  Future<File?> cachedPreviewFile({
    required SoundConfig sound,
    required TonePresetId preset,
  }) async {
    final previewPath = _previewPathFor(sound, preset);
    if (previewPath == null) return null;
    return _cachedFile(AssetBucket.preview, previewPath);
  }

  Future<File?> cachedVaultFile({
    required SoundConfig sound,
    required TonePresetId preset,
  }) async {
    final vaultPath = _vaultPathFor(sound, preset);
    if (vaultPath == null) return null;
    return _cachedFile(AssetBucket.vault, vaultPath);
  }

  Future<AssetDownloadResult?> getOrDownloadPreview({
    required SoundConfig sound,
    required TonePresetId preset,
    ValueChanged<double>? onProgress,
  }) {
    final previewPath = _previewPathFor(sound, preset);
    if (previewPath == null) return Future.value(null);
    return _getOrDownload(
      bucket: AssetBucket.preview,
      remotePath: previewPath,
      isPrivate: false,
      onProgress: onProgress,
    );
  }

  Future<AssetDownloadResult?> getOrDownloadVault({
    required SoundConfig sound,
    required TonePresetId preset,
    ValueChanged<double>? onProgress,
  }) {
    final vaultPath = _vaultPathFor(sound, preset);
    if (vaultPath == null) return Future.value(null);
    return _getOrDownload(
      bucket: AssetBucket.vault,
      remotePath: vaultPath,
      isPrivate: true,
      onProgress: onProgress,
    );
  }

  Future<AssetDownloadResult> _getOrDownload({
    required AssetBucket bucket,
    required String remotePath,
    required bool isPrivate,
    ValueChanged<double>? onProgress,
  }) async {
    if (kIsWeb) {
      throw UnsupportedError('AssetManager caching is mobile-only.');
    }

    final localPath = await _localPath(bucket, remotePath);
    final localFile = File(localPath);
    if (await localFile.exists()) {
      return AssetDownloadResult(file: localFile, fromCache: true);
    }

    final cacheKey = '${bucket.name}|$remotePath';
    final future = _inflight.putIfAbsent(cacheKey, () async {
      final downloadUrl = await _resolveDownloadUrl(
        bucket: bucket,
        remotePath: remotePath,
        isPrivate: isPrivate,
      );

      await Directory(path.dirname(localPath)).create(recursive: true);

      final progress = _progress.putIfAbsent(cacheKey, () => ValueNotifier<double>(0));
      await _dio.download(
        downloadUrl.toString(),
        localPath,
        onReceiveProgress: (received, total) {
          if (total <= 0) return;
          final value = received / total;
          progress.value = value;
          onProgress?.call(value);
        },
      );
      progress.value = 1;
      onProgress?.call(1);
      return File(localPath);
    });

    try {
      final file = await future;
      return AssetDownloadResult(file: file, fromCache: false);
    } finally {
      _inflight.remove(cacheKey);
    }
  }

  Future<Uri> _resolveDownloadUrl({
    required AssetBucket bucket,
    required String remotePath,
    required bool isPrivate,
  }) async {
    final bucketName = _bucketName(bucket);
    if (!isPrivate) {
      final url = _client.storage.from(bucketName).getPublicUrl(remotePath);
      return Uri.parse(url);
    }

    final signedUrl =
        await _client.storage.from(bucketName).createSignedUrl(remotePath, 3600);
    return Uri.parse(signedUrl);
  }

  Future<String> _localPath(AssetBucket bucket, String remotePath) async {
    final root = await getApplicationSupportDirectory();
    final bucketFolder = bucket == AssetBucket.preview ? 'preview_gallery' : 'crystal_vault';
    final segments = <String>[root.path, bucketFolder, ...remotePath.split('/')];
    return path.joinAll(segments);
  }

  Future<File?> _cachedFile(AssetBucket bucket, String remotePath) async {
    final localPath = await _localPath(bucket, remotePath);
    final file = File(localPath);
    if (await file.exists()) return file;
    return null;
  }

  String? _previewPathFor(SoundConfig sound, TonePresetId preset) {
    return sound.previewKeysByPreset?[preset] ?? sound.previewKey;
  }

  String? _vaultPathFor(SoundConfig sound, TonePresetId preset) {
    final base = sound.vaultKeysByPreset?[preset] ?? sound.vaultKey;
    if (base == null) return null;
    final extension = _platformExtension();
    if (base.contains('.')) return base;
    return '$base.$extension';
  }

  String _bucketName(AssetBucket bucket) {
    return bucket == AssetBucket.preview ? previewBucket : vaultBucket;
  }

  String _platformExtension() {
    if (Platform.isIOS || Platform.isMacOS) return 'm4a';
    return 'ogg';
  }
}
