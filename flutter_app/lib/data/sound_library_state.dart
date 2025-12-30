import 'package:flutter/foundation.dart';

import '../models/sound_config.dart';
import 'sound_catalog.dart';
import 'sound_library_repository.dart';

class SoundLibraryState extends ChangeNotifier {
  SoundLibraryState({SoundLibraryRepository? repository})
      : _repository = repository ?? SoundLibraryRepository();

  final SoundLibraryRepository _repository;

  List<SoundConfig> _sounds = starterSounds;
  bool _loading = false;
  String? _error;

  List<SoundConfig> get sounds => _sounds;
  bool get loading => _loading;
  String? get error => _error;

  Future<void> load() async {
    if (_loading) return;
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _repository.fetchSounds();
      _sounds = result.isEmpty ? starterSounds : result;
    } catch (err) {
      _error = err.toString();
      _sounds = starterSounds;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }
}
